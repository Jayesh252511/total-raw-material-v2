-- Table to store WhatsApp Baileys Auth Session in Supabase permanently so Render restarts never unlink device
CREATE TABLE IF NOT EXISTS public.bot_session (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_session ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read bot_session" ON public.bot_session;
CREATE POLICY "Public read bot_session" ON public.bot_session FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert bot_session" ON public.bot_session;
CREATE POLICY "Public insert bot_session" ON public.bot_session FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update bot_session" ON public.bot_session;
CREATE POLICY "Public update bot_session" ON public.bot_session FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete bot_session" ON public.bot_session;
CREATE POLICY "Public delete bot_session" ON public.bot_session FOR DELETE USING (true);
