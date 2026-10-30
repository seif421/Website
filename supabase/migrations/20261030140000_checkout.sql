-- Checkout: server-side pricing, order creation and PayPal payment confirmation.
-- All prices are calculated here in the database, never trusted from the browser.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.store_config (
  key text PRIMARY KEY,
  value text NOT NULL
);
REVOKE ALL ON private.store_config FROM PUBLIC, anon, authenticated;

-- Defaults you can change later with a one-line UPDATE (see docs/CHECKOUT.md).
INSERT INTO private.store_config (key, value) VALUES
  ('shipping_flat', '5.99'),
  ('free_shipping_over', ''),      -- e.g. '99' to give free shipping from $99. Empty = never free.
  ('tax_rate', '0'),               -- e.g. '0.07' = 7%. 0 = no tax added.
  ('order_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paypal_order_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE OR REPLACE FUNCTION private.cfg(p_key text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private AS
$$ SELECT value FROM private.store_config WHERE key = p_key $$;

CREATE OR REPLACE FUNCTION private.price_cart(p_items jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  it jsonb; v_pid uuid; v_qty int; pr record; inv record;
  v_lines jsonb := '[]'::jsonb; v_sub numeric := 0; v_unit numeric;
  v_ship numeric; v_free text; v_rate numeric; v_tax numeric;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 30 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid := (it->>'product_id')::uuid;
    v_qty := (it->>'quantity')::int;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 10 THEN RAISE EXCEPTION 'Invalid quantity.'; END IF;
    SELECT id, name, sku, price, sale_price INTO pr FROM public.products
      WHERE id = v_pid AND is_active AND deleted_at IS NULL AND status = 'published';
    IF NOT FOUND THEN RAISE EXCEPTION 'An item in your cart is no longer available.'; END IF;
    SELECT stock, reserved, allow_backorder INTO inv FROM public.inventory WHERE product_id = v_pid;
    IF FOUND AND NOT coalesce(inv.allow_backorder, false) AND (inv.stock - coalesce(inv.reserved, 0)) < v_qty THEN
      RAISE EXCEPTION 'Sorry, % is out of stock or has fewer than % left.', pr.name, v_qty;
    END IF;
    v_unit := CASE WHEN pr.sale_price IS NOT NULL AND pr.sale_price > 0 AND pr.sale_price < pr.price THEN pr.sale_price ELSE pr.price END;
    v_unit := round(v_unit, 2);
    v_sub := v_sub + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object('product_id', pr.id, 'name', pr.name, 'sku', pr.sku, 'unit_price', v_unit, 'quantity', v_qty);
  END LOOP;
  v_free := private.cfg('free_shipping_over');
  v_ship := coalesce(nullif(private.cfg('shipping_flat'), '')::numeric, 0);
  IF v_free IS NOT NULL AND v_free <> '' AND v_sub >= v_free::numeric THEN v_ship := 0; END IF;
  v_rate := coalesce(nullif(private.cfg('tax_rate'), '')::numeric, 0);
  v_tax := round(v_sub * v_rate, 2);
  RETURN jsonb_build_object('lines', v_lines, 'subtotal', v_sub, 'shipping', v_ship, 'tax', v_tax, 'total', v_sub + v_ship + v_tax);
END $$;

CREATE OR REPLACE FUNCTION public.quote_order(p_items jsonb) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS
$$ SELECT private.price_cart(p_items) $$;

CREATE OR REPLACE FUNCTION public.create_order(p_items jsonb, p_email text, p_address jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  q jsonb; v_id uuid; v_number text; l jsonb;
BEGIN
  IF p_email IS NULL OR p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR char_length(p_email) > 200 THEN
    RAISE EXCEPTION 'Please enter a valid email address.';
  END IF;
  IF p_address IS NULL OR coalesce(btrim(p_address->>'full_name'), '') = '' OR coalesce(btrim(p_address->>'line1'), '') = ''
     OR coalesce(btrim(p_address->>'city'), '') = '' THEN
    RAISE EXCEPTION 'Please fill in your full name, address and city.';
  END IF;
  IF coalesce(p_address->>'state', '') !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'Please choose your state.'; END IF;
  IF coalesce(p_address->>'postal_code', '') !~ '^\d{5}(-\d{4})?$' THEN RAISE EXCEPTION 'Please enter a valid ZIP code.'; END IF;
  IF char_length(p_address::text) > 1500 THEN RAISE EXCEPTION 'Address is too long.'; END IF;

  q := private.price_cart(p_items);
  INSERT INTO public.orders (user_id, email, status, payment_status, subtotal, tax, shipping, total,
                             shipping_address, billing_address, payment_method, shipping_method)
  VALUES (auth.uid(), lower(btrim(p_email)), 'pending', 'pending',
          (q->>'subtotal')::numeric, (q->>'tax')::numeric, (q->>'shipping')::numeric, (q->>'total')::numeric,
          p_address || '{"country":"US"}'::jsonb, p_address || '{"country":"US"}'::jsonb, 'paypal', 'standard')
  RETURNING id, order_number INTO v_id, v_number;

  FOR l IN SELECT * FROM jsonb_array_elements(q->'lines') LOOP
    INSERT INTO public.order_items (order_id, product_id, product_name, product_sku, unit_price, quantity, subtotal)
    VALUES (v_id, (l->>'product_id')::uuid, l->>'name', l->>'sku', (l->>'unit_price')::numeric, (l->>'quantity')::int,
            (l->>'unit_price')::numeric * (l->>'quantity')::int);
  END LOOP;
  RETURN jsonb_build_object('order_id', v_id, 'order_number', v_number, 'quote', q);
END $$;

CREATE OR REPLACE FUNCTION public.set_order_paypal(p_order_id uuid, p_paypal_order_id text, p_secret text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF p_secret IS DISTINCT FROM private.cfg('order_secret') THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  UPDATE public.orders SET paypal_order_id = p_paypal_order_id WHERE id = p_order_id AND payment_status = 'pending';
END $$;

CREATE OR REPLACE FUNCTION public.mark_order_paid(p_paypal_order_id text, p_amount numeric, p_currency text, p_secret text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE o record; i record;
BEGIN
  IF p_secret IS DISTINCT FROM private.cfg('order_secret') THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  SELECT * INTO o FROM public.orders WHERE paypal_order_id = p_paypal_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found.'; END IF;
  IF o.payment_status = 'paid' THEN
    RETURN jsonb_build_object('order_number', o.order_number, 'total', o.total, 'email', o.email);
  END IF;
  IF p_currency <> 'USD' OR p_amount <> o.total THEN RAISE EXCEPTION 'Payment amount does not match the order.'; END IF;
  UPDATE public.orders SET payment_status = 'paid', status = 'processing', paid_at = now() WHERE id = o.id;
  FOR i IN SELECT product_id, quantity FROM public.order_items WHERE order_id = o.id AND product_id IS NOT NULL LOOP
    UPDATE public.inventory SET stock = greatest(stock - i.quantity, 0) WHERE product_id = i.product_id;
  END LOOP;
  RETURN jsonb_build_object('order_number', o.order_number, 'total', o.total, 'email', o.email);
END $$;

REVOKE ALL ON FUNCTION public.quote_order(jsonb), public.create_order(jsonb, text, jsonb),
  public.set_order_paypal(uuid, text, text), public.mark_order_paid(text, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_order(jsonb), public.create_order(jsonb, text, jsonb),
  public.set_order_paypal(uuid, text, text), public.mark_order_paid(text, numeric, text, text) TO anon, authenticated;

-- Guests can check out without an account.
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
