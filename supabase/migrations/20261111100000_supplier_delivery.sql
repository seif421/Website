-- Multiple suppliers, each with its own delivery fee per governorate.
-- A cart with items from N suppliers ships as N parcels: one fee per supplier.
-- Products with no supplier use the default fees (private.delivery_zones).

INSERT INTO public.suppliers (name, slug, platform, is_active)
SELECT v.name, v.slug, v.platform, true
FROM (VALUES ('Taager','taager','taager'),('Go Tager','go-tager','go-tager'),
             ('Dropzawy','dropzawy','dropzawy'),('Elnol Printing','elnol-printing','elnol-printing')) AS v(name, slug, platform)
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers s WHERE lower(s.name) = lower(v.name));

CREATE TABLE IF NOT EXISTS private.supplier_delivery_zones (
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  governorate text NOT NULL,
  fee numeric NOT NULL CHECK (fee >= 0),
  PRIMARY KEY (supplier_id, governorate)
);
REVOKE ALL ON private.supplier_delivery_zones FROM PUBLIC, anon, authenticated;

-- Start every supplier with the current default fees; edit them in Admin > Delivery fees.
INSERT INTO private.supplier_delivery_zones (supplier_id, governorate, fee)
SELECT s.id, z.governorate, z.fee
FROM public.suppliers s CROSS JOIN private.delivery_zones z
WHERE lower(s.name) IN ('taager','go tager','dropzawy','elnol printing')
ON CONFLICT DO NOTHING;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS supplier_name text;

CREATE OR REPLACE FUNCTION private.tg_order_item_supplier() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.supplier_id IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT p.supplier_id, s.name INTO NEW.supplier_id, NEW.supplier_name
    FROM public.products p LEFT JOIN public.suppliers s ON s.id = p.supplier_id WHERE p.id = NEW.product_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_order_item_supplier ON public.order_items;
CREATE TRIGGER trg_order_item_supplier BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION private.tg_order_item_supplier();

-- Backfill existing order lines
UPDATE public.order_items oi SET supplier_id = p.supplier_id, supplier_name = s.name
FROM public.products p LEFT JOIN public.suppliers s ON s.id = p.supplier_id
WHERE oi.product_id = p.id AND oi.supplier_id IS NULL AND p.supplier_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.price_cart_eg(p_items jsonb, p_gov text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE q jsonb; v_fee numeric; v_free text; v_sub numeric; v_total numeric := 0; v_known boolean := false;
        v_def numeric; g record; v_ship jsonb := '[]'::jsonb; v_f numeric;
BEGIN
  q := private.price_cart(p_items);
  v_sub := (q->>'subtotal')::numeric;
  SELECT fee INTO v_def FROM private.delivery_zones WHERE governorate = p_gov;
  IF p_gov IS NOT NULL AND v_def IS NULL THEN RAISE EXCEPTION 'Please choose your governorate.'; END IF;
  v_known := v_def IS NOT NULL;
  v_free := private.cfg('free_shipping_over');
  FOR g IN
    SELECT p.supplier_id, s.name AS supplier_name
    FROM jsonb_array_elements(q->'lines') l
    JOIN public.products p ON p.id = (l->>'product_id')::uuid
    LEFT JOIN public.suppliers s ON s.id = p.supplier_id
    GROUP BY p.supplier_id, s.name
    ORDER BY s.name NULLS LAST
  LOOP
    v_f := NULL;
    IF g.supplier_id IS NOT NULL THEN
      SELECT fee INTO v_f FROM private.supplier_delivery_zones WHERE supplier_id = g.supplier_id AND governorate = p_gov;
    END IF;
    v_f := coalesce(v_f, v_def);
    v_total := v_total + coalesce(v_f, 0);
    v_ship := v_ship || jsonb_build_object('supplier', coalesce(g.supplier_name, 'Rivvo'), 'fee', coalesce(v_f, 0));
  END LOOP;
  IF v_known AND v_free IS NOT NULL AND v_free <> '' AND v_sub >= v_free::numeric THEN
    v_total := 0;
    v_ship := (SELECT coalesce(jsonb_agg(e || '{"fee":0}'::jsonb), '[]'::jsonb) FROM jsonb_array_elements(v_ship) e);
  END IF;
  RETURN q || jsonb_build_object(
    'shipping', CASE WHEN v_known THEN v_total ELSE 0 END,
    'shipping_known', v_known,
    'shipments', CASE WHEN v_known THEN v_ship ELSE '[]'::jsonb END,
    'tax', 0,
    'total', v_sub + CASE WHEN v_known THEN v_total ELSE 0 END);
END $$;

-- Admin: read/edit per-supplier fees
CREATE OR REPLACE FUNCTION public.admin_supplier_delivery_zones(p_supplier uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('governorate', z.governorate,
            'fee', coalesce(sz.fee, z.fee)) ORDER BY z.sort), '[]'::jsonb)
          FROM private.delivery_zones z
          LEFT JOIN private.supplier_delivery_zones sz ON sz.supplier_id = p_supplier AND sz.governorate = z.governorate);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_supplier_delivery_fee(p_supplier uuid, p_governorate text, p_fee numeric) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  IF p_fee IS NULL OR p_fee < 0 OR p_fee > 5000 THEN RAISE EXCEPTION 'Enter a fee between 0 and 5000.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM private.delivery_zones WHERE governorate = p_governorate) THEN RAISE EXCEPTION 'Unknown governorate.'; END IF;
  INSERT INTO private.supplier_delivery_zones (supplier_id, governorate, fee) VALUES (p_supplier, p_governorate, p_fee)
  ON CONFLICT (supplier_id, governorate) DO UPDATE SET fee = EXCLUDED.fee;
END $$;

REVOKE ALL ON FUNCTION public.admin_supplier_delivery_zones(uuid), public.admin_set_supplier_delivery_fee(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_supplier_delivery_zones(uuid), public.admin_set_supplier_delivery_fee(uuid, text, numeric) TO authenticated;
