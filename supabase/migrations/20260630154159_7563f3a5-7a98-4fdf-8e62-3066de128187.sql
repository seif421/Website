
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE public.product_status AS ENUM ('draft','published','hidden','archived','scheduled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status public.product_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS model_number text,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS sale_price numeric,
  ADD COLUMN IF NOT EXISTS tax_class text,
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS dimensions jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS country_of_origin text,
  ADD COLUMN IF NOT EXISTS warranty text,
  ADD COLUMN IF NOT EXISTS shipping_class text,
  ADD COLUMN IF NOT EXISTS is_best_seller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new_arrival boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_trending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS search_keywords text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_product_id text,
  ADD COLUMN IF NOT EXISTS supplier_cost numeric,
  ADD COLUMN IF NOT EXISTS supplier_stock integer,
  ADD COLUMN IF NOT EXISTS supplier_shipping_days integer,
  ADD COLUMN IF NOT EXISTS supplier_url text,
  ADD COLUMN IF NOT EXISTS supplier_notes text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS products_status_idx ON public.products(status);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS products_brand_idx ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON public.products USING gin (name gin_trgm_ops);

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text;

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text;

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS reserved integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incoming integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_backorder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_preorder boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  platform text,
  contact_email text,
  website text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (public.has_any_staff_role(auth.uid()));
CREATE POLICY "Staff manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.has_any_staff_role(auth.uid())) WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE TRIGGER suppliers_set_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  sku text,
  barcode text,
  price numeric,
  sale_price numeric,
  stock integer NOT NULL DEFAULT 0,
  weight numeric,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT SELECT ON public.product_variants TO anon;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active variants" ON public.product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Staff manage variants" ON public.product_variants FOR ALL TO authenticated USING (public.has_any_staff_role(auth.uid())) WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE TRIGGER product_variants_set_updated BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS variants_product_idx ON public.product_variants(product_id);

CREATE TABLE IF NOT EXISTS public.product_attribute_defs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'text',
  unit text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_attribute_defs TO authenticated;
GRANT SELECT ON public.product_attribute_defs TO anon;
GRANT ALL ON public.product_attribute_defs TO service_role;
ALTER TABLE public.product_attribute_defs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read attr defs" ON public.product_attribute_defs FOR SELECT USING (true);
CREATE POLICY "Staff manage attr defs" ON public.product_attribute_defs FOR ALL TO authenticated USING (public.has_any_staff_role(auth.uid())) WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE TRIGGER attr_defs_set_updated BEFORE UPDATE ON public.product_attribute_defs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.inventory_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  change integer NOT NULL,
  new_stock integer NOT NULL,
  reason text,
  user_id uuid,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inventory_history TO authenticated;
GRANT ALL ON public.inventory_history TO service_role;
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read inv history" ON public.inventory_history FOR SELECT TO authenticated USING (public.has_any_staff_role(auth.uid()));
CREATE POLICY "Staff insert inv history" ON public.inventory_history FOR INSERT TO authenticated WITH CHECK (public.has_any_staff_role(auth.uid()));
CREATE INDEX IF NOT EXISTS inv_history_product_idx ON public.inventory_history(product_id, created_at DESC);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_supplier_fk;
ALTER TABLE public.products ADD CONSTRAINT products_supplier_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE POLICY "Public read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Staff upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_any_staff_role(auth.uid()));
CREATE POLICY "Staff update product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.has_any_staff_role(auth.uid()));
CREATE POLICY "Staff delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_any_staff_role(auth.uid()));
