/**
 * WhatsApp Bot — Total Raw Material (Baileys Version)
 * No Chrome/Puppeteer needed! Connects via WebSocket directly.
 *
 * Run: node whatsapp-bot-baileys.cjs
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const PHONE_NUMBER   = process.env.PHONE_NUMBER || '918605601801';
const PORT           = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ['AQ.Ab8RN6L98wYh0', 'WVJctsfAcRCEXpnQnF4Prk4wydRBOH8KhtqHA'].join('');
const SUPABASE_URL   = 'ujgepdkbproyrexmtapn.supabase.co';
const SUPABASE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZ2VwZGticHJveXJleG10YXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTQ4MzIsImV4cCI6MjA5MzQ3MDgzMn0.COpbpBVao65qzGsK0heH4ente6fcMAM0R_g3kujqI7I';
const TARGET_GROUP   = 'Bot total raw material';
const AUTH_FOLDER    = './baileys_auth';

const qrcode = require('qrcode');

let currentPairingCode = null;
let currentQRCodeImage = null;
let botStatus = 'Starting...';

// ─── HTTP DASHBOARD (Serves Scannable QR Image & Pairing Code) ──────────────
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>WhatsApp Bot Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="3">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 1.5rem; background: #0f172a; color: #fff; text-align: center; }
          .card { background: #1e293b; padding: 2rem; border-radius: 1rem; max-width: 520px; margin: 1rem auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
          .code { font-size: 2.8rem; letter-spacing: 6px; font-weight: 900; background: #2563eb; color: #ffffff; padding: 0.75rem 1.5rem; border-radius: 0.75rem; margin: 1rem 0; display: inline-block; box-shadow: 0 4px 20px rgba(37,99,235,0.5); }
          .status { font-size: 1.2rem; margin-bottom: 1rem; color: #38bdf8; font-weight: 600; }
          .qr-box { background: #ffffff; padding: 1.25rem; border-radius: 1rem; display: inline-block; margin: 1rem 0; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
          .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; background: ${botStatus.includes('LIVE') ? '#10b981' : '#f59e0b'}; color: #fff; font-size: 0.85rem; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🤖 WhatsApp Bot Dashboard</h1>
          <div class="status">Status: <span class="badge">${botStatus}</span></div>

          ${currentQRCodeImage ? `
            <div class="qr-box">
              <img src="${currentQRCodeImage}" alt="Scan QR Code" style="width:280px; height:280px; display:block;" />
            </div>
            <p style="color:#38bdf8; font-size:1.1rem; font-weight:bold; margin-top:0.25rem;">📷 Scan this QR Code with WhatsApp Camera!</p>
          ` : ''}

          ${currentPairingCode ? `
            <div style="margin-top:1.25rem; border-top:1px solid #334155; padding-top:1rem;">
              <p style="color:#94a3b8; font-size:1rem;">Or enter 8-Digit Pairing Code on phone:</p>
              <div class="code">${currentPairingCode}</div>
            </div>
          ` : ''}

          ${!currentQRCodeImage && !currentPairingCode ? `
            <p style="color:#94a3b8;">${botStatus.includes('LIVE') ? '✅ Bot is connected and running 24/7!' : '⏳ Generating QR Code... Refreshing in 3s.'}</p>
          ` : ''}
        </div>
      </body>
    </html>
  `);
}).listen(PORT, () => {
  console.log(`🌐 Web Dashboard listening on port ${PORT}`);
});

// ─── HELPERS ───────────────────────────────────────────────────────────────
function fmtINR(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);
}
function today() { return new Date().toISOString().split('T')[0]; }
function currentMonth() { return today().slice(0, 7); }

const EXT_URL = 'bdqskcyjzeshsjwacbvr.supabase.co';
const EXT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXNrY3lqemVzaHNqd2FjYnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODMwNTAsImV4cCI6MjA5MzQ1OTA1MH0.DlCOhjBW3PTnPmzYNPrUgrVcPatfJgdX-uI9bP3xm0s';

// ─── SUPABASE ──────────────────────────────────────────────────────────────
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

// ─── GEMINI ────────────────────────────────────────────────────────────────
function callGemini(parts) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ contents: [{ parts }] });
    const opts = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '');
        } catch { resolve(''); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function processPhonePeImage(base64Image, mimeType) {
  const prompt = `Analyze this PhonePe payment screenshot and extract JSON only:
{
  "paid_to_name": "Recipient name",
  "amount": 1234.00,
  "transaction_id": "Txn ID string",
  "date": "Date string",
  "message": "Payment note/purpose"
}
Rules: Return ONLY valid JSON, no markdown. If not PhonePe, set amount null.`;

  const text = await callGemini([
    { text: prompt },
    { inlineData: { mimeType, data: base64Image } }
  ]);

  try {
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { amount: null };
  }
}

function detectCategory(note, paidTo) {
  const text = `${note} ${paidTo}`.toLowerCase();
  if (/petrol|diesel|fuel|pump|hpcl|bpcl|ioc|shell|petroleum/.test(text)) return 'petrol_diesel';
  if (/operator|salary|wages|majuri|worker|driver|staff|advance|remuneration/.test(text)) return 'operator';
  return 'maintenance';
}

// ─── REPORTS ───────────────────────────────────────────────────────────────
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
• Operator Majuri: *${fmtINR(operatorTotal)}*

━━━━━━━━━━━━━━━━━━━━
_"petrol report" — Petrol details_
_"operator report" — Majuri details_
_"august report" — Monthly report_
_"stock" — Stock only_
_"balance" — Cash balance only_`;
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

// ─── WIZARD & DATE HELPERS ──────────────────────────────────────────────────
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

async function generatePetrolReport() {
  const expenses = await supabase('GET', 'expenses?select=name,amount,entry_date&category=eq.petrol_diesel&order=entry_date.desc&limit=10');
  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const lines = expenses.map(e => `• ${e.entry_date?.slice(5).split('-').reverse().join('-')} — ${e.name} — *${fmtINR(e.amount)}*`).join('\n');
  return `⛽ *PETROL / DIESEL REPORT* (Last 10)\n━━━━━━━━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━━━━━━━━\nTotal: *${fmtINR(total)}*`;
}

async function generateOperatorReport() {
  const expenses = await supabase('GET', 'expenses?select=name,amount,entry_date&category=eq.operator&order=entry_date.desc&limit=10');
  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const lines = expenses.map(e => `• ${e.entry_date?.slice(5).split('-').reverse().join('-')} — ${e.name} — *${fmtINR(e.amount)}*`).join('\n');
  return `👷 *OPERATOR / MAJURI REPORT* (Last 10)\n━━━━━━━━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━━━━━━━━\nTotal: *${fmtINR(total)}*`;
}

// ─── TEXT COMMAND HANDLER ──────────────────────────────────────────────────
let lastInserted = null;

async function handleText(text, sender = 'default') {
  const t = text.toLowerCase().trim();

  // ── 0. WIZARD SESSION STEP-BY-STEP HANDLER ──────────────────────────────
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

  // ── 1. SMART MULTI-LINE / KEY-VALUE PARSER ──────────────────────────────
  if (text.includes('\n') || (/(?:date|name|qty|quantity|rate|bhada|payment)/i.test(text) && /\d/.test(text))) {
    const dateMatch = text.match(/(?:date|taarik|tareekh)\s*[:\-]?\s*([\d\-\/]+|today|aaj)/i);
    const nameMatch = text.match(/(?:name|naam|customer|party)\s*[:\-]?\s*([^\n\r,]+)/i);
    const qtyMatch = text.match(/(?:qty|quantity|ton|tons)\s*[:\-]?\s*([\d,.]+)/i);
    const rateMatch = text.match(/(?:rate|bhav|daam)\s*[:\-]?\s*([\d,.]+)/i);
    const gadiMatch = text.match(/(?:gadi|bhada|freight)\s*[:\-]?\s*([\d,.]+)/i);
    const payMatch = text.match(/(?:payment|pay|received|mila)\s*[:\-]?\s*([\d,.]+)/i);

    if (nameMatch && qtyMatch && rateMatch) {
      const entryDate = parseDateInput(dateMatch?.[1]);
      const name = nameMatch[1].trim();
      const qty = parseFloat(qtyMatch[1].replace(/,/g, ''));
      const rate = parseFloat(rateMatch[1].replace(/,/g, ''));
      const gadiBhada = gadiMatch ? parseFloat(gadiMatch[1].replace(/,/g, '')) : 0;
      const payment = payMatch ? parseFloat(payMatch[1].replace(/,/g, '')) : (qty * rate);

      const serialCheck = await supabase('GET', 'sells?select=serial_number&order=serial_number.desc&limit=1');
      const newSerial = (Number(serialCheck?.[0]?.serial_number) || 0) + 1;

      const inserted = await supabase('POST', 'sells', {
        entry_date: entryDate,
        serial_number: newSerial,
        name,
        quantity: qty,
        rate,
        payment,
        gadi_bhada: gadiBhada
      });

      const savedRow = Array.isArray(inserted) ? inserted[0] : inserted;
      if (!savedRow?.id) {
        return `❌ *Sell Entry Save Nahi Hua!*\nReason: ${savedRow?.message || 'Database error'}`;
      }

      lastInserted = { ...savedRow, _type: 'sell' };
      const dateFmt = entryDate.split('-').reverse().join('-');
      const totalAmt = qty * rate;

      return `✅ *Sell Entry Add Ho Gayi!*\n━━━━━━━━━━━━━━━━━━━━\n📅 Date: *${dateFmt}*\n👤 Name: *${name}*\n⚖️ Qty: *${qty} tons*\n💵 Rate: *₹${rate}/t*\n💰 Total: *${fmtINR(totalAmt)}*\n🚛 Gadi Bhada: *${fmtINR(gadiBhada)}*\n💳 Payment: *${fmtINR(payment)}*\n━━━━━━━━━━━━━━━━━━━━\n_Galat tha? "delete ${name}" likho_`;
    }
  }

  // ── PETROL / DIESEL ──────────────────────────────────────────────────────
  if (/petrol|diesel/.test(t)) return generatePetrolReport();

  // ── OPERATOR / MAJURI ────────────────────────────────────────────────────
  if (/operator|majuri/.test(t) && !/sells|sell|bikri/.test(t)) return generateOperatorReport();

  // ── MONTHLY SPECIFIC REPORT ──────────────────────────────────────────────
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

  // ── FULL REPORT / DASHBOARD ──────────────────────────────────────────────
  if (/report|dashboard|dikhao|batao|bata|sari|summary|status|poora|pura|full/.test(t)) return generateReport();

  // ── STOCK / MAAL ─────────────────────────────────────────────────────────
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

  // ── ADD FUNDS / LOCK AMOUNT UPDATE ───────────────────────────────────────
  if (/(fund|funds|lock|money|paisa|ammount|amount)/.test(t) && /(add|jodo|karo|plus|\+|dalo|increase|subtract|minus|kam|hatao|nikal|deduct)/.test(t) && !/sell|bikri|expense/.test(t)) {
    const nums = text.match(/[\d,]+\.?\d*/g)?.map(n => parseFloat(n.replace(/,/g, ''))) || [];
    if (nums.length === 0) {
      return `📋 *ADD FUNDS FORMAT*\n━━━━━━━━━━━━━━━━━━━━\n*add funds [amount] [optional note]*\n\nExamples:\n_add funds 5000_\n_add funds 5000 cash deposit_\n_lock amount add 1000_`;
    }

    const amount = nums[0];
    const isSubtract = /subtract|minus|kam|hatao|nikal|deduct/.test(t);
    const delta = isSubtract ? -amount : amount;

    const currentYear = new Date().getFullYear().toString();
    const [settings, expenses, pcEntries] = await Promise.all([
      supabase('GET', 'settings?select=total_money,lock_money&id=eq.1'),
      supabase('GET', 'expenses?select=amount,entry_date'),
      fetchExt('entries?select=qty,rate,entry_date')
    ]);

    const currentTotal = Number(settings?.[0]?.total_money || 0);
    const currentLock = Number(settings?.[0]?.lock_money || 0);

    const newTotal = currentTotal + delta;
    const newLock = currentLock + delta;

    const patchRes = await supabase('PATCH', 'settings?id=eq.1', {
      total_money: newTotal,
      lock_money: newLock
    });

    if (!Array.isArray(patchRes) || patchRes.length === 0 || patchRes.code || patchRes.error) {
      return `❌ *Database Permission Error!*\nSupabase RLS policy is blocking updates to settings.`;
    }

    const note = text.replace(/add|funds?|lock|ammount|amount|money|paisa|rs|rupees|₹|jodo|karo|plus|\+|dalo|increase|subtract|minus|kam|hatao|nikal|deduct|[\d,.]+/gi, '').trim();

    try {
      await supabase('POST', 'audit_logs', {
        action: 'settings_changed',
        entity: 'settings',
        entity_id: '1',
        device_info: 'WhatsApp Bot',
        details: {
          added_to_lock_and_total: delta,
          note: note || 'Added via WhatsApp Bot',
          total_before: currentTotal,
          total_after: newTotal,
          lock_before: currentLock,
          lock_after: newLock,
          added_money: delta,
          before: currentTotal,
          after: newTotal
        }
      });
    } catch {}

    const yearMaint = (Array.isArray(expenses) ? expenses : []).filter(e => e.entry_date?.startsWith(currentYear)).reduce((s, e) => s + Number(e.amount || 0), 0);
    const yearRM = (Array.isArray(pcEntries) ? pcEntries : []).filter(r => r.entry_date?.startsWith(currentYear)).reduce((s, r) => s + (Number(r.qty || 0) * Number(r.rate || 0)), 0);
    const yearExpense = yearMaint + yearRM;
    const netAvailable = newLock - yearExpense;

    return `💵 *FUNDS ${isSubtract ? 'DEDUCTED' : 'ADDED'}!* (Add Funds)\n━━━━━━━━━━━━━━━━━━━━\n${isSubtract ? '➖' : '➕'} Amount: *${fmtINR(amount)}*\n${note ? `📝 Note: *${note}*\n` : ''}━━━━━━━━━━━━━━━━━━━━\n📊 *UPDATED BALANCES:*\n• Base Total Money: *${fmtINR(newTotal)}*\n• Lock Amount: *${fmtINR(newLock)}*\n• Net Available Money: *${fmtINR(netAvailable)}*\n━━━━━━━━━━━━━━━━━━━━\n_Website dashboard synced!_`;
  }

  // ── BALANCE / PAISA ──────────────────────────────────────────────────────
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

  // ── SELLS ADD ENTRY (TRIGGER WIZARD OR FAST SINGLE LINE) ─────────────────
  if (/sell|bikri/.test(t) && /add|jodo|karo|entry|dalo|naya|bill/.test(t)) {
    const nums = text.match(/[\d,]+\.?\d*/g)?.map(n => parseFloat(n.replace(/,/g, ''))) || [];

    if (nums.length >= 3) {
      const nameMatch = text.match(/(?:sell|bikri)\s+(?:add|entry|karo|jodo|dalo|naya|bill)\s+(.+?)(?:\s+[\d,]+)/i);
      const name = nameMatch?.[1]?.trim() || 'Unknown';
      const qty = nums[0];
      const rate = nums[1];
      const payment = nums[2];
      const gadiMatch = t.match(/gadi\s+(?:bhada\s+)?([\d,]+)/);
      const gadiBhada = gadiMatch ? parseFloat(gadiMatch[1].replace(/,/g, '')) : 0;
      const entryDate = today();
      const totalAmt = qty * rate;

      const serialCheck = await supabase('GET', 'sells?select=serial_number&order=serial_number.desc&limit=1');
      const newSerial = (Number(serialCheck?.[0]?.serial_number) || 0) + 1;

      const inserted = await supabase('POST', 'sells', {
        entry_date: entryDate,
        serial_number: newSerial,
        name,
        quantity: qty,
        rate,
        payment,
        gadi_bhada: gadiBhada
      });

      const savedRow = Array.isArray(inserted) ? inserted[0] : inserted;
      if (!savedRow?.id) {
        return `❌ Sell entry save nahi hua.\nReason: ${savedRow?.message || 'Database error'}`;
      }

      lastInserted = { ...savedRow, _type: 'sell' };
      const dateFmt = entryDate.split('-').reverse().join('-');
      return `✅ *Sell Entry Add Ho Gayi!*\n━━━━━━━━━━━━━━━━━━━━\n📅 Date: *${dateFmt}*\n👤 Name: *${name}*\n⚖️ Qty: *${qty} tons*\n💵 Rate: *₹${rate}/t*\n💰 Total: *${fmtINR(totalAmt)}*\n🚛 Gadi Bhada: *${fmtINR(gadiBhada)}*\n💳 Payment: *${fmtINR(payment)}*\n━━━━━━━━━━━━━━━━━━━━\n_Galat tha? "delete ${name}" likho_`;
    }

    wizardSessions.set(sender, { step: 'DATE', data: {} });
    return `📝 *SELL BILL ENTRY WIZARD*\n━━━━━━━━━━━━━━━━━━━━\n📅 *Step 1/6: Date*\n\nTaareekh (DD-MM-YYYY) bataiye (e.g. *24-08-2026* ya *"today"*):`;
  }

  // ── SELLS REPORT ─────────────────────────────────────────────────────────
  if (/sell|bikri|becha/.test(t)) {
    const month = currentMonth(); const todayDate = today();
    const sells = await supabase('GET', 'sells?select=quantity,payment,entry_date,name&order=entry_date.desc&limit=5');
    const arr = Array.isArray(sells) ? sells : [];
    const monthQty = arr.filter(e => e.entry_date?.startsWith(month)).reduce((s, e) => s + Number(e.quantity || 0), 0);
    const todayQty = arr.filter(e => e.entry_date === todayDate).reduce((s, e) => s + Number(e.quantity || 0), 0);
    const last5 = arr.slice(0, 5).map(e => `• ${e.entry_date?.slice(5).split('-').reverse().join('-')} — ${e.name} — ${Number(e.quantity).toFixed(3)} t — *${fmtINR(e.payment)}*`).join('\n');
    return `🛒 *SELL (BIKRI) REPORT*\nIs Mahine ki Qty: *${monthQty.toFixed(3)} tons*\nAaj ki Qty: *${todayQty.toFixed(3)} tons*\n━━━━━━━━━━━━━━━━━━━━\n*Last 5 Entries:*\n${last5 || 'Koi entry nahi'}\n\n_Sell bill add karne ke liye "sell entry add" likho!_`;
  }

  // ── EXCEL / PDF ──────────────────────────────────────────────────────────
  if (/excel|csv/.test(t)) {
    const [expenses, sells] = await Promise.all([
      supabase('GET', 'expenses?select=entry_date,name,amount,category&order=entry_date.desc&limit=20'),
      supabase('GET', 'sells?select=entry_date,quantity,payment&order=entry_date.desc&limit=10')
    ]);
    const expLines = (Array.isArray(expenses) ? expenses : []).map(e => `${e.entry_date} | ${e.name} | ₹${e.amount} | ${e.category}`).join('\n');
    const sellLines = (Array.isArray(sells) ? sells : []).map(e => `${e.entry_date} | ${Number(e.quantity).toFixed(3)} t | ₹${e.payment}`).join('\n');
    return `📋 *DATA EXPORT (Last 20 Expenses)*\n━━━━━━━━━━━━━━━━━━━━\n*Date | Name | Amount | Category*\n${expLines}\n\n━━━━━━━━━━━━━━━━━━━━\n*SELLS (Last 10)*\n*Date | Qty | Payment*\n${sellLines}\n\n_Full export: https://total-raw-material-v2.vercel.app_`;
  }

  if (/pdf/.test(t)) {
    return `📄 *PDF Export*\nPDF seedha WhatsApp pe nahi bhej sakte.\nPura data yahan dekho:\n🔗 https://total-raw-material-v2.vercel.app\n\n_Browser mein Ctrl+P se PDF save kar sakte ho._`;
  }

  // ── TODAY / AAJ ──────────────────────────────────────────────────────────
  if (/aaj|today|kal|abhi/.test(t)) return generateReport();

  // ── SMART DELETE SEARCH BY NAME / DATE ───────────────────────────────────
  if (/delete|galat|undo|hatao|nikal/.test(t)) {
    const query = t.replace(/delete|galat|undo|hatao|nikal|karna|hai|entry|last|sell|expense/gi, '').trim();

    if (!query) {
      if (!lastInserted) return '❌ Koi recent entry nahi mili delete karne ke liye.';
      const isSell = lastInserted._type === 'sell';
      const table = isSell ? 'sells' : 'expenses';
      await supabase('DELETE', `${table}?id=eq.${lastInserted.id}`);
      const e = lastInserted; lastInserted = null;
      return `🗑️ *Deleted Last Entry!*\n${isSell ? `👤 ${e.name} — ${e.quantity} t` : e.name} — ${fmtINR(isSell ? e.payment : e.amount)}\nDate: ${e.entry_date}`;
    }

    let sellsMatch = await supabase('GET', `sells?name=ilike.*${encodeURIComponent(query)}*&order=entry_date.desc&limit=1`);
    if ((!Array.isArray(sellsMatch) || sellsMatch.length === 0) && /\d/.test(query)) {
      const parsedDate = parseDateInput(query);
      sellsMatch = await supabase('GET', `sells?entry_date=eq.${parsedDate}&order=created_at.desc&limit=1`);
    }

    if (Array.isArray(sellsMatch) && sellsMatch.length > 0) {
      const row = sellsMatch[0];
      await supabase('DELETE', `sells?id=eq.${row.id}`);
      const dateFmt = row.entry_date?.split('-').reverse().join('-');
      return `🗑️ *Deleted Sell Entry!*\n━━━━━━━━━━━━━━━━━━━━\n👤 Name: *${row.name}*\n📅 Date: *${dateFmt}*\n⚖️ Qty: *${row.quantity} tons*\n💳 Payment: *${fmtINR(row.payment)}*`;
    }

    let expMatch = await supabase('GET', `expenses?name=ilike.*${encodeURIComponent(query)}*&order=entry_date.desc&limit=1`);
    if ((!Array.isArray(expMatch) || expMatch.length === 0) && /\d/.test(query)) {
      const parsedDate = parseDateInput(query);
      expMatch = await supabase('GET', `expenses?entry_date=eq.${parsedDate}&order=created_at.desc&limit=1`);
    }

    if (Array.isArray(expMatch) && expMatch.length > 0) {
      const row = expMatch[0];
      await supabase('DELETE', `expenses?id=eq.${row.id}`);
      const dateFmt = row.entry_date?.split('-').reverse().join('-');
      return `🗑️ *Deleted Expense Entry!*\n━━━━━━━━━━━━━━━━━━━━\n📝 Name: *${row.name}*\n📅 Date: *${dateFmt}*\n💰 Amount: *${fmtINR(row.amount)}*`;
    }

    return `❌ *Koi entry nahi mili matching "${query}".*\nCheck karein naam ya date sahi hai.`;
  }

  // ── HELP ──────────────────────────────────────────────────────────────────
  if (/help|commands|kya kare|kya karna/.test(t)) {
    return `🤖 *BOT COMMANDS*\n━━━━━━━━━━━━━━━━━━━━\n📸 *Photo bhejo* — PhonePe screenshot auto-entry\n📝 *sell entry add* — Step-by-step sell wizard\n📊 *report* — Full dashboard\n⛽ *petrol* — Petrol/Diesel details\n👷 *operator* — Majuri details\n🛒 *sell* — Sales details\n📦 *stock* — Haath mein maal\n💰 *balance* — Cash balance\n📋 *excel* — Data export\n🔒 *lock add 5000* — Lock amount mein jodo\n🗑️ *delete jayesh* — Delete entry by name/date\n━━━━━━━━━━━━━━━━━━━━`;
  }

  // ── TOTAL / KITNA / QTY ───────────────────────────────────────────────────
  if (/total|kitna|qty|quantity|amount|kitne|paise|rupee/.test(t)) return generateReport();

  // ── FALLBACK ─────────────────────────────────────────────────────────────
  return `🤖 *Samajh nahi aaya!*\n"_${text.slice(0, 40)}_"\n\nYeh commands try karo:\n• *sell entry add* — Add sell bill\n• *report* — Full data\n• *petrol* — Petrol details\n• *stock* — Maal balance\n• *balance* — Cash balance\n• *delete [name]* — Delete entry\n\n📸 _PhonePe screenshot bhejo for auto-entry_`;
}

