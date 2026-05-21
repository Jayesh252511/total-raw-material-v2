const SUPABASE_URL = "https://ujgepdkbproyrexmtapn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZ2VwZGticHJveXJleG10YXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTQ4MzIsImV4cCI6MjA5MzQ3MDgzMn0.COpbpBVao65qzGsK0heH4ente6fcMAM0R_g3kujqI7I";

const data = `15-04-2026	Babu oprator	₹ 10,000.00	Advance	
16-04-2026	Gandhi Rope Suppliers	₹ 11,081.00	Tadpatri	
16-04-2026	Gandhi Rope Suppliers	₹ 760.00	2 Tab	
17-04-2026	Atul Bhau	₹ 1,000.00	Cash given from atul	
17-04-2026	Rohit Patil	₹ 50.00	Kata	
17-04-2026	Om sai Petroleum	₹ 1,700.00	Petrol	
18-04-2026	Yaash auto kasoda	₹ 800.00	PRTFCC(oil)	
20-04-2026	Gst	₹ 21,331.00	Gst	
20-04-2026	Gandhi Rope Suppliers	₹ 13,747.00	Tadpatri	
20-04-2026	Parth Mal	₹ 4,000.00	Personal use	
21-04-2026	Anil Viththal Shinkar	₹ 200.00	Shahid Hamal Majuri	
23-04-2026	Kunal Thakur	₹ 1,500.00	Disel	
24-04-2026	Sameer Oprator	₹ 1,000.00	Advance	
24-04-2026	Arjun Davar	₹ 500.00	Driving	
25-04-2026	Sameer Oprator	₹ 1,500.00	Advance	
25-04-2026	Shree Ram	₹ 2,900.00	Motor Repairing	
28-04-2026	Abbas Bohari	₹ 420.00	Welding	
28-04-2026	Rahul	₹ 1,700.00	Petrol	
28-04-2026	Ramesh Kumar	₹ 229.00	Kirana	
28-04-2026	Abbas Bohari	₹ 1,030.00	Jali aur Hardware	
28-04-2026	Sameer Oprator	₹ 5,000.00	Advance	
28-04-2026	Shri Sai	₹ 1,500.00	Disel	
29-04-2026	Dashrath	₹ 8,200.00	40L oil	
30-04-2026	Arjun Oprator	₹ 300.00	Welding	
30-04-2026	Shivam Engineering	₹ 43,023.00	PDF	
30-04-2026	RK	₹ 353.00	Rechagre	
30-04-2026	Kunal Thakur	₹ 1,600.00	Petrol	
02-05-2026	Kunal Thakur	₹ 1,500.00	Disel	
02-05-2026	Babu oprator	₹ 5,000.00	Advance	
02-05-2026	Mayur	₹ 5,850.00	UPI	
03-05-2026	Suleman Farukh	₹ 900.00		
03-05-2026	Dadashri	₹ 3,000.00	Petrol	
04-05-2026	Atul Bhau	₹ 150.00	Petrol	
04-05-2026	Kunal Thakur	₹ 550.00	Hydrolic Pipe	
04-05-2026	Kunal Thakur	₹ 630.00	Belt 4`;

async function importData() {
  const lines = data.trim().split('\n');
  const expenses = lines.map(line => {
    const parts = line.split('\t').map(p => p.trim());
    const dateStr = parts[0];
    let nameStr = parts[1];
    const amountStr = parts[2];
    const noteStr = parts[3] || '';

    // parse date dd-mm-yyyy to yyyy-mm-dd
    const [d, m, y] = dateStr.split('-');
    const entry_date = `${y}-${m}-${d}`;

    // parse amount
    const amount = parseFloat(amountStr.replace('₹', '').replace(/,/g, '').trim());

    // determine category and name
    let category = "other";
    if (noteStr && (noteStr.toLowerCase().includes('petrol') || noteStr.toLowerCase().includes('disel') || noteStr.toLowerCase().includes('oil'))) {
      category = "petrol_diesel";
    } else if (nameStr.toLowerCase().includes('oprator') || nameStr.toLowerCase().includes('operator') || (noteStr && noteStr.toLowerCase().includes('driving'))) {
      category = "operator";
    }

    if (noteStr) {
      nameStr = `${nameStr} - ${noteStr}`;
    }

    return {
      entry_date,
      name: nameStr,
      amount,
      category
    };
  });

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  console.log(`Found ${expenses.length} expenses to insert. Total amount: ₹ ${totalAmount.toLocaleString('en-IN')}`);

  // 1. Insert into expenses via REST API
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/expenses`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(expenses)
  });

  if (!insertRes.ok) {
    console.error("Error inserting expenses:", insertRes.status, await insertRes.text());
    return;
  }

  const inserted = await insertRes.json();
  console.log(`Successfully inserted ${inserted?.length} expenses.`);

  // 2. Fetch current settings
  const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!settingsRes.ok) {
    console.error("Error fetching settings:", settingsRes.status, await settingsRes.text());
    return;
  }

  const settingsList = await settingsRes.json();
  const settingsData = settingsList[0];

  if (settingsData) {
    const current = Number(settingsData.total_money || 0);
    const next = current - totalAmount;

    // 3. Update total_money
    const updateSettingsRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ total_money: next })
    });

    if (!updateSettingsRes.ok) {
      console.error("Error updating settings total_money:", updateSettingsRes.status, await updateSettingsRes.text());
    } else {
      console.log(`Updated total money in settings from ₹ ${current.toLocaleString('en-IN')} to ₹ ${next.toLocaleString('en-IN')}`);
    }
  } else {
    console.warn("Settings with ID 1 not found.");
  }
}

importData().catch(console.error);
