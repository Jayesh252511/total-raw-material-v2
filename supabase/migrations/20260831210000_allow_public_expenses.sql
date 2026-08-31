DROP POLICY IF EXISTS "Admin insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin delete expenses" ON public.expenses;

CREATE POLICY "Public insert expenses" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update expenses" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "Public delete expenses" ON public.expenses FOR DELETE USING (true);
