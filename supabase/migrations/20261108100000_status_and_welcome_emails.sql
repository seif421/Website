-- Welcome email (first sign-in), "shipped" email and "delivered" email.
-- Each email is claimed once in the database so a customer never gets the same email twice.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_email_sent_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_email_sent_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

-- People who already have an account do not get a welcome email now.
UPDATE public.profiles SET welcome_email_sent_at = now() WHERE welcome_email_sent_at IS NULL;
-- Orders that are already shipped or delivered do not trigger these emails retroactively.
UPDATE public.orders SET shipped_email_sent_at = now() WHERE shipped_email_sent_at IS NULL AND status::text IN ('shipped', 'delivered');
UPDATE public.orders SET delivered_email_sent_at = now() WHERE delivered_email_sent_at IS NULL AND status::text = 'delivered';

-- Welcome email: the signed-in user claims their own welcome, once.
CREATE OR REPLACE FUNCTION public.claim_welcome_email() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE p record; v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() AND welcome_email_sent_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_email := coalesce(nullif(p.email, ''), auth.jwt() ->> 'email', '');
  IF v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RETURN NULL; END IF;
  UPDATE public.profiles SET welcome_email_sent_at = now() WHERE id = p.id;
  RETURN jsonb_build_object('email', v_email, 'full_name', coalesce(p.full_name, ''));
END $$;

CREATE OR REPLACE FUNCTION public.release_welcome_email() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles SET welcome_email_sent_at = NULL WHERE id = auth.uid();
END $$;

-- Shipped / delivered emails: the server claims the order once, only if the order really has that status.
CREATE OR REPLACE FUNCTION public.claim_order_status_email(p_order_number text, p_kind text, p_secret text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE o record; items jsonb;
BEGIN
  IF p_secret IS DISTINCT FROM private.cfg('order_secret') THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  IF p_kind NOT IN ('shipped', 'delivered') THEN RAISE EXCEPTION 'Unknown email type.'; END IF;
  SELECT * INTO o FROM public.orders
   WHERE order_number = p_order_number AND email <> '' AND status::text = p_kind
     AND CASE WHEN p_kind = 'shipped' THEN shipped_email_sent_at IS NULL ELSE delivered_email_sent_at IS NULL END
   FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF p_kind = 'shipped' THEN UPDATE public.orders SET shipped_email_sent_at = now() WHERE id = o.id;
  ELSE UPDATE public.orders SET delivered_email_sent_at = now() WHERE id = o.id; END IF;
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
    'carrier', o.carrier, 'tracking_number', o.tracking_number,
    'address', o.shipping_address, 'items', items);
END $$;

CREATE OR REPLACE FUNCTION public.release_order_status_email(p_order_number text, p_kind text, p_secret text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF p_secret IS DISTINCT FROM private.cfg('order_secret') THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  IF p_kind = 'shipped' THEN UPDATE public.orders SET shipped_email_sent_at = NULL WHERE order_number = p_order_number;
  ELSIF p_kind = 'delivered' THEN UPDATE public.orders SET delivered_email_sent_at = NULL WHERE order_number = p_order_number; END IF;
END $$;

REVOKE ALL ON FUNCTION public.claim_welcome_email(), public.release_welcome_email(),
  public.claim_order_status_email(text, text, text), public.release_order_status_email(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_welcome_email(), public.release_welcome_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_order_status_email(text, text, text), public.release_order_status_email(text, text, text) TO anon, authenticated;
