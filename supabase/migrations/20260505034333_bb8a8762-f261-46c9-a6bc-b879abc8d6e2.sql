
-- Helper function: is current JWT the admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() ->> 'email') = 'jayeshneo07@gmail.com', false);
$$;

-- raw_materials: drop old public write policies, keep public read
DROP POLICY IF EXISTS "Public insert raw_materials" ON public.raw_materials;
DROP POLICY IF EXISTS "Public update raw_materials" ON public.raw_materials;
DROP POLICY IF EXISTS "Public delete raw_materials" ON public.raw_materials;
CREATE POLICY "Admin insert raw_materials" ON public.raw_materials FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update raw_materials" ON public.raw_materials FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete raw_materials" ON public.raw_materials FOR DELETE TO authenticated USING (public.is_admin());

-- expenses
DROP POLICY IF EXISTS "Public insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Public update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Public delete expenses" ON public.expenses;
CREATE POLICY "Admin insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin delete expenses" ON public.expenses FOR DELETE TO authenticated USING (public.is_admin());

-- settings
DROP POLICY IF EXISTS "Public update settings" ON public.settings;
CREATE POLICY "Admin update settings" ON public.settings FOR UPDATE TO authenticated USING (public.is_admin());

-- audit_logs
DROP POLICY IF EXISTS "Public insert audit_logs" ON public.audit_logs;
CREATE POLICY "Admin insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
