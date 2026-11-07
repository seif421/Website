-- Egypt launch: cash-on-delivery checkout, delivery fees per governorate (EGP).
-- Prices are still calculated here in the database, never trusted from the browser.

CREATE TABLE IF NOT EXISTS private.delivery_zones (
  governorate text PRIMARY KEY,
  fee numeric NOT NULL CHECK (fee >= 0),
  sort int NOT NULL DEFAULT 0
);
REVOKE ALL ON private.delivery_zones FROM PUBLIC, anon, authenticated;

-- PLACEHOLDER fees in EGP. Replace them with your courier's real rates in Admin > Delivery fees.
INSERT INTO private.delivery_zones (governorate, fee, sort) VALUES
  ('Cairo', 50, 1), ('Giza', 50, 2), ('Alexandria', 65, 3), ('Qalyubia', 60, 4),
  ('Sharqia', 65, 5), ('Dakahlia', 65, 6), ('Gharbia', 65, 7), ('Menoufia', 65, 8),
  ('Beheira', 65, 9), ('Kafr El Sheikh', 70, 10), ('Damietta', 70, 11), ('Port Said', 70, 12),
  ('Ismailia', 70, 13), ('Suez', 70, 14), ('Fayoum', 70, 15), ('Beni Suef', 75, 16),
  ('Minya', 80, 17), ('Assiut', 85, 18), ('Sohag', 90, 19), ('Qena', 90, 20),
  ('Luxor', 95, 21), ('Aswan', 100, 22), ('Red Sea', 110, 23), ('Matrouh', 110, 24),
  ('North Sinai', 120, 25), ('South Sinai', 120, 26), ('New Valley', 120, 27)
ON CONFLICT (governorate) DO NOTHING;

-- Largest order value accepted for cash on delivery (EGP). Empty = no limit.
INSERT INTO private.store_config (key, value) VALUES ('cod_max_total', '10000')
ON CONFLICT (key) DO NOTHING;
-- Free delivery from this subtotal (EGP). Empty = never free. The old USD default is reset.
UPDATE private.store_config SET value = '' WHERE key = 'free_shipping_over';

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phone text;

CREATE OR REPLACE FUNCTION public.delivery_zones() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private AS
$$ SELECT coalesce(jsonb_agg(jsonb_build_object('governorate', governorate, 'fee', fee) ORDER BY sort), '[]'::jsonb)
   FROM private.delivery_zones $$;

CREATE OR REPLACE FUNCTION private.price_cart_eg(p_items jsonb, p_gov text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE q jsonb; v_fee numeric; v_free text; v_sub numeric;
BEGIN
  q := private.price_cart(p_items);
  v_sub := (q->>'subtotal')::numeric;
  SELECT fee INTO v_fee FROM private.delivery_zones WHERE governorate = p_gov;
  IF p_gov IS NOT NULL AND v_fee IS NULL THEN RAISE EXCEPTION 'Please choose your governorate.'; END IF;
  v_free := private.cfg('free_shipping_over');
  IF v_fee IS NOT NULL AND v_free IS NOT NULL AND v_free <> '' AND v_sub >= v_free::numeric THEN v_fee := 0; END IF;
  RETURN q || jsonb_build_object(
    'shipping', coalesce(v_fee, 0),
    'shipping_known', v_fee IS NOT NULL,
    'tax', 0,
    'total', v_sub + coalesce(v_fee, 0));
END $$;

CREATE OR REPLACE FUNCTION public.quote_order_eg(p_items jsonb, p_governorate text DEFAULT NULL) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS
$$ SELECT private.price_cart_eg(p_items, nullif(btrim(p_governorate), '')) $$;

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
  IF v_email <> '' AND v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'That email address does not look right.'; END IF;

  -- Basic protection against repeated fake orders from one phone number.
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

-- Admin-only settings: delivery fee per governorate, free-delivery threshold, COD limit.
CREATE OR REPLACE FUNCTION public.admin_set_delivery_fee(p_governorate text, p_fee numeric) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  IF p_fee IS NULL OR p_fee < 0 OR p_fee > 5000 THEN RAISE EXCEPTION 'Enter a fee between 0 and 5000.'; END IF;
  UPDATE private.delivery_zones SET fee = p_fee WHERE governorate = p_governorate;
END $$;

CREATE OR REPLACE FUNCTION public.admin_get_store_settings() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  RETURN jsonb_build_object('free_shipping_over', coalesce(private.cfg('free_shipping_over'), ''),
                            'cod_max_total', coalesce(private.cfg('cod_max_total'), ''));
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_store_setting(p_key text, p_value text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  IF p_key NOT IN ('free_shipping_over', 'cod_max_total') THEN RAISE EXCEPTION 'Unknown setting.'; END IF;
  IF coalesce(p_value, '') !~ '^([0-9]{1,7}(\.[0-9]{1,2})?)?$' THEN RAISE EXCEPTION 'Enter a number, or leave empty.'; END IF;
  UPDATE private.store_config SET value = coalesce(p_value, '') WHERE key = p_key;
END $$;

REVOKE ALL ON FUNCTION public.delivery_zones(), public.quote_order_eg(jsonb, text), public.create_cod_order(jsonb, jsonb),
  public.admin_set_delivery_fee(text, numeric), public.admin_get_store_settings(), public.admin_set_store_setting(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delivery_zones(), public.quote_order_eg(jsonb, text), public.create_cod_order(jsonb, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_delivery_fee(text, numeric), public.admin_get_store_settings(),
  public.admin_set_store_setting(text, text) TO authenticated;
