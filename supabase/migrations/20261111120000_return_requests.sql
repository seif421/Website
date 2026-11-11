-- Customer return requests: the customer picks a delivered order, the items and a reason, and gives a pick-up address.
-- Staff approve or reject them in Admin > Returns. Approving emails the customer.

ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS reason_code text,
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS address jsonb,
  ADD COLUMN IF NOT EXISTS approval_email_sent_at timestamptz;

-- Requests are created only through the function below, which checks that the order is the customer's own.
DROP POLICY IF EXISTS "user own returns insert" ON public.returns;

CREATE OR REPLACE FUNCTION public.create_return_request(
  p_order_id uuid, p_items jsonb, p_reason_code text, p_details text, p_type text, p_address jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  v_uid uuid := auth.uid(); o record; it jsonb; oi record; v_qty int; pr record;
  v_items jsonb := '[]'::jsonb; v_amount numeric := 0; v_days int; v_since timestamptz;
  v_addr jsonb; v_num text; v_id uuid; k text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = p_order_id AND user_id = v_uid AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'We could not find that order.'; END IF;
  IF o.status::text NOT IN ('delivered', 'completed') THEN
    RAISE EXCEPTION 'You can request a return once your order has been delivered.';
  END IF;
  v_days := coalesce(nullif(private.cfg('return_days'), '')::int, 30);
  v_since := coalesce(o.delivered_at, o.updated_at);
  IF v_since < now() - make_interval(days => v_days) THEN
    RAISE EXCEPTION 'The % day return period for this order has ended.', v_days;
  END IF;
  IF EXISTS (SELECT 1 FROM public.returns WHERE order_id = o.id AND status IN ('requested', 'approved')) THEN
    RAISE EXCEPTION 'You already have an open return request for this order.';
  END IF;
  IF p_reason_code NOT IN ('wrong_item', 'damaged', 'not_as_described', 'changed_mind', 'size_fit', 'late', 'other') THEN
    RAISE EXCEPTION 'Please choose a reason.';
  END IF;
  IF p_type NOT IN ('refund', 'replacement') THEN RAISE EXCEPTION 'Please choose refund or replacement.'; END IF;
  IF length(coalesce(p_details, '')) > 1000 THEN RAISE EXCEPTION 'Please keep the details under 1000 characters.'; END IF;
  IF p_reason_code = 'other' AND length(btrim(coalesce(p_details, ''))) < 5 THEN
    RAISE EXCEPTION 'Please tell us what went wrong.';
  END IF;

  v_addr := jsonb_build_object(
    'full_name', btrim(coalesce(p_address->>'full_name', '')), 'phone', btrim(coalesce(p_address->>'phone', '')),
    'governorate', btrim(coalesce(p_address->>'governorate', '')), 'city', btrim(coalesce(p_address->>'city', '')),
    'line1', btrim(coalesce(p_address->>'line1', '')), 'line2', btrim(coalesce(p_address->>'line2', '')));
  FOREACH k IN ARRAY ARRAY['full_name', 'phone', 'governorate', 'city', 'line1'] LOOP
    IF v_addr->>k = '' OR length(v_addr->>k) > 150 THEN RAISE EXCEPTION 'Please fill in your name, phone and address.'; END IF;
  END LOOP;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 30 THEN
    RAISE EXCEPTION 'Choose at least one item to return.';
  END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO oi FROM public.order_items WHERE id = (it->>'order_item_id')::uuid AND order_id = o.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'One of the items is not part of this order.'; END IF;
    v_qty := (it->>'quantity')::int;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > oi.quantity THEN RAISE EXCEPTION 'Invalid quantity for %.', oi.product_name; END IF;
    SELECT images->>0 AS image, slug INTO pr FROM public.products WHERE id = oi.product_id;
    v_amount := v_amount + oi.unit_price * v_qty;
    v_items := v_items || jsonb_build_object('order_item_id', oi.id, 'product_id', oi.product_id, 'name', oi.product_name,
      'quantity', v_qty, 'unit_price', oi.unit_price, 'image', pr.image, 'slug', pr.slug);
  END LOOP;

  INSERT INTO public.returns (order_id, user_id, status, type, reason, reason_code, details, items, refund_amount, address)
  VALUES (o.id, v_uid, 'requested', p_type,
    CASE p_reason_code WHEN 'wrong_item' THEN 'Wrong item received' WHEN 'damaged' THEN 'Damaged or defective'
      WHEN 'not_as_described' THEN 'Not as described' WHEN 'changed_mind' THEN 'Changed my mind'
      WHEN 'size_fit' THEN 'Size or fit' WHEN 'late' THEN 'Arrived too late' ELSE 'Other' END,
    p_reason_code, nullif(btrim(coalesce(p_details, '')), ''), v_items, v_amount, v_addr)
  RETURNING id, return_number INTO v_id, v_num;
  RETURN jsonb_build_object('id', v_id, 'return_number', v_num, 'order_number', o.order_number);
END $$;

-- Staff: approve a request and get the details for the email in one step (only works once per request).
CREATE OR REPLACE FUNCTION public.claim_return_approval(p_id uuid, p_note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE r record; o record;
BEGIN
  IF NOT public.has_any_staff_role(auth.uid()) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  SELECT * INTO r FROM public.returns WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Return request not found.'; END IF;
  IF r.status <> 'requested' THEN RAISE EXCEPTION 'This request was already handled.'; END IF;
  UPDATE public.returns SET status = 'approved', processed_at = now(), processed_by = auth.uid(),
    admin_notes = nullif(btrim(coalesce(p_note, '')), '') WHERE id = r.id;
  SELECT order_number, email INTO o FROM public.orders WHERE id = r.order_id;
  RETURN jsonb_build_object('return_number', r.return_number, 'order_number', o.order_number, 'email', o.email,
    'type', r.type, 'refund_amount', r.refund_amount, 'items', r.items, 'address', r.address,
    'note', nullif(btrim(coalesce(p_note, '')), ''));
END $$;

-- Staff: details for sending the approval email again (only for approved requests).
CREATE OR REPLACE FUNCTION public.get_return_email(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE r record; o record;
BEGIN
  IF NOT public.has_any_staff_role(auth.uid()) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  SELECT * INTO r FROM public.returns WHERE id = p_id AND status = 'approved';
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT order_number, email INTO o FROM public.orders WHERE id = r.order_id;
  RETURN jsonb_build_object('return_number', r.return_number, 'order_number', o.order_number, 'email', o.email,
    'type', r.type, 'refund_amount', r.refund_amount, 'items', r.items, 'address', r.address, 'note', r.admin_notes);
END $$;

CREATE OR REPLACE FUNCTION public.mark_return_email_sent(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT public.has_any_staff_role(auth.uid()) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  UPDATE public.returns SET approval_email_sent_at = now() WHERE id = p_id;
END $$;

REVOKE ALL ON FUNCTION public.create_return_request(uuid, jsonb, text, text, text, jsonb),
  public.claim_return_approval(uuid, text), public.get_return_email(uuid), public.mark_return_email_sent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_return_request(uuid, jsonb, text, text, text, jsonb),
  public.claim_return_approval(uuid, text), public.get_return_email(uuid), public.mark_return_email_sent(uuid) TO authenticated;
