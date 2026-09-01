-- Allow anon/public role to insert/update/delete sells and update settings/audit_logs for WhatsApp bot
DROP POLICY IF EXISTS "Public insert sells" ON public.sells;
CREATE POLICY "Public insert sells" ON public.sells FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update sells" ON public.sells;
CREATE POLICY "Public update sells" ON public.sells FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete sells" ON public.sells;
CREATE POLICY "Public delete sells" ON public.sells FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public update settings" ON public.settings;
CREATE POLICY "Public update settings" ON public.settings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public insert audit_logs" ON public.audit_logs;
CREATE POLICY "Public insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
