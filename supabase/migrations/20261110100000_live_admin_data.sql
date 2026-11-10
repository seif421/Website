-- Live admin: visitor counting, dashboard + analytics numbers, and staff notifications.
-- "Sales" below means every order that was not cancelled, refunded, returned or failed.
-- Days and months follow Cairo time.

-- ============ Visitor counting (no personal data: a random per-visit id, the page, source and device type) ============
CREATE TABLE IF NOT EXISTS public.page_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL CHECK (char_length(session_id) BETWEEN 8 AND 64),
  path text NOT NULL CHECK (char_length(path) BETWEEN 1 AND 300),
  source text NOT NULL DEFAULT 'direct' CHECK (source IN ('direct', 'organic', 'social', 'paid', 'referral')),
  device text NOT NULL DEFAULT 'desktop' CHECK (device IN ('mobile', 'tablet', 'desktop'))
);
CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON public.page_views (created_at);
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.page_views FROM anon, authenticated;
GRANT INSERT ON public.page_views TO anon, authenticated;
CREATE POLICY "anyone can record a visit" ON public.page_views FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============ Dashboard ============
CREATE OR REPLACE FUNCTION public.admin_dashboard() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  tz constant text := 'Africa/Cairo';
  today date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  m_start date := date_trunc('month', now() AT TIME ZONE 'Africa/Cairo')::date;
  pm_start date := (date_trunc('month', now() AT TIME ZONE 'Africa/Cairo') - interval '1 month')::date;
  mtd_days int := ((now() AT TIME ZONE 'Africa/Cairo')::date - date_trunc('month', now() AT TIME ZONE 'Africa/Cairo')::date) + 1;
  since_60 timestamptz := (((now() AT TIME ZONE 'Africa/Cairo')::date - 59)::timestamp AT TIME ZONE 'Africa/Cairo');
  r jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_any_staff_role(auth.uid()) THEN RAISE EXCEPTION 'Not allowed.'; END IF;

  WITH o AS (
    SELECT id, total, status::text AS status, (created_at AT TIME ZONE 'Africa/Cairo')::date AS d
      FROM public.orders
     WHERE archived_at IS NULL AND status::text NOT IN ('cancelled', 'refunded', 'returned', 'failed_payment')
  ),
  pv AS (
    SELECT session_id, source, (created_at AT TIME ZONE 'Africa/Cairo')::date AS d
      FROM public.page_views WHERE created_at >= since_60
  )
  SELECT jsonb_build_object(
    'today_sales',      (SELECT coalesce(sum(total), 0) FROM o WHERE d = today),
    'yesterday_sales',  (SELECT coalesce(sum(total), 0) FROM o WHERE d = today - 1),
    'month_sales',      (SELECT coalesce(sum(total), 0) FROM o WHERE d >= m_start),
    'prev_month_sales', (SELECT coalesce(sum(total), 0) FROM o WHERE d >= pm_start AND d < least(pm_start + mtd_days, m_start)),
    'orders_30d',       (SELECT count(*) FROM o WHERE d >= today - 29),
    'prev_orders_30d',  (SELECT count(*) FROM o WHERE d BETWEEN today - 59 AND today - 30),
    'visitors_30d',     (SELECT count(DISTINCT session_id) FROM pv WHERE d >= today - 29),
    'prev_visitors_30d',(SELECT count(DISTINCT session_id) FROM pv WHERE d BETWEEN today - 59 AND today - 30),
    'avg_order_30d',    (SELECT coalesce(round(avg(total), 2), 0) FROM o WHERE d >= today - 29),
    'prev_avg_order_30d',(SELECT coalesce(round(avg(total), 2), 0) FROM o WHERE d BETWEEN today - 59 AND today - 30),
    'delivered_revenue',(SELECT coalesce(sum(total), 0) FROM o WHERE status IN ('delivered', 'completed')),
    'delivered_orders', (SELECT count(*) FROM o WHERE status IN ('delivered', 'completed')),
    'profit',           (SELECT coalesce(sum(oi.subtotal - coalesce(pr.cost, pr.supplier_cost, 0) * oi.quantity), 0)
                           FROM public.order_items oi
                           JOIN o ON o.id = oi.order_id AND o.status IN ('delivered', 'completed')
                           LEFT JOIN public.products pr ON pr.id = oi.product_id),
    'sales_7d',         (SELECT coalesce(jsonb_agg(jsonb_build_object('d', to_char(g::date, 'Dy DD'), 'sales', coalesce(s.sales, 0), 'orders', coalesce(s.orders, 0)) ORDER BY g), '[]'::jsonb)
                           FROM generate_series((today - 6)::timestamp, today::timestamp, interval '1 day') g
                           LEFT JOIN (SELECT d, sum(total) AS sales, count(*) AS orders FROM o GROUP BY d) s ON s.d = g::date),
    'traffic_7d',       (SELECT coalesce(jsonb_agg(jsonb_build_object('d', to_char(g::date, 'Dy DD'),
                               'direct',   coalesce(t.direct, 0), 'organic', coalesce(t.organic, 0), 'social', coalesce(t.social, 0),
                               'paid',     coalesce(t.paid, 0),   'referral', coalesce(t.referral, 0)) ORDER BY g), '[]'::jsonb)
                           FROM generate_series((today - 6)::timestamp, today::timestamp, interval '1 day') g
                           LEFT JOIN (SELECT d,
                                             count(DISTINCT session_id) FILTER (WHERE source = 'direct') AS direct,
                                             count(DISTINCT session_id) FILTER (WHERE source = 'organic') AS organic,
                                             count(DISTINCT session_id) FILTER (WHERE source = 'social') AS social,
                                             count(DISTINCT session_id) FILTER (WHERE source = 'paid') AS paid,
                                             count(DISTINCT session_id) FILTER (WHERE source = 'referral') AS referral
                                        FROM pv GROUP BY d) t ON t.d = g::date),
    'revenue_12m',      (SELECT coalesce(jsonb_agg(jsonb_build_object('m', to_char(g::date, 'Mon YY'), 'revenue', coalesce(s.revenue, 0)) ORDER BY g), '[]'::jsonb)
                           FROM generate_series((m_start - interval '11 months')::timestamp, m_start::timestamp, interval '1 month') g
                           LEFT JOIN (SELECT date_trunc('month', d)::date AS mo, sum(total) AS revenue FROM o GROUP BY 1) s ON s.mo = g::date),
    'top_products',     (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
                           SELECT oi.product_name AS name, sum(oi.quantity)::int AS sold, sum(oi.subtotal) AS revenue
                             FROM public.order_items oi JOIN o ON o.id = oi.order_id
                            GROUP BY oi.product_name ORDER BY sum(oi.quantity) DESC, sum(oi.subtotal) DESC LIMIT 5) x),
    'low_stock',        (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
                           SELECT pr.name, i.stock, i.low_stock_threshold AS threshold
                             FROM public.inventory i JOIN public.products pr ON pr.id = i.product_id
                            WHERE i.stock <= i.low_stock_threshold AND pr.is_active
                            ORDER BY i.stock, pr.name LIMIT 5) x),
    'recent_orders',    (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
                           SELECT id, order_number, coalesce(nullif(shipping_address ->> 'full_name', ''), email) AS customer,
                                  total, status::text AS status, created_at
                             FROM public.orders WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 6) x),
    'recent_customers', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
                           SELECT coalesce(nullif(pf.full_name, ''), 'New customer') AS name, pf.email,
                                  (SELECT count(*) FROM public.orders oo WHERE oo.user_id = pf.id AND oo.archived_at IS NULL
                                      AND oo.status::text NOT IN ('cancelled', 'refunded', 'returned', 'failed_payment'))::int AS orders
                             FROM public.profiles pf ORDER BY pf.created_at DESC LIMIT 5) x),
    'attention',        jsonb_build_object(
                           'pending_orders', (SELECT count(*) FROM public.orders WHERE archived_at IS NULL AND status::text = 'pending'),
                           'new_messages',   (SELECT count(*) FROM public.contact_messages WHERE status = 'new'),
                           'reviews_waiting',(SELECT count(*) FROM public.reviews WHERE NOT is_approved),
                           'low_stock',      (SELECT count(*) FROM public.inventory i JOIN public.products pr ON pr.id = i.product_id
                                               WHERE i.stock <= i.low_stock_threshold AND pr.is_active))
  ) INTO r;
  RETURN r;
