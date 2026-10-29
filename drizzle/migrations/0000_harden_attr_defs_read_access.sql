-- product_attribute_defs is staff-only (used solely by the admin attributes module).
-- The former 'Public read attr defs' policy (USING (true)) exposed every row to anon;
-- staff access is already covered by the 'Staff manage attr defs' policy.
DROP POLICY IF EXISTS "Public read attr defs" ON public.product_attribute_defs;

-- Anon has no business with this table at all (RLS already denied writes; revoke reads too).
REVOKE ALL ON public.product_attribute_defs FROM anon;