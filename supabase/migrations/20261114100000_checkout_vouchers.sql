-- Optional voucher (coupon) at checkout.
-- The discount comes off the PRODUCT subtotal only. Delivery fees are never discounted.
-- Supports the admin coupon types "percent" and "fixed". Other types are refused at checkout.

-- Validates a voucher and works out its discount. Raises a friendly message when it cannot be used.
CREATE OR REPLACE FUNCTION private.coupon_discount(p_code text, p_subtotal numeric) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE c public.coupons%ROWTYPE; d numeric;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(btrim(p_code));
  IF NOT FOUND OR NOT c.is_active THEN RAISE EXCEPTION 'This voucher code is not valid.'; END IF;
  IF c.starts_at IS NOT NULL AND c.starts_at > now() THEN RAISE EXCEPTION 'This voucher is not active yet.'; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RAISE EXCEPTION 'This voucher has expired.'; END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN RAISE EXCEPTION 'This voucher has already been used up.'; END IF;
  IF c.min_order_amount IS NOT NULL AND p_subtotal < c.min_order_amount THEN
    RAISE EXCEPTION 'This voucher needs an order of at least % EGP.', c.min_order_amount;
  END IF;
  IF c.discount_type = 'percent' THEN
    d := round(p_subtotal * least(greatest(c.discount_value, 0), 100) / 100, 2);
  ELSIF c.discount_type = 'fixed' THEN
    d := least(greatest(c.discount_value, 0), p_subtotal);
  ELSE
    RAISE EXCEPTION 'This voucher cannot be used at checkout.';
  END IF;
  RETURN jsonb_build_object('id', c.id, 'code', c.code, 'discount', d);
END $$;

-- Same as quote_order_eg, plus an optional voucher code.
CREATE OR REPLACE FUNCTION public.quote_order_coupon_eg(p_items jsonb, p_governorate text DEFAULT NULL, p_coupon text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE q jsonb; cd jsonb;
BEGIN
  q := private.price_cart_eg(p_items, nullif(btrim(p_governorate), ''));
  IF coalesce(btrim(p_coupon), '') = '' THEN
    RETURN q || jsonb_build_object('discount', 0, 'coupon_code', NULL);
  END IF;
  cd := private.coupon_discount(p_coupon, (q->>'subtotal')::numeric);
  RETURN q || jsonb_build_object(
    'discount', (cd->>'discount')::numeric,
    'coupon_code', cd->>'code',
    'total', (q->>'total')::numeric - (cd->>'discount')::numeric);
END $$;

-- Order placement: same as before, with an optional voucher in p_customer->>'coupon'.
CREATE OR REPLACE FUNCTION public.create_cod_order(p_items jsonb, p_customer jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  q jsonb; v_id uuid; v_number text; l jsonb; v_phone text; v_gov text; v_max text; v_email text;
  v_addr jsonb; v_coupon text; v_disc numeric := 0; v_code text; cd jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in or create an account to place an order.'; END IF;
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

  -- Optional voucher: comes off the products only, never the delivery fee.
  v_coupon := nullif(btrim(coalesce(p_customer->>'coupon', '')), '');
  IF v_coupon IS NOT NULL THEN
    cd := private.coupon_discount(v_coupon, (q->>'subtotal')::numeric);
    UPDATE public.coupons SET used_count = used_count + 1
      WHERE id = (cd->>'id')::uuid AND (max_uses IS NULL OR used_count < max_uses);
    IF NOT FOUND THEN RAISE EXCEPTION 'This voucher has already been used up.'; END IF;
    v_disc := (cd->>'discount')::numeric;
    v_code := cd->>'code';
    q := q || jsonb_build_object('total', (q->>'total')::numeric - v_disc);
  END IF;

  v_max := private.cfg('cod_max_total');
  IF v_max IS NOT NULL AND v_max <> '' AND (q->>'total')::numeric > v_max::numeric THEN
    RAISE EXCEPTION 'Cash on delivery is available for orders up to % EGP. Please reduce your cart or contact us.', v_max;
  END IF;

  v_addr := jsonb_build_object(
    'full_name', btrim(p_customer->>'full_name'), 'phone', v_phone, 'governorate', v_gov,
    'city', btrim(p_customer->>'city'), 'line1', btrim(p_customer->>'line1'),
    'line2', nullif(btrim(coalesce(p_customer->>'line2', '')), ''), 'country', 'EG');

  INSERT INTO public.orders (user_id, email, phone, status, payment_status, subtotal, discount, coupon_code, tax, shipping, total,
                             shipping_address, billing_address, payment_method, shipping_method, notes, tags)
  VALUES (auth.uid(), v_email, v_phone, 'pending', 'pending',
          (q->>'subtotal')::numeric, v_disc, v_code, 0, (q->>'shipping')::numeric, (q->>'total')::numeric,
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

REVOKE ALL ON FUNCTION private.coupon_discount(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quote_order_coupon_eg(jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_order_coupon_eg(jsonb, text, text) TO anon, authenticated;
