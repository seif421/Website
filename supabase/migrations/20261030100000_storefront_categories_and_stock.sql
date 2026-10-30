-- Storefront support.

-- 1) Starter product categories (from the original brief). "Smart Locks" and
--    "Smart Door Locks" were duplicates, so they are one category here.
--    Edit or add more from the admin dashboard at any time.
INSERT INTO public.categories (name, slug, description, icon, sort_order, is_active, is_featured)
SELECT v.name, v.slug, v.description, v.icon, v.sort_order, true, true
FROM (VALUES
  ('Smart Cameras',    'smart-cameras',    'Indoor and outdoor security cameras.',          'camera',    1),
  ('Doorbell Cameras', 'doorbell-cameras', 'Video doorbells for your front door.',          'door-open', 2),
  ('Motion Sensors',   'motion-sensors',   'Detect movement inside and outside your home.', 'radar',     3),
  ('Window Sensors',   'window-sensors',   'Door and window open/close sensors.',           'alarm-clock', 4),
  ('Smart Locks',      'smart-locks',      'Keyless and smart door locks.',                 'key-round', 5),
  ('Alarm Systems',    'alarm-systems',    'Sirens, hubs and complete alarm kits.',         'siren',     6),
  ('Video Recorders',  'video-recorders',  'NVRs and storage for camera footage.',          'video',     7),
  ('Security Lights',  'security-lights',  'Motion-activated and smart security lighting.', 'lightbulb', 8),
  ('Accessories',      'accessories',      'Mounts, cables, batteries and add-ons.',        'cable',     9)
) AS v(name, slug, description, icon, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.slug = v.slug);

-- 2) Let visitors see whether a product is in stock, and nothing else about
--    inventory. Column-level grant: no location, no incoming/supplier data.
--    Only rows for products that are visible in the shop can be read.
REVOKE ALL ON public.inventory FROM anon;
GRANT SELECT (product_id, stock, reserved, allow_backorder, low_stock_threshold)
  ON public.inventory TO anon;
GRANT SELECT (product_id, stock, reserved, allow_backorder, low_stock_threshold)
  ON public.inventory TO authenticated;

DROP POLICY IF EXISTS "public read stock of active products" ON public.inventory;
CREATE POLICY "public read stock of active products"
  ON public.inventory FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = inventory.product_id AND p.is_active AND p.deleted_at IS NULL
    )
  );
