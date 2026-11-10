-- Website text and images that the owner edits from the admin (Admin > Website content).
CREATE TABLE IF NOT EXISTS public.site_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read site content" ON public.site_content;
CREATE POLICY "public read site content" ON public.site_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin manage site content" ON public.site_content;
CREATE POLICY "admin manage site content" ON public.site_content FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE OR REPLACE FUNCTION private.tg_site_content_touch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_site_content_touch ON public.site_content;
CREATE TRIGGER trg_site_content_touch BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION private.tg_site_content_touch();
