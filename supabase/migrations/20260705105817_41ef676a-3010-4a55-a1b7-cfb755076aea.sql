
-- Extend order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'packed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready_to_ship';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refund_requested';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'returned';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'failed_payment';

-- Extend orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_method text,
  ADD COLUMN IF NOT EXISTS carrier text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS supplier_reference text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

-- Extend coupons
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS max_discount numeric(10,2),
  ADD COLUMN IF NOT EXISTS max_uses_per_user integer,
  ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS product_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS category_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS customer_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS auto_apply boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS buy_x integer,
  ADD COLUMN IF NOT EXISTS get_y integer;

-- order_timeline
CREATE TABLE IF NOT EXISTS public.order_timeline (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event text NOT NULL,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_timeline TO authenticated;
GRANT ALL ON public.order_timeline TO service_role;
ALTER TABLE public.order_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff order timeline" ON public.order_timeline
  FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE POLICY "customer own order timeline" ON public.order_timeline
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_timeline.order_id AND o.user_id = auth.uid()));

-- order_notes
CREATE TABLE IF NOT EXISTS public.order_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  author_id uuid,
  note text NOT NULL,
  is_internal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_notes TO authenticated;
GRANT ALL ON public.order_notes TO service_role;
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff order notes" ON public.order_notes FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE TRIGGER trg_order_notes_updated BEFORE UPDATE ON public.order_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- customer_tags
CREATE TABLE IF NOT EXISTS public.customer_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_tags TO authenticated;
GRANT ALL ON public.customer_tags TO service_role;
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff customer tags" ON public.customer_tags FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));

-- customer_notes
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  author_id uuid,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO authenticated;
GRANT ALL ON public.customer_notes TO service_role;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff customer notes" ON public.customer_notes FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE TRIGGER trg_customer_notes_updated BEFORE UPDATE ON public.customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- shipping_zones
CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  countries text[] NOT NULL DEFAULT '{}'::text[],
  regions text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_zones TO authenticated;
GRANT SELECT ON public.shipping_zones TO anon;
GRANT ALL ON public.shipping_zones TO service_role;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read shipping zones" ON public.shipping_zones FOR SELECT USING (is_active);
CREATE POLICY "staff manage shipping zones" ON public.shipping_zones FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE TRIGGER trg_shipping_zones_updated BEFORE UPDATE ON public.shipping_zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- shipping_rates
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id uuid NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  name text NOT NULL,
  method text NOT NULL DEFAULT 'flat',
  price numeric(10,2) NOT NULL DEFAULT 0,
  min_weight numeric(10,2),
  max_weight numeric(10,2),
  min_order numeric(10,2),
  max_order numeric(10,2),
  free_over numeric(10,2),
  estimated_days_min integer,
  estimated_days_max integer,
  carrier text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_rates TO authenticated;
GRANT SELECT ON public.shipping_rates TO anon;
GRANT ALL ON public.shipping_rates TO service_role;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read shipping rates" ON public.shipping_rates FOR SELECT USING (is_active);
CREATE POLICY "staff manage shipping rates" ON public.shipping_rates FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE TRIGGER trg_shipping_rates_updated BEFORE UPDATE ON public.shipping_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- returns
CREATE TABLE IF NOT EXISTS public.returns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_number text NOT NULL DEFAULT ('RET-'::text || upper(substr(gen_random_uuid()::text, 1, 8))) UNIQUE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  type text NOT NULL DEFAULT 'refund',
  reason text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  refund_amount numeric(10,2),
  return_label_url text,
  admin_notes text,
  processed_at timestamptz,
  processed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.returns TO authenticated;
GRANT ALL ON public.returns TO service_role;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user own returns select" ON public.returns FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "user own returns insert" ON public.returns FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff manage returns" ON public.returns FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE TRIGGER trg_returns_updated BEFORE UPDATE ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  audience text NOT NULL DEFAULT 'staff',
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff view all notifications" ON public.notifications FOR SELECT TO authenticated
  USING (public.has_any_staff_role(auth.uid()) AND audience = 'staff');
CREATE POLICY "staff manage notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE POLICY "user own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (audience = 'customer' AND user_id = auth.uid());
CREATE POLICY "user mark own notifications read" ON public.notifications FOR UPDATE TO authenticated
  USING (audience = 'customer' AND user_id = auth.uid())
  WITH CHECK (audience = 'customer' AND user_id = auth.uid());

-- gift_cards
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  initial_balance numeric(10,2) NOT NULL,
  balance numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  recipient_email text,
  recipient_name text,
  message text,
  issued_to uuid,
  issued_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_cards TO authenticated;
GRANT ALL ON public.gift_cards TO service_role;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage gift cards" ON public.gift_cards FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE POLICY "user own gift cards" ON public.gift_cards FOR SELECT TO authenticated
  USING (issued_to = auth.uid());
CREATE TRIGGER trg_gift_cards_updated BEFORE UPDATE ON public.gift_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- marketing_banners
CREATE TABLE IF NOT EXISTS public.marketing_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  title text,
  subtitle text,
  cta_label text,
  cta_url text,
  image_url text,
  placement text NOT NULL DEFAULT 'home_hero',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_banners TO authenticated;
GRANT SELECT ON public.marketing_banners TO anon;
GRANT ALL ON public.marketing_banners TO service_role;
ALTER TABLE public.marketing_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active banners" ON public.marketing_banners FOR SELECT
  USING (is_active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
CREATE POLICY "staff manage banners" ON public.marketing_banners FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE TRIGGER trg_marketing_banners_updated BEFORE UPDATE ON public.marketing_banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- flash_sales
CREATE TABLE IF NOT EXISTS public.flash_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric(10,2) NOT NULL,
  product_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  category_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flash_sales TO authenticated;
GRANT SELECT ON public.flash_sales TO anon;
GRANT ALL ON public.flash_sales TO service_role;
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active flash sales" ON public.flash_sales FOR SELECT
  USING (is_active AND starts_at <= now() AND ends_at >= now());
CREATE POLICY "staff manage flash sales" ON public.flash_sales FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE TRIGGER trg_flash_sales_updated BEFORE UPDATE ON public.flash_sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage email templates" ON public.email_templates FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE TRIGGER trg_email_templates_updated BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- review_replies
CREATE TABLE IF NOT EXISTS public.review_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  author_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_replies TO authenticated;
GRANT SELECT ON public.review_replies TO anon;
GRANT ALL ON public.review_replies TO service_role;
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read review replies" ON public.review_replies FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_replies.review_id AND r.is_approved));
CREATE POLICY "staff manage review replies" ON public.review_replies FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()))
  WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE TRIGGER trg_review_replies_updated BEFORE UPDATE ON public.review_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend reviews with featured + reply flags
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_count integer NOT NULL DEFAULT 0;
