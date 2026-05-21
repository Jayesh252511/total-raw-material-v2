const SUPABASE_URL = "https://ujgepdkbproyrexmtapn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZ2VwZGticHJveXJleG10YXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTQ4MzIsImV4cCI6MjA5MzQ3MDgzMn0.COpbpBVao65qzGsK0heH4ente6fcMAM0R_g3kujqI7I";

async function main() {
  console.log("Fetching recent audit logs...");
  const logsRes = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?order=created_at.desc&limit=10`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const logs = await logsRes.json();
  console.log("Recent Audit Logs:\n", JSON.stringify(logs, null, 2));

  console.log("\nFetching recent sells records...");
  const sellsRes = await fetch(`${SUPABASE_URL}/rest/v1/sells?order=created_at.desc&limit=5`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const sells = await sellsRes.json();
  console.log("Recent Sells:\n", JSON.stringify(sells, null, 2));
}

main().catch(console.error);
