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

function generateSql() {
  const lines = data.trim().split('\n');
  const values: string[] = [];
  let totalAmount = 0;

  for (const line of lines) {
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
    totalAmount += amount;

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

    // Escape single quotes for SQL
    const escapedName = nameStr.replace(/'/g, "''");

    values.push(`('${entry_date}', '${escapedName}', ${amount}, '${category}')`);
  }

  console.log(`-- Insertion of ${lines.length} expenses (Total: ₹ ${totalAmount.toLocaleString('en-IN')})`);
  console.log("INSERT INTO public.expenses (entry_date, name, amount, category)");
  console.log("VALUES");
  console.log(values.join(',\n') + ";\n");

  console.log("-- Update settings total_money");
  console.log(`UPDATE public.settings SET total_money = total_money - ${totalAmount} WHERE id = 1;`);
}

generateSql();