END $$;

-- ============ Analytics (p_days = 7, 30, 90 or up to 365) ============
CREATE OR REPLACE FUNCTION public.admin_analytics(p_days int DEFAULT 30) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  m_start date := date_trunc('month', now() AT TIME ZONE 'Africa/Cairo')::date;
  v_days int := least(greatest(coalesce(p_days, 30), 7), 365);
  v_from date := ((now() AT TIME ZONE 'Africa/Cairo')::date - (least(greatest(coalesce(p_days, 30), 7), 365) - 1));
  v_from_ts timestamptz := (((now() AT TIME ZONE 'Africa/Cairo')::date - (least(greatest(coalesce(p_days, 30), 7), 365) - 1))::timestamp AT TIME ZONE 'Africa/Cairo');
  r jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_any_staff_role(auth.uid()) THEN RAISE EXCEPTION 'Not allowed.'; END IF;

  WITH o AS (
    SELECT id, user_id, total, shipping_address, (created_at AT TIME ZONE 'Africa/Cairo')::date AS d
      FROM public.orders
     WHERE archived_at IS NULL AND status::text NOT IN ('cancelled', 'refunded', 'returned', 'failed_payment')
  ),
  pv AS (
    SELECT session_id, source, device FROM public.page_views WHERE created_at >= v_from_ts
  )
  SELECT jsonb_build_object(
    'days', v_days,
    'visitors',   (SELECT count(DISTINCT session_id) FROM pv),
    'page_views', (SELECT count(*) FROM pv),
    'orders',     (SELECT count(*) FROM o WHERE d >= v_from),
    'sales',      (SELECT coalesce(sum(total), 0) FROM o WHERE d >= v_from),
    'daily_sales',(SELECT coalesce(jsonb_agg(jsonb_build_object('d', to_char(g::date, 'DD Mon'), 'sales', coalesce(s.sales, 0), 'orders', coalesce(s.orders, 0)) ORDER BY g), '[]'::jsonb)
                     FROM generate_series(v_from::timestamp, today::timestamp, interval '1 day') g
                     LEFT JOIN (SELECT d, sum(total) AS sales, count(*) AS orders FROM o GROUP BY d) s ON s.d = g::date),
    'weekly_sales',(SELECT coalesce(jsonb_agg(jsonb_build_object('w', to_char(g::date, 'DD Mon'), 'sales', coalesce(s.sales, 0)) ORDER BY g), '[]'::jsonb)
                     FROM generate_series((date_trunc('week', today::timestamp) - interval '49 days'), date_trunc('week', today::timestamp), interval '7 days') g
                     LEFT JOIN (SELECT date_trunc('week', d::timestamp)::date AS wk, sum(total) AS sales FROM o GROUP BY 1) s ON s.wk = g::date),
    'monthly_revenue',(SELECT coalesce(jsonb_agg(jsonb_build_object('m', to_char(g::date, 'Mon YY'), 'revenue', coalesce(s.revenue, 0)) ORDER BY g), '[]'::jsonb)
                     FROM generate_series((m_start - interval '11 months')::timestamp, m_start::timestamp, interval '1 month') g
                     LEFT JOIN (SELECT date_trunc('month', d)::date AS mo, sum(total) AS revenue FROM o GROUP BY 1) s ON s.mo = g::date),
    'traffic_sources',(SELECT coalesce(jsonb_agg(jsonb_build_object('name', initcap(source), 'value', n) ORDER BY n DESC), '[]'::jsonb)
                     FROM (SELECT source, count(DISTINCT session_id) AS n FROM pv GROUP BY source) t),
    'devices',    (SELECT coalesce(jsonb_agg(jsonb_build_object('name', initcap(device), 'value', n) ORDER BY n DESC), '[]'::jsonb)
                     FROM (SELECT device, count(DISTINCT session_id) AS n FROM pv GROUP BY device) t),
    'top_categories',(SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
                     SELECT coalesce(c.name, 'No category') AS n, sum(oi.subtotal) AS v
                       FROM public.order_items oi JOIN o ON o.id = oi.order_id AND o.d >= v_from
                       LEFT JOIN public.products pr ON pr.id = oi.product_id
                       LEFT JOIN public.categories c ON c.id = pr.category_id
                      GROUP BY 1 ORDER BY 2 DESC LIMIT 6) x),
    'top_products',(SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
                     SELECT oi.product_name AS n, sum(oi.quantity)::int AS v
                       FROM public.order_items oi JOIN o ON o.id = oi.order_id AND o.d >= v_from
                      GROUP BY 1 ORDER BY 2 DESC LIMIT 8) x),
    'customer_growth',(SELECT coalesce(jsonb_agg(jsonb_build_object('m', to_char(g::date, 'Mon YY'),
                         'new', (SELECT count(*) FROM public.profiles pf WHERE date_trunc('month', pf.created_at AT TIME ZONE 'Africa/Cairo') = g),
                         'returning', (SELECT count(DISTINCT o1.user_id) FROM o o1
                                        WHERE date_trunc('month', o1.d::timestamp) = g
                                          AND EXISTS (SELECT 1 FROM o o2 WHERE o2.user_id = o1.user_id AND o2.d < date_trunc('month', o1.d::timestamp)::date))
                       ) ORDER BY g), '[]'::jsonb)
                     FROM generate_series((m_start - interval '11 months')::timestamp, m_start::timestamp, interval '1 month') g),
    'governorates',(SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
                     SELECT coalesce(nullif(shipping_address ->> 'governorate', ''), 'Unknown') AS n, count(*)::int AS orders, sum(total) AS v
                       FROM o WHERE d >= v_from GROUP BY 1 ORDER BY 3 DESC LIMIT 10) x)
  ) INTO r;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.admin_dashboard(), public.admin_analytics(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard(), public.admin_analytics(int) TO authenticated;

-- ============ Staff notifications (the bell) ============
CREATE OR REPLACE FUNCTION private.notify_staff(p_type text, p_title text, p_message text, p_link text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS
$$ INSERT INTO public.notifications (audience, type, title, message, link) VALUES ('staff', p_type, p_title, p_message, p_link) $$;

CREATE OR REPLACE FUNCTION private.tg_notify_order() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  PERFORM private.notify_staff('order', 'New order ' || NEW.order_number,
    to_char(NEW.total, 'FM999,999,990.00') || ' EGP · ' || coalesce(NEW.shipping_address ->> 'governorate', 'Egypt') || ' · needs a confirmation call',
    '/admin/orders/' || NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_order ON public.orders;
CREATE TRIGGER trg_notify_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION private.tg_notify_order();

CREATE OR REPLACE FUNCTION private.tg_notify_contact() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  PERFORM private.notify_staff('support', 'New message from ' || NEW.name, left(NEW.message, 120), '/admin/support');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_contact ON public.contact_messages;
CREATE TRIGGER trg_notify_contact AFTER INSERT ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION private.tg_notify_contact();

CREATE OR REPLACE FUNCTION private.tg_notify_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  PERFORM private.notify_staff('review', 'New review (' || NEW.rating || ' of 5)', left(coalesce(NEW.title, NEW.body, ''), 120), '/admin/reviews');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_review ON public.reviews;
CREATE TRIGGER trg_notify_review AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION private.tg_notify_review();

CREATE OR REPLACE FUNCTION private.tg_notify_return() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  PERFORM private.notify_staff('return', 'New return request ' || coalesce(NEW.return_number, ''), left(coalesce(NEW.reason, ''), 120), '/admin/returns');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_return ON public.returns;
CREATE TRIGGER trg_notify_return AFTER INSERT ON public.returns FOR EACH ROW EXECUTE FUNCTION private.tg_notify_return();

CREATE OR REPLACE FUNCTION private.tg_notify_customer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  PERFORM private.notify_staff('customer', 'New customer', coalesce(nullif(NEW.full_name, ''), NEW.email, 'A new account'), '/admin/customers');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_customer ON public.profiles;
CREATE TRIGGER trg_notify_customer AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.tg_notify_customer();

CREATE OR REPLACE FUNCTION private.tg_notify_low_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_name text;
BEGIN
  SELECT name INTO v_name FROM public.products WHERE id = NEW.product_id;
  PERFORM private.notify_staff('stock', CASE WHEN NEW.stock <= 0 THEN 'Out of stock' ELSE 'Low stock' END,
    coalesce(v_name, 'A product') || ' · ' || NEW.stock || ' left', '/admin/inventory');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_low_stock ON public.inventory;
CREATE TRIGGER trg_notify_low_stock AFTER UPDATE OF stock ON public.inventory FOR EACH ROW
  WHEN (NEW.stock <= NEW.low_stock_threshold AND OLD.stock > OLD.low_stock_threshold)
  EXECUTE FUNCTION private.tg_notify_low_stock();
