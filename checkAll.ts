const SUPABASE_URL = "https://ujgepdkbproyrexmtapn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZ2VwZGticHJveXJleG10YXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTQ4MzIsImV4cCI6MjA5MzQ3MDgzMn0.COpbpBVao65qzGsK0heH4ente6fcMAM0R_g3kujqI7I";

const EXTERNAL_SUPABASE_URL = "https://bdqskcyjzeshsjwacbvr.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXNrY3lqemVzaHNqd2FjYnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODMwNTAsImV4cCI6MjA5MzQ5OTA1MH0.DlCOhjBW3PTnPmzYNPrUgrVcPatfJgdX-uI9bP3xm0s";

async function main() {
  console.log("--- Local Supabase (ujgepdkbproyrexmtapn) ---");

  // Get settings
  const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const settings = await settingsRes.json();
  console.log("Settings:", settings);

  // Get expenses sum for 2026
  const expensesRes = await fetch(`${SUPABASE_URL}/rest/v1/expenses?entry_date=gte.2026-01-01`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const expenses = await expensesRes.json();
  const totalMaint = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  console.log("Expenses count (2026):", expenses.length);
  console.log("Sum of Expenses (2026):", totalMaint);

  // Get raw_materials sum for 2026
  const rmRes = await fetch(`${SUPABASE_URL}/rest/v1/raw_materials?entry_date=gte.2026-01-01`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const rm = await rmRes.json();
  const totalRmLocal = rm.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
  console.log("Raw materials count (2026):", rm.length);
  console.log("Sum of Raw Materials total_amount (2026):", totalRmLocal);

  console.log("\n--- External Database (bdqskcyjzeshsjwacbvr) ---");

  // Get external entries sum for 2026
  const extRes = await fetch(`${EXTERNAL_SUPABASE_URL}/rest/v1/entries?entry_date=gte.2026-01-01`, {
    headers: { 'apikey': EXTERNAL_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${EXTERNAL_SUPABASE_ANON_KEY}` }
  });
  const entries = await extRes.json();
  const totalRmExternal = entries.reduce((sum, r) => sum + (Number(r.qty) * Number(r.rate)), 0);
  console.log("External entries count (2026):", entries.length);
  console.log("Sum of External entries qty * rate (2026):", totalRmExternal);
}

main().catch(console.error);
