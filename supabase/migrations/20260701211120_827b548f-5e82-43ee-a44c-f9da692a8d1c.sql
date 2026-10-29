
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (
  id, name, slug, description, short_description, sku, price, compare_at_price,
  category_id, brand_id, images, features, specs, rating, review_count,
  is_featured, is_active, deleted_at, created_at, updated_at, status, barcode,
  model_number, manufacturer, sale_price, tax_class, weight, dimensions,
  country_of_origin, warranty, shipping_class, is_best_seller, is_new_arrival,
  is_trending, meta_title, meta_description, search_keywords, tags, video_url,
  attributes, custom_fields, subcategory_id, scheduled_at, archived_at
) ON public.products TO anon;

REVOKE SELECT ON public.products FROM authenticated;
GRANT SELECT (
  id, name, slug, description, short_description, sku, price, compare_at_price,
  category_id, brand_id, images, features, specs, rating, review_count,
  is_featured, is_active, deleted_at, created_at, updated_at, status, barcode,
  model_number, manufacturer, sale_price, tax_class, weight, dimensions,
  country_of_origin, warranty, shipping_class, is_best_seller, is_new_arrival,
  is_trending, meta_title, meta_description, search_keywords, tags, video_url,
  attributes, custom_fields, subcategory_id, scheduled_at, archived_at,
  cost, supplier_id, supplier_product_id, supplier_cost, supplier_stock,
  supplier_shipping_days, supplier_url, supplier_notes, created_by
) ON public.products TO authenticated;

DROP POLICY IF EXISTS "public read settings" ON public.site_settings;
CREATE POLICY "public read safe settings"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = ANY (ARRAY[
    'store_name','store_tagline','currency','logo_url','favicon_url',
    'contact_email','contact_phone','social_links','address',
    'shipping_info','return_policy_summary','support_hours',
    'announcement','announcement_enabled','theme'
  ]));

DROP POLICY IF EXISTS "public subscribe" ON public.newsletter_subscribers;
CREATE POLICY "public subscribe"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 5 AND 254
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

DELETE FROM public.orders WHERE user_id IS NULL;
ALTER TABLE public.orders ALTER COLUMN user_id SET NOT NULL;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_any_staff_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_any_staff_role(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_any_staff_role(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
