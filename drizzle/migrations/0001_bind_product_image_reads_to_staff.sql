-- The product-images bucket holds staff-uploaded catalog images served via short-lived
-- signed URLs. Remove the unbounded public read policy; only staff may access objects.
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;

-- Role-bound read access: staff can SELECT (required to create signed URLs and manage objects).
CREATE POLICY "Staff read product images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images' AND has_any_staff_role((select auth.uid())));