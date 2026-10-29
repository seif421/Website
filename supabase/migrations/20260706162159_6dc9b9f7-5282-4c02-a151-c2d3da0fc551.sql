
-- Part 5: RBAC hardening, first-admin setup, login history, gateway/integration settings

-- 1) Add super_admin role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';

-- 2) Profile hardening: suspension + last login
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 3) Login history
CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_history TO authenticated;
GRANT ALL ON public.login_history TO service_role;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own login history" ON public.login_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own login history" ON public.login_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff view all login history" ON public.login_history
  FOR SELECT TO authenticated USING (public.has_any_staff_role(auth.uid()));
CREATE INDEX IF NOT EXISTS login_history_user_created_idx ON public.login_history(user_id, created_at DESC);

-- 4) is_super_admin helper (works even before enum commit because body is late-bound)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'super_admin')
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;

-- Extend has_any_staff_role to include super_admin (super_admin is topmost staff role)
CREATE OR REPLACE FUNCTION public.has_any_staff_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('super_admin','admin','manager','staff'))
$$;

-- 5) Setup first admin RPC (idempotent, safe)
--    Promotes the calling authenticated user to super_admin IF no super_admin or admin exists yet.
CREATE OR REPLACE FUNCTION public.setup_first_admin()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid();
  existing int;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT count(*) INTO existing FROM public.user_roles WHERE role::text IN ('super_admin','admin');
  IF existing > 0 THEN
    RAISE EXCEPTION 'setup_already_completed';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (caller, 'super_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  -- Ensure customer role also stays; keep as-is.
  INSERT INTO public.activity_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (caller, 'setup_first_admin', 'user_roles', caller, jsonb_build_object('role','super_admin'))
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'user_id', caller);
END $$;
REVOKE EXECUTE ON FUNCTION public.setup_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setup_first_admin() TO authenticated;

-- 6) Setup status (public read; anon-safe)
CREATE OR REPLACE FUNCTION public.admin_setup_status()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'admin_exists',
    EXISTS (SELECT 1 FROM public.user_roles WHERE role::text IN ('super_admin','admin'))
  )
$$;
GRANT EXECUTE ON FUNCTION public.admin_setup_status() TO anon, authenticated, service_role;

-- 7) Tighten user_roles policies: only super_admin can grant super_admin/admin; admins manage lower roles
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins view roles" ON public.user_roles;

CREATE POLICY "super_admin manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "admin manage lower roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND role::text IN ('manager','staff','customer'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND role::text IN ('manager','staff','customer'));

CREATE POLICY "staff view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_any_staff_role(auth.uid()));

-- 8) Payment gateways + integration settings live in site_settings via known keys.
--    Seed defaults (idempotent).
INSERT INTO public.site_settings (key, value)
VALUES
  ('payment_gateways', '{"stripe":{"enabled":false},"paypal":{"enabled":false},"apple_pay":{"enabled":false},"google_pay":{"enabled":false},"bank_transfer":{"enabled":false},"cod":{"enabled":false}}'::jsonb),
  ('cj_dropshipping', '{"enabled":false,"auto_sync":false,"sync_interval_hours":6,"last_sync_at":null}'::jsonb),
  ('store_name', '"SentryHaus"'::jsonb),
  ('currency', '"USD"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 9) Rate limit table for auth-style endpoints (used by app-level checks)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 1,
  UNIQUE(key, window_start)
);
GRANT SELECT, INSERT, UPDATE ON public.rate_limits TO authenticated;
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access" ON public.rate_limits FOR SELECT TO authenticated USING (false);

-- 10) Extend order_status to include new automation states (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname='order_status' AND e.enumlabel='pending_sync') THEN
    ALTER TYPE public.order_status ADD VALUE 'pending_sync';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname='order_status' AND e.enumlabel='synced') THEN
    ALTER TYPE public.order_status ADD VALUE 'synced';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname='order_status' AND e.enumlabel='fulfilled') THEN
    ALTER TYPE public.order_status ADD VALUE 'fulfilled';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname='order_status' AND e.enumlabel='tracking_received') THEN
    ALTER TYPE public.order_status ADD VALUE 'tracking_received';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname='order_status' AND e.enumlabel='retry_failed') THEN
    ALTER TYPE public.order_status ADD VALUE 'retry_failed';
  END IF;
END $$;