// ─── SUPABASE SESSION SNAPSHOT (Survives Render Cloud Restarts & Sleep) ────
async function restoreSessionFromSupabase() {
  try {
    const res = await supabase('GET', 'bot_session?id=eq.session_snapshot');
    if (Array.isArray(res) && res.length > 0 && res[0].data) {
      const files = res[0].data;

      // Verify creds.json exists and registered === true
      if (files['creds.json']) {
        try {
          const creds = JSON.parse(files['creds.json']);
          if (!creds.registered) {
            console.log('⚠️ Saved DB session snapshot is not registered yet. Clearing...');
            await supabase('DELETE', 'bot_session?id=eq.session_snapshot');
            return false;
          }
        } catch {}
      }

      if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });
      let count = 0;
      for (const fileName in files) {
        const filePath = path.join(AUTH_FOLDER, fileName);
        fs.writeFileSync(filePath, files[fileName], 'utf8');
        count++;
      }
      if (count > 0) {
        console.log(`✅ Restored ${count} registered WhatsApp session files from Supabase DB!`);
        return true;
      }
    }
  } catch (e) {
    console.error('Session restore error:', e?.message || e);
  }
  return false;
}

async function saveSessionToSupabase() {
  try {
    if (!fs.existsSync(AUTH_FOLDER)) return;
    const credsPath = path.join(AUTH_FOLDER, 'creds.json');
    if (!fs.existsSync(credsPath)) return;

    // ONLY save to DB if registered === true
    const credsContent = fs.readFileSync(credsPath, 'utf8');
    try {
      const credsObj = JSON.parse(credsContent);
      if (!credsObj.registered) {
        console.log('⏭️ Session not registered yet — skipping DB save.');
        return;
      }
    } catch {
      return;
    }

    const fileNames = fs.readdirSync(AUTH_FOLDER);
    const sessionData = {};
    for (const file of fileNames) {
      const filePath = path.join(AUTH_FOLDER, file);
      if (fs.statSync(filePath).isFile()) {
        sessionData[file] = fs.readFileSync(filePath, 'utf8');
      }
    }

    // ✅ UPSERT — use Prefer: resolution=merge-duplicates so if row exists it gets UPDATED
    // The old POST was silently failing when session_snapshot already existed!
    const payload = JSON.stringify({ id: 'session_snapshot', data: sessionData });
    await new Promise((resolve, reject) => {
      const opts = {
        hostname: SUPABASE_URL,
        path: '/rest/v1/bot_session',
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal',
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      const req = https.request(opts, (res) => {
        res.resume();
        res.on('end', resolve);
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    console.log(`💾 Session UPSERTED to Supabase DB (${Object.keys(sessionData).length} files)`);
  } catch (e) {
    console.error('Session save error:', e?.message || e);
  }
}

let currentSock = null;

// ─── MAIN BOT ──────────────────────────────────────────────────────────────
async function startBot() {
  if (currentSock) {
    try { currentSock.ev.removeAllListeners(); currentSock.ws?.close(); } catch {}
    currentSock = null;
  }

  // Restore active login session from Supabase DB before initialization
  await restoreSessionFromSupabase();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Mac OS', 'Chrome', '120.0.6099.225'],
    markOnlineOnConnect: false,
    syncFullHistory: false
  });
  currentSock = sock;

  sock.ev.on('creds.update', async () => {
    await saveCreds();
    await saveSessionToSupabase();
  });

  // Request Pairing Code if not registered and no code requested yet
  if (!sock.authState.creds.registered && !currentPairingCode) {
    setTimeout(async () => {
      if (currentPairingCode || sock.authState.creds.registered) return;
      try {
        const cleanNumber = PHONE_NUMBER.replace(/[^0-9]/g, '');
        const code = await sock.requestPairingCode(cleanNumber);
        currentPairingCode = code;
        botStatus = `Pairing Code: ${code}`;
        console.log('\n==================================================');
        console.log(`🔑 YOUR STABLE WHATSAPP PAIRING CODE IS: ${code}`);
        console.log(`📱 Phone Number: +${cleanNumber}`);
        console.log('==================================================');
        console.log('Open WhatsApp → Settings → Linked Devices → Link with phone number instead → Enter code!\n');
      } catch (e) {
        // If code request failed, allow retry on next loop
        if (!e?.message?.includes('already')) {
          console.error('Failed to request pairing code:', e?.message || e);
        }
      }
    }, 3000);
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      try {
        currentQRCodeImage = await qrcode.toDataURL(qr, { margin: 2, scale: 8 });
        botStatus = 'Scan QR Code below';
      } catch (e) {
        console.error('QR Image error:', e);
      }
    }
    if (connection === 'open') {
      botStatus = 'LIVE & READY 24/7';
      currentPairingCode = null;
      currentQRCodeImage = null;
      console.log('\n✅ WhatsApp Bot is LIVE and ready!');
      console.log(`✅ Listening to group: "${TARGET_GROUP}"`);
      console.log('✅ Forward any PhonePe screenshot to the group to add expenses.\n');
      
      // Save active session state to Supabase DB immediately on connect
      await saveSessionToSupabase();

      // ✅ Periodic session backup every 10 minutes while connected
      // WhatsApp silently rotates keys — this ensures the saved session stays fresh
      if (sock._sessionSaveInterval) clearInterval(sock._sessionSaveInterval);
      sock._sessionSaveInterval = setInterval(async () => {
        if (botStatus === 'LIVE & READY 24/7') {
          await saveSessionToSupabase();
          console.log('🔄 Periodic 10-min session backup done.');
        }
      }, 10 * 60 * 1000);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      botStatus = `Disconnected (${code})`;
      console.log('⚠️ Connection closed. Code:', code, '| Reconnecting:', shouldReconnect);
      // Clear periodic backup timer on disconnect
      if (sock._sessionSaveInterval) { clearInterval(sock._sessionSaveInterval); sock._sessionSaveInterval = null; }
      if (shouldReconnect) {
        // ✅ Flush latest session to DB before reconnecting so restored state is fresh
        await saveSessionToSupabase();
        setTimeout(startBot, code === 515 ? 1000 : 5000);
      } else {
        console.log('❌ Session invalidated (Code 401). Clearing auth folder & DB session snapshot for fresh pairing...');
        try { fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); } catch {}
        try { await supabase('DELETE', 'bot_session?id=eq.session_snapshot'); } catch {}
        currentPairingCode = null;
        currentQRCodeImage = null;
        setTimeout(startBot, 2000);
      }
    }
  });

  // Messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      try {
        if (!msg.key.remoteJid) continue;

        const jid = msg.key.remoteJid;
        const isGroup = jid.endsWith('@g.us');
        if (!isGroup) continue;

        const groupMeta = await sock.groupMetadata(jid).catch(() => null);
        if (!groupMeta || groupMeta.subject !== TARGET_GROUP) continue;

        const msgContent = msg.message;
        if (!msgContent) continue;

        const textContent = msgContent.conversation || msgContent.extendedTextMessage?.text || '';
        const BOT_REPLY_PREFIXES = [
          '⏳', '✅', '❌', '⚠️', '📊', '💰', '⛽', '👷', '🗑️', '🤖', '💵',
          '📦 *STOCK', '🔒 *Lock', '🛒 *SELL', '📋 *DATA', '📄 *PDF', '📝', '👤', '⚖️', '💳', '🚛',
          '📅'
        ];
        if (textContent && BOT_REPLY_PREFIXES.some(p => textContent.startsWith(p))) {
          continue;
        }

        console.log(`📨 Message in "${TARGET_GROUP}" | fromMe: ${msg.key.fromMe}`);

        // Image PhonePe
        const actualImg = msgContent.imageMessage;
        if (actualImg) {
          console.log('🖼️ Image detected! Processing...');
          await sock.sendMessage(jid, { text: '⏳ Screenshot padh raha hoon...' });

          const { downloadMediaMessage } = require('@whiskeysockets/baileys');
          const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
          const base64 = buffer.toString('base64');
          const mime = actualImg.mimetype || 'image/jpeg';

          let data;
          try {
            data = await processPhonePeImage(base64, mime);
          } catch (e) {
            await sock.sendMessage(jid, { text: '❌ Screenshot read nahi hua.' });
            continue;
          }

          if (!data.amount) {
            await sock.sendMessage(jid, { text: '❌ Amount nahi mila.' });
            continue;
          }

          if (data.transaction_id) {
            try {
              const dup = await supabase('GET', `expenses?phonepay_txn_id=eq.${data.transaction_id}&select=id,name,amount`);
              if (Array.isArray(dup) && dup.length > 0) {
                await sock.sendMessage(jid, { text: `⚠️ *Duplicate Entry Blocked!*\nPehele se add hai: ${dup[0].name} — ${fmtINR(dup[0].amount)}` });
                continue;
              }
            } catch {}
          }

          const category = detectCategory(data.message || '', data.paid_to_name || '');
          const catLabel = category === 'petrol_diesel' ? '⛽ Petrol/Diesel' : category === 'operator' ? '👷 Operator' : '📦 Other';
          const entryName = data.message ? `${data.paid_to_name} (${data.message})` : data.paid_to_name || 'PhonePe Expense';

          await supabase('POST', 'expenses', {
            entry_date: today(),
            name: entryName,
            amount: data.amount,
            category,
            phonepay_txn_id: data.transaction_id || null
          });

          await sock.sendMessage(jid, {
            text: `✅ *Expense Added!*\n━━━━━━━━━━━━━━━━━━━━\n📅 Date: *${today().split('-').reverse().join('-')}*\n💰 Amount: *${fmtINR(data.amount)}*\n📝 Name: *${entryName}*\n🏷️ Category: *${catLabel}*\n🔖 Txn ID: ${data.transaction_id || 'N/A'}\n━━━━━━━━━━━━━━━━━━━━\n_Galat tha? "delete last" likho_`
          });

        } else {
          const text = msgContent.conversation || msgContent.extendedTextMessage?.text || '';
          if (!text) continue;
          console.log(`💬 Text: "${text}"`);
          const sender = msg.key.participant || msg.key.remoteJid;
          const reply = await handleText(text, sender);
          if (reply) await sock.sendMessage(jid, { text: reply });
        }

      } catch (err) {
        console.error('❌ Error:', err?.message || err);
      }
    }
  });
}

// ─── SELF-PING KEEP-ALIVE (Prevents Render Free Service from Sleeping) ────
function startSelfKeepAlive() {
  const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://total-raw-material-v2.onrender.com';
  console.log(`📡 Initializing 24/7 Keep-Alive self-ping for ${renderUrl}...`);

  setInterval(() => {
    try {
      const client = renderUrl.startsWith('https') ? https : http;
      client.get(renderUrl, () => {
        // Keeps Render active 24/7
      }).on('error', () => {});
    } catch {}
  }, 3 * 60 * 1000); // Ping every 3 minutes (Render sleeps after 15 min)
}

startSelfKeepAlive();

console.log('🚀 Starting WhatsApp Bot for Total Raw Material...');
console.log('   No Chrome needed — connecting via WebSocket!\n');
startBot();
