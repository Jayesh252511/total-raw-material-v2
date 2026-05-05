ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS stock_adjustment NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS device_info TEXT,
ADD COLUMN IF NOT EXISTS location_info TEXT;

ALTER TABLE public.raw_materials REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;
ALTER TABLE public.settings REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'raw_materials'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.raw_materials;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  END IF;
END $$;