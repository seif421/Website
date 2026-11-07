-- Order confirmation emails: email is now required, and a guarded function lets the server
-- fetch the order once to send the confirmation.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.create_cod_order(p_items jsonb, p_customer jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  q jsonb; v_id uuid; v_number text; l jsonb; v_phone text; v_gov text; v_max text; v_email text;
  v_addr jsonb;
BEGIN
  v_phone := regexp_replace(coalesce(p_customer->>'phone', ''), '[\s\-]', '', 'g');
  v_phone := regexp_replace(v_phone, '^(\+?20)', '0');
  IF v_phone !~ '^01[0125][0-9]{8}$' THEN
    RAISE EXCEPTION 'Please enter a valid Egyptian mobile number, for example 01012345678.';
  END IF;
  IF char_length(btrim(coalesce(p_customer->>'full_name', ''))) < 3 THEN RAISE EXCEPTION 'Please enter your full name.'; END IF;
  IF char_length(btrim(coalesce(p_customer->>'city', ''))) < 2 THEN RAISE EXCEPTION 'Please enter your city or area.'; END IF;
  IF char_length(btrim(coalesce(p_customer->>'line1', ''))) < 6 THEN RAISE EXCEPTION 'Please enter your street, building and apartment.'; END IF;
  IF char_length(p_customer::text) > 1500 THEN RAISE EXCEPTION 'Details are too long.'; END IF;
  v_gov := btrim(coalesce(p_customer->>'governorate', ''));
  IF v_gov = '' THEN RAISE EXCEPTION 'Please choose your governorate.'; END IF;
  v_email := lower(btrim(coalesce(p_customer->>'email', '')));
  IF v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Please enter a valid email address. We send your order confirmation there.'; END IF;

  IF (SELECT count(*) FROM public.orders WHERE phone = v_phone AND status = 'pending' AND created_at > now() - interval '1 hour') >= 3 THEN
    RAISE EXCEPTION 'You already have orders waiting for confirmation. We will call you shortly.';
  END IF;

  q := private.price_cart_eg(p_items, v_gov);
  v_max := private.cfg('cod_max_total');
  IF v_max IS NOT NULL AND v_max <> '' AND (q->>'total')::numeric > v_max::numeric THEN
    RAISE EXCEPTION 'Cash on delivery is available for orders up to % EGP. Please reduce your cart or contact us.', v_max;
  END IF;

  v_addr := jsonb_build_object(
    'full_name', btrim(p_customer->>'full_name'), 'phone', v_phone, 'governorate', v_gov,
    'city', btrim(p_customer->>'city'), 'line1', btrim(p_customer->>'line1'),
    'line2', nullif(btrim(coalesce(p_customer->>'line2', '')), ''), 'country', 'EG');

  INSERT INTO public.orders (user_id, email, phone, status, payment_status, subtotal, tax, shipping, total,
                             shipping_address, billing_address, payment_method, shipping_method, notes, tags)
  VALUES (auth.uid(), v_email, v_phone, 'pending', 'pending',
          (q->>'subtotal')::numeric, 0, (q->>'shipping')::numeric, (q->>'total')::numeric,
          v_addr, v_addr, 'cod', 'standard', nullif(btrim(coalesce(p_customer->>'notes', '')), ''),
          ARRAY['cod', 'needs-confirmation'])
  RETURNING id, order_number INTO v_id, v_number;

  FOR l IN SELECT * FROM jsonb_array_elements(q->'lines') LOOP
    INSERT INTO public.order_items (order_id, product_id, product_name, product_sku, unit_price, quantity, subtotal)
    VALUES (v_id, (l->>'product_id')::uuid, l->>'name', l->>'sku', (l->>'unit_price')::numeric, (l->>'quantity')::int,
            (l->>'unit_price')::numeric * (l->>'quantity')::int);
  END LOOP;
  RETURN jsonb_build_object('order_number', v_number, 'total', (q->>'total')::numeric);
END $$;

-- Returns the order details for the confirmation email, once, for a new order. Guarded by the shared secret.
CREATE OR REPLACE FUNCTION public.claim_order_confirmation(p_order_number text, p_secret text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE o record; items jsonb;
BEGIN
  IF p_secret IS DISTINCT FROM private.cfg('order_secret') THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  SELECT * INTO o FROM public.orders
   WHERE order_number = p_order_number AND confirmation_sent_at IS NULL AND email <> ''
     AND created_at > now() - interval '1 hour'
   FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.orders SET confirmation_sent_at = now() WHERE id = o.id;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'name', i.product_name, 'quantity', i.quantity, 'unit_price', i.unit_price, 'subtotal', i.subtotal,
           'image', CASE WHEN coalesce(p.images->>0, '') ~* '^https://' THEN p.images->>0 ELSE NULL END
         ) ORDER BY i.created_at), '[]'::jsonb)
    INTO items
    FROM public.order_items i LEFT JOIN public.products p ON p.id = i.product_id
   WHERE i.order_id = o.id;
  RETURN jsonb_build_object(
    'order_number', o.order_number, 'email', o.email, 'cod', o.payment_method = 'cod',
    'subtotal', o.subtotal, 'shipping', o.shipping, 'total', o.total,
    'address', o.shipping_address, 'items', items);
END $$;

-- Lets the server try again if sending failed.
CREATE OR REPLACE FUNCTION public.release_order_confirmation(p_order_number text, p_secret text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF p_secret IS DISTINCT FROM private.cfg('order_secret') THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  UPDATE public.orders SET confirmation_sent_at = NULL WHERE order_number = p_order_number;
END $$;

REVOKE ALL ON FUNCTION public.claim_order_confirmation(text, text), public.release_order_confirmation(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_order_confirmation(text, text), public.release_order_confirmation(text, text) TO anon, authenticated;
