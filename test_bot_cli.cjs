/**
 * Interactive WhatsApp Bot Terminal Simulator
 * Test all WhatsApp bot features right inside your terminal!
 *
 * Run: node test_bot_cli.cjs
 */

const readline = require('readline');
const https = require('https');

const SUPABASE_URL = 'ujgepdkbproyrexmtapn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZ2VwZGticHJveXJleG10YXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTQ4MzIsImV4cCI6MjA5MzQ3MDgzMn0.COpbpBVao65qzGsK0heH4ente6fcMAM0R_g3kujqI7I';
const EXT_URL      = 'bdqskcyjzeshsjwacbvr.supabase.co';
const EXT_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXNrY3lqemVzaHNqd2FjYnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODMwNTAsImV4cCI6MjA5MzQ1OTA1MH0.DlCOhjBW3PTnPmzYNPrUgrVcPatfJgdX-uI9bP3xm0s';

function fmtINR(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);
}
function today() { return new Date().toISOString().split('T')[0]; }
function currentMonth() { return today().slice(0, 7); }

function supabase(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: SUPABASE_URL,
      path: `/rest/v1/${urlPath}`,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        ...(method === 'POST' || method === 'PATCH' ? { 'Prefer': 'return=representation' } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function fetchExt(urlPath) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: EXT_URL,
      path: `/rest/v1/${urlPath}`,
      method: 'GET',
      headers: {
        'apikey': EXT_KEY,
        'Authorization': `Bearer ${EXT_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.end();
  });
}

const wizardSessions = new Map();

function parseDateInput(str) {
  if (!str) return today();
  const s = str.trim().toLowerCase();
  if (s === 'today' || s === 'aaj') return today();
  const m = s.match(/(\d{1,2})[-\/](\d{1,2})(?:[-\/](\d{2,4}))?/);
  if (m) {
    let day = m[1].padStart(2, '0');
    let month = m[2].padStart(2, '0');
    let year = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : new Date().getFullYear().toString();
    return `${year}-${month}-${day}`;
  }
  return today();
}

async function generateReport() {
  const currentYear = new Date().getFullYear().toString();
  const [expenses, sells, settings, pcEntries] = await Promise.all([
    supabase('GET', 'expenses?select=amount,category,entry_date'),
    supabase('GET', 'sells?select=quantity,payment,entry_date'),
    supabase('GET', 'settings?select=total_money,lock_money,sell_money,stock_adjustment&id=eq.1'),
    fetchExt('entries?select=qty,rate,entry_date')
  ]);
  const todayDate = today(); const month = currentMonth();
  const expArr = Array.isArray(expenses) ? expenses : [];
  const sellArr = Array.isArray(sells) ? sells : [];
  const pcArr = Array.isArray(pcEntries) ? pcEntries : [];

  const yearMaint = expArr.filter(e => e.entry_date?.startsWith(currentYear)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const todayMaint = expArr.filter(e => e.entry_date === todayDate).reduce((s, e) => s + Number(e.amount || 0), 0);
  const monthMaint = expArr.filter(e => e.entry_date?.startsWith(month)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const petrolTotal = expArr.filter(e => e.category === 'petrol_diesel').reduce((s, e) => s + Number(e.amount || 0), 0);
  const operatorTotal = expArr.filter(e => e.category === 'operator').reduce((s, e) => s + Number(e.amount || 0), 0);

  const yearRM = pcArr.filter(r => r.entry_date?.startsWith(currentYear)).reduce((s, r) => s + (Number(r.qty || 0) * Number(r.rate || 0)), 0);
  const yearExpense = yearMaint + yearRM;

  const pcStock = pcArr.reduce((s, r) => s + Number(r.qty || 0), 0);
  const soldStock = sellArr.reduce((s, e) => s + Number(e.quantity || 0), 0);
  const stockAdj = Number(settings?.[0]?.stock_adjustment || 0);
  const totalStock = pcStock - soldStock + stockAdj;

  const totalQty = soldStock;
  const totalPay = sellArr.reduce((s, e) => s + Number(e.payment || 0), 0);
  const monthQty = sellArr.filter(e => e.entry_date?.startsWith(month)).reduce((s, e) => s + Number(e.quantity || 0), 0);
  const todayQty = sellArr.filter(e => e.entry_date === todayDate).reduce((s, e) => s + Number(e.quantity || 0), 0);
  const yearTons = sellArr.filter(e => e.entry_date?.startsWith(currentYear)).reduce((s, e) => s + Number(e.quantity || 0), 0);

  const lockMoney = Number(settings?.[0]?.lock_money || 0);
  const totalMoney = lockMoney - yearExpense;
  const dateLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return `📊 *TOTAL RAW MATERIAL REPORT*
📅 ${dateLabel}
━━━━━━━━━━━━━━━━━━━━
💰 *PAISA (Money)*
• Total Money: *${fmtINR(totalMoney)}*
• Lock Amount: *${fmtINR(lockMoney)}*
• Aaj ka Kharcha: *${fmtINR(todayMaint)}*

━━━━━━━━━━━━━━━━━━━━
📦 *STOCK (Maal)*
• Haath mein maal: *${totalStock.toFixed(3)} tons*
• Yearly Tons Used: *${yearTons.toFixed(3)} tons*
• Aaj ka Tons Used: *${todayQty.toFixed(3)} tons*

━━━━━━━━━━━━━━━━━━━━
🛒 *BIKRI (Sales)*
• Total Sell Qty: *${totalQty.toFixed(3)} tons*
• Total Payment: *${fmtINR(totalPay)}*
• Is Mahine ki Qty: *${monthQty.toFixed(3)} tons*
• Aaj ki Qty: *${todayQty.toFixed(3)} tons*

━━━━━━━━━━━━━━━━━━━━
🔧 *MAINTENANCE (Kharcha)*
• Yearly Total: *${fmtINR(yearExpense)}*
• Yearly Maintenance: *${fmtINR(yearMaint)}*
• Yearly Raw Material: *${fmtINR(yearRM)}*
• Is Mahine ka: *${fmtINR(monthMaint)}*
• Aaj ka: *${fmtINR(todayMaint)}*
• Petrol/Diesel: *${fmtINR(petrolTotal)}*
• Operator Majuri: *${fmtINR(operatorTotal)}*`;
}

async function generateMonthlyReport(monthCode, monthLabel) {
  const [expenses, sells, pcEntries] = await Promise.all([
    supabase('GET', 'expenses?select=amount,category,entry_date,name'),
    supabase('GET', 'sells?select=quantity,payment,entry_date,name,rate'),
    fetchExt('entries?select=qty,rate,entry_date')
  ]);

  const expArr = (Array.isArray(expenses) ? expenses : []).filter(e => e.entry_date?.startsWith(monthCode));
  const sellArr = (Array.isArray(sells) ? sells : []).filter(e => e.entry_date?.startsWith(monthCode));
  const pcArr = (Array.isArray(pcEntries) ? pcEntries : []).filter(r => r.entry_date?.startsWith(monthCode));

  const monthMaint = expArr.reduce((s, e) => s + Number(e.amount || 0), 0);
  const petrolTotal = expArr.filter(e => e.category === 'petrol_diesel').reduce((s, e) => s + Number(e.amount || 0), 0);
  const operatorTotal = expArr.filter(e => e.category === 'operator').reduce((s, e) => s + Number(e.amount || 0), 0);
  const otherExpense = expArr.filter(e => e.category !== 'petrol_diesel' && e.category !== 'operator').reduce((s, e) => s + Number(e.amount || 0), 0);

  const monthSellQty = sellArr.reduce((s, e) => s + Number(e.quantity || 0), 0);
  const monthSellPay = sellArr.reduce((s, e) => s + Number(e.payment || 0), 0);
  const sellCount = sellArr.length;

  const monthRMQty = pcArr.reduce((s, r) => s + Number(r.qty || 0), 0);
  const monthRMCost = pcArr.reduce((s, r) => s + (Number(r.qty || 0) * Number(r.rate || 0)), 0);

  const totalMonthExpense = monthMaint + monthRMCost;
  const netMonthlyIncome = monthSellPay - totalMonthExpense;

  return `📊 *MONTHLY REPORT — ${monthLabel.toUpperCase()}*
🗓️ Month: ${monthCode}
━━━━━━━━━━━━━━━━━━━━
🛒 *BIKRI (Sales)*
• Total Qty Sold: *${monthSellQty.toFixed(3)} tons*
• Total Payment Received: *${fmtINR(monthSellPay)}*
• Total Sell Bills: *${sellCount} entries*

🔧 *KHARCHA (Maintenance)*
• Total Maintenance: *${fmtINR(monthMaint)}*
• Petrol / Diesel: *${fmtINR(petrolTotal)}*
• Operator Majuri: *${fmtINR(operatorTotal)}*
• Other Expenses: *${fmtINR(otherExpense)}*

📦 *RAW MATERIAL (Purchase)*
• Total Purchased: *${monthRMQty.toFixed(3)} tons*
• Total RM Cost: *${fmtINR(monthRMCost)}*

━━━━━━━━━━━━━━━━━━━━
💰 *MONTHLY SUMMARY:*
• Total Revenue (Sell In): *${fmtINR(monthSellPay)}*
• Total Expenses (All Out): *${fmtINR(totalMonthExpense)}*
• Net Monthly Cashflow: *${fmtINR(netMonthlyIncome)}*
━━━━━━━━━━━━━━━━━━━━`;
}

let lastInserted = null;

async function handleText(text, sender = 'cli-user') {
  const t = text.toLowerCase().trim();

  // Wizard
  if (wizardSessions.has(sender)) {
    const session = wizardSessions.get(sender);
    const input = text.trim();

    if (/cancel|stop|roko|band|hatao|exit|abort/i.test(input)) {
      wizardSessions.delete(sender);
      return `❌ *Sell bill entry add cancel ho gaya!*`;
    }

    if (session.step === 'DATE') {
      session.data.entry_date = parseDateInput(input);
      session.step = 'NAME';
      return `👤 *Step 2/6: Customer / Party Name*\n━━━━━━━━━━━━━━━━━━━━\nNaam bataiye (e.g. *Mahesh Mal*):`;
    }

    if (session.step === 'NAME') {
      session.data.name = input;
      session.step = 'QTY';
      return `⚖️ *Step 3/6: Quantity in Tons*\n━━━━━━━━━━━━━━━━━━━━\nQuantity (tons) bataiye (e.g. *2* ya *21.82*):`;
    }

    if (session.step === 'QTY') {
      const q = parseFloat(input.replace(/,/g, ''));
      if (isNaN(q)) return `❌ Invalid number! Quantity dubara bataiye (e.g. *2*):`;
      session.data.quantity = q;
      session.step = 'RATE';
      return `💵 *Step 4/6: Rate per ton*\n━━━━━━━━━━━━━━━━━━━━\nRate per ton bataiye ₹ (e.g. *200* ya *590*):`;
    }

    if (session.step === 'RATE') {
      const r = parseFloat(input.replace(/,/g, ''));
      if (isNaN(r)) return `❌ Invalid rate! Rate dubara bataiye (e.g. *200*):`;
      session.data.rate = r;
      session.step = 'GADI';
      return `🚛 *Step 5/6: Gadi Bhada*\n━━━━━━━━━━━━━━━━━━━━\nGadi bhada bataiye ₹ (*0* likho agar nahi hai):`;
    }

    if (session.step === 'GADI') {
      const g = parseFloat(input.replace(/,/g, '')) || 0;
      session.data.gadi_bhada = g;
      session.step = 'PAYMENT';
      return `💳 *Step 6/6: Payment Received*\n━━━━━━━━━━━━━━━━━━━━\nPayment received bataiye ₹ (e.g. *200* ya *128738*):`;
    }

    if (session.step === 'PAYMENT') {
      const p = parseFloat(input.replace(/,/g, '')) || 0;
      session.data.payment = p;
      const d = session.data;
      wizardSessions.delete(sender);

      const serialCheck = await supabase('GET', 'sells?select=serial_number&order=serial_number.desc&limit=1');
      const newSerial = (Number(serialCheck?.[0]?.serial_number) || 0) + 1;

      const inserted = await supabase('POST', 'sells', {
        entry_date: d.entry_date,
        serial_number: newSerial,
        name: d.name,
        quantity: d.quantity,
        rate: d.rate,
        payment: d.payment,
        gadi_bhada: d.gadi_bhada || 0
      });

      const savedRow = Array.isArray(inserted) ? inserted[0] : inserted;
      if (!savedRow?.id) {
        return `❌ *Sell Entry Save Nahi Hua!*\nReason: ${savedRow?.message || 'Database error'}`;
      }

      lastInserted = { ...savedRow, _type: 'sell' };
      const dateFmt = d.entry_date.split('-').reverse().join('-');
      const totalAmt = d.quantity * d.rate;

      return `✅ *Sell Entry Added Successfully!*\n━━━━━━━━━━━━━━━━━━━━\n📅 Date: *${dateFmt}*\n👤 Name: *${d.name}*\n⚖️ Qty: *${d.quantity} tons*\n💵 Rate: *₹${d.rate}/t*\n💰 Total: *${fmtINR(totalAmt)}*\n🚛 Gadi Bhada: *${fmtINR(d.gadi_bhada)}*\n💳 Payment: *${fmtINR(d.payment)}*\n━━━━━━━━━━━━━━━━━━━━\n_Galat tha? "delete ${d.name}" likho_`;
    }
  }

  // Month report trigger
  const monthMap = {
    january: '01', jan: '01', february: '02', feb: '02', march: '03', mar: '03',
    april: '04', apr: '04', may: '05', june: '06', jun: '06', july: '07', jul: '07',
    august: '08', aug: '08', september: '09', sep: '09', sept: '09', october: '10', oct: '10',
    november: '11', nov: '11', december: '12', dec: '12'
  };

  const monthMatch = t.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|is mahine|pichle mahine|this month|last month)/i);
  if (monthMatch && (/report|summary|batao|dikhao|status|sari|mahine|month|ki/i.test(t) || monthMatch[0])) {
    const key = monthMatch[1].toLowerCase();
    let year = new Date().getFullYear();
    let monthNum;

    if (key === 'is mahine' || key === 'this month') {
      monthNum = String(new Date().getMonth() + 1).padStart(2, '0');
    } else if (key === 'pichle mahine' || key === 'last month') {
      let d = new Date();
      d.setMonth(d.getMonth() - 1);
      monthNum = String(d.getMonth() + 1).padStart(2, '0');
      year = d.getFullYear();
    } else {
      monthNum = monthMap[key];
      const yearMatch = t.match(/\b(202\d)\b/);
      if (yearMatch) year = parseInt(yearMatch[1]);
    }

    if (monthNum) {
      const monthCode = `${year}-${monthNum}`;
      const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthLabel = `${monthNamesFull[parseInt(monthNum) - 1]} ${year}`;
      return generateMonthlyReport(monthCode, monthLabel);
    }
  }

  // Full report
  if (/report|dashboard|dikhao|batao|bata|sari|summary|status|poora|pura|full/.test(t)) return generateReport();

  // Stock
  if (/stock|bhandaar|inventory/.test(t) || (t === 'maal') || /kitna maal/.test(t)) {
    const [sells, pcEntries, settings] = await Promise.all([
      supabase('GET', 'sells?select=quantity'),
      fetchExt('entries?select=qty'),
      supabase('GET', 'settings?select=stock_adjustment&id=eq.1')
    ]);
    const pcStock = (Array.isArray(pcEntries) ? pcEntries : []).reduce((s, r) => s + Number(r.qty || 0), 0);
    const soldStock = (Array.isArray(sells) ? sells : []).reduce((s, e) => s + Number(e.quantity || 0), 0);
    const stockAdj = Number(settings?.[0]?.stock_adjustment || 0);
    const totalStock = pcStock - soldStock + stockAdj;
    return `📦 *STOCK BALANCE*\nHaath mein maal: *${totalStock.toFixed(3)} tons*\nKul Kharida: ${pcStock.toFixed(3)} t\nKul Becha: ${soldStock.toFixed(3)} t`;
  }

  // Balance
  if (/balance|paisa|cash/.test(t)) {
    const currentYear = new Date().getFullYear().toString();
    const [expenses, settings, pcEntries] = await Promise.all([
      supabase('GET', 'expenses?select=amount,entry_date'),
      supabase('GET', 'settings?select=lock_money&id=eq.1'),
      fetchExt('entries?select=qty,rate,entry_date')
    ]);
    const yearMaint = (Array.isArray(expenses) ? expenses : []).filter(e => e.entry_date?.startsWith(currentYear)).reduce((s, e) => s + Number(e.amount || 0), 0);
    const yearRM = (Array.isArray(pcEntries) ? pcEntries : []).filter(r => r.entry_date?.startsWith(currentYear)).reduce((s, r) => s + (Number(r.qty || 0) * Number(r.rate || 0)), 0);
    const lockMoney = Number(settings?.[0]?.lock_money || 0);
    const totalMoney = lockMoney - (yearMaint + yearRM);
    return `💰 *CASH BALANCE*\nHaath mein paisa: *${fmtINR(totalMoney)}*\nLock Amount: *${fmtINR(lockMoney)}*`;
  }

  // Sell Add Trigger
  if (/sell|bikri/.test(t) && /add|jodo|karo|entry|dalo|naya|bill/.test(t)) {
    wizardSessions.set(sender, { step: 'DATE', data: {} });
    return `📝 *SELL BILL ENTRY WIZARD*\n━━━━━━━━━━━━━━━━━━━━\n📅 *Step 1/6: Date*\n\nTaareekh (DD-MM-YYYY) bataiye (e.g. *24-08-2026* ya *"today"*):`;
  }

  // Delete
  if (/delete|galat|undo|hatao|nikal/.test(t)) {
    const query = t.replace(/delete|galat|undo|hatao|nikal|karna|hai|entry|last|sell|expense/gi, '').trim();
    if (!query) return '❌ Specify name or date to delete e.g. "delete mahesh"';

    let sellsMatch = await supabase('GET', `sells?name=ilike.*${encodeURIComponent(query)}*&order=entry_date.desc&limit=1`);
    if (Array.isArray(sellsMatch) && sellsMatch.length > 0) {
      const row = sellsMatch[0];
      await supabase('DELETE', `sells?id=eq.${row.id}`);
      return `🗑️ *Deleted Sell Entry!* Name: ${row.name}`;
    }
    return `❌ No match found for "${query}"`;
  }

  return `🤖 Output response for: "${text}"`;
}

// Interactive CLI Loop
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log('\n==================================================');
console.log('📱 WHATSAPP BOT TERMINAL SIMULATOR');
console.log('Test any command right here in terminal!');
console.log('Try: "sell add", "august report", "stock", "balance", "report"');
console.log('Type "exit" to quit.');
console.log('==================================================\n');

function promptUser() {
  rl.question('\n💬 Enter WhatsApp Message > ', async (input) => {
    if (input.trim().toLowerCase() === 'exit') {
      rl.close();
      return;
    }
    const response = await handleText(input);
    console.log('\n🤖 BOT REPLY:\n' + response);
    promptUser();
  });
}

promptUser();
