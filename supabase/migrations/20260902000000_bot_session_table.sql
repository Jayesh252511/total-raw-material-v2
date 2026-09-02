-- ─── Bot Session Table ────────────────────────────────────────────────────────
-- Stores WhatsApp bot auth session files so Render restarts don't lose them.
-- Each row = one session file (keyed by filename for atomic per-file updates).

-- Drop old blob-style table if it exists (may not have proper PK)
DROP TABLE IF EXISTS bot_session;

-- New per-file table: each key is one file name like 'creds.json', 'pre-key-1.json'
CREATE TABLE IF NOT EXISTS bot_auth_files (
  key        TEXT PRIMARY KEY,   -- e.g. 'creds.json', 'pre-key-42.json'
  content    TEXT NOT NULL,      -- file content (JSON string)
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Allow anon/service role full access (bot runs with anon key)
ALTER TABLE bot_auth_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for bot_auth_files"
  ON bot_auth_files FOR ALL
  USING (true)
  WITH CHECK (true);
