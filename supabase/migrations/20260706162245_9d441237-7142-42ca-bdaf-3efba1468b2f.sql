
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
  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (caller, 'setup_first_admin', 'user_roles', caller, jsonb_build_object('role','super_admin'));
  RETURN jsonb_build_object('ok', true, 'user_id', caller);
END $$;
REVOKE EXECUTE ON FUNCTION public.setup_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setup_first_admin() TO authenticated;
