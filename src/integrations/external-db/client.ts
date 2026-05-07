import { createClient } from "@supabase/supabase-js";

// External Lovable Cloud project (read-only mirror of Daily PC Entries)
const EXTERNAL_SUPABASE_URL = "https://bdqskcyjzeshsjwacbvr.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXNrY3lqemVzaHNqd2FjYnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODMwNTAsImV4cCI6MjA5MzQ1OTA1MH0.DlCOhjBW3PTnPmzYNPrUgrVcPatfJgdX-uI9bP3xm0s";

export const externalDb = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
