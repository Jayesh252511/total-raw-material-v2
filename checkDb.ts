const SUPABASE_URL = "https://ujgepdkbproyrexmtapn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZ2VwZGticHJveXJleG10YXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTQ4MzIsImV4cCI6MjA5MzQ3MDgzMn0.COpbpBVao65qzGsK0heH4ente6fcMAM0R_g3kujqI7I";

async function main() {
  const sellsRes = await fetch(`${SUPABASE_URL}/rest/v1/sells?select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const sells = await sellsRes.json();
  console.log("Sells records in DB count:", sells.length);
  console.log("Sells records in DB:", sells);
}

main().catch(console.error);
