-- Allow admins to delete audit logs
CREATE POLICY "Admin delete audit_logs" ON public.audit_logs 
FOR DELETE TO authenticated 
USING (public.is_admin());
