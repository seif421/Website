-- Final-state fixes that used to live in a separate migration tool.
-- Safe to run on a fresh project after the earlier migrations.

-- 1) Attribute definitions are staff-only (no public reads).
DROP POLICY IF EXISTS "Public read attr defs" ON public.product_attribute_defs;
REVOKE ALL ON public.product_attribute_defs FROM anon;

-- 2) Product image storage.
-- Catalog photos are meant to be seen by every visitor, so the bucket is public.
-- Only staff can upload, change or delete files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Staff read product images" ON storage.objects;
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
