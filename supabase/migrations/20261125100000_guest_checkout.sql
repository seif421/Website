-- Customers can now order without an account. Signed-in customers still get the order saved to their account
-- (orders.user_id); guests have user_id = NULL and are identified by the order number and phone.
-- Guards against abuse: at most 3 waiting orders per phone number and per email address in an hour.

DO $$
DECLARE def text;
BEGIN
  def := pg_get_functiondef('public.create_cod_order(jsonb,jsonb)'::regprocedure);
  def := replace(def,
    E'  IF auth.uid() IS NULL THEN RAISE EXCEPTION ''Please sign in or create an account to place an order.''; END IF;\n', '');
  def := replace(def,
    E'  q := private.price_cart_eg(p_items, v_gov);',
    E'  IF (SELECT count(*) FROM public.orders WHERE lower(email) = v_email AND status = ''pending'' AND created_at > now() - interval ''1 hour'') >= 3 THEN\n    RAISE EXCEPTION ''You already have orders waiting for confirmation. We will call you shortly.'';\n  END IF;\n\n  q := private.price_cart_eg(p_items, v_gov);');
  IF def LIKE '%auth.uid() IS NULL%' OR def NOT LIKE '%lower(email) = v_email%' THEN
    RAISE EXCEPTION 'create_cod_order did not have the expected text';
  END IF;
  EXECUTE def;
END $$;

GRANT EXECUTE ON FUNCTION public.create_cod_order(jsonb, jsonb) TO anon, authenticated;
