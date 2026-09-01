/**
 * WhatsApp Bot — Total Raw Material (Baileys Version)
 * No Chrome/Puppeteer needed! Connects via WebSocket directly.
 *
 * Run: node whatsapp-bot-baileys.cjs
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const https = require('https');
const fs = require('fs');
const path = require('path');

const http = require('http');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const PHONE_NUMBER   = process.env.PHONE_NUMBER || '918605601801';
const PORT           = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ['AQ.Ab8RN6L98wYh0', 'WVJctsfAcRCEXpnQnF4Prk4wydRBOH8KhtqHA'].join('');
const SUPABASE_URL   = 'ujgepdkbproyrexmtapn.supabase.co';
const SUPABASE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZ2VwZGticHJveXJleG10YXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTQ4MzIsImV4cCI6MjA5MzQ3MDgzMn0.COpbpBVao65qzGsK0heH4ente6fcMAM0R_g3kujqI7I';
const TARGET_GROUP   = 'Bot total raw material';
const AUTH_FOLDER    = './baileys_auth';

let currentPairingCode = null;
let botStatus = 'Starting...';

// ─── HTTP DASHBOARD (Serves Pairing Code & Keeps Render Awake) ──────────────
http.createServer((req, res) => {
  if (req.url === '/ping' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('PONG_OK');
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>WhatsApp Bot Status</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="5">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 1.5rem; background: #0f172a; color: #fff; text-align: center; }
          .card { background: #1e293b; padding: 2rem; border-radius: 1rem; max-width: 500px; margin: 1rem auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
          .code { font-size: 2.8rem; letter-spacing: 6px; font-weight: 800; background: #2563eb; color: #fff; padding: 0.75rem 1.5rem; border-radius: 0.75rem; margin: 1.5rem 0; display: inline-block; box-shadow: 0 4px 14px rgba(37,99,235,0.4); }
          .status { font-size: 1.2rem; margin-bottom: 1rem; color: #38bdf8; font-weight: 600; }
          .steps { text-align: left; background: #0f172a; padding: 1.25rem; border-radius: 0.75rem; font-size: 0.95rem; margin-top: 1.5rem; line-height: 1.6; border: 1px solid #334155; }
          .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; background: #10b981; color: #fff; font-size: 0.85rem; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🤖 WhatsApp Bot Status</h1>
          <div class="status">Status: <span class="badge">${botStatus}</span></div>
          ${currentPairingCode ? `
            <p style="color:#94a3b8; font-size:1.1rem;">Your WhatsApp Pairing Code for <strong>+${PHONE_NUMBER}</strong>:</p>
            <div class="code">${currentPairingCode}</div>
            <div class="steps">
              <strong>📲 How to enter on your phone:</strong><br>
              1. Open <strong>WhatsApp</strong> on <strong>+${PHONE_NUMBER}</strong><br>
              2. Tap <strong>Settings</strong> (or 3 dots) → <strong>Linked Devices</strong><br>
              3. Tap <strong>Link a Device</strong><br>
              4. Tap <strong>Link with phone number instead</strong> (at bottom)<br>
              5. Enter code: <strong>${currentPairingCode}</strong>
            </div>
          ` : `
            <p style="color:#94a3b8;">${botStatus === 'LIVE & READY' ? '✅ Bot is connected and active!' : '⏳ Generating pairing code... Page auto-refreshes every 5 seconds.'}</p>
          `}
        </div>
      </body>
    </html>
  `);
}).listen(PORT, () => {
  console.log(`🌐 Web Dashboard listening on port ${PORT}`);
});

// ─── SELF-PINGER TIMER (Prevents Render Free Tier 15-min Sleep) ─────────────
const RENDER_SERVICE_URL = process.env.RENDER_EXTERNAL_URL || 'https://total-raw-material-v2.onrender.com';
setInterval(() => {
  try {
    const pingUrl = `${RENDER_SERVICE_URL}/ping`;
    https.get(pingUrl, (res) => {
      console.log(`📡 Keep-Alive pulse sent to Render (Status: ${res.statusCode})`);
    }).on('error', () => {});
  } catch {}
}, 90 * 1000); // Pulse every 90 seconds for ultra-fast response

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
  return new Promise((resolve) => {
    try {
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
        },
        timeout: 10000
      };
      const req = https.request(opts, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve([]); }
        });
      });
      req.on('error', (err) => {
        console.error('Supabase request error:', err?.message || err);
        resolve([]);
      });
      req.on('timeout', () => {
        req.destroy();
        console.error('Supabase request timeout:', urlPath);
        resolve([]);
      });
      if (payload) req.write(payload);
      req.end();
    } catch {
      resolve([]);
    }
  });
}

function fetchExt(urlPath) {
  return new Promise((resolve) => {
    try {
      const opts = {
        hostname: EXT_URL,
        path: `/rest/v1/${urlPath}`,
        method: 'GET',
        headers: {
          'apikey': EXT_KEY,
          'Authorization': `Bearer ${EXT_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      };
      const req = https.request(opts, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve([]); }
        });
      });
      req.on('error', (err) => {
        console.error('Ext fetch error:', err?.message || err);
        resolve([]);
      });
      req.on('timeout', () => {
        req.destroy();
        console.error('Ext fetch timeout:', urlPath);
        resolve([]);
      });
      req.end();
    } catch {
      resolve([]);
    }
  });
}

// ─── GEMINI API CALL (With Model Fallback) ─────────────────────────────────
function callGemini(parts) {
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  return new Promise((resolve) => {
    let attempt = 0;

    function tryNext() {
      if (attempt >= models.length) {
        return resolve('');
      }
      const model = models[attempt++];
      const payload = JSON.stringify({ contents: [{ parts }] });
      const cleanKey = GEMINI_API_KEY.replace(/[^a-zA-Z0-9_\-]/g, '');
      const opts = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${model}:generateContent?key=${cleanKey}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
      };
      const req = https.request(opts, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              return resolve(text);
            }
          } catch {}
          tryNext();
        });
      });
      req.on('error', () => tryNext());
      req.write(payload);
      req.end();
    }

    tryNext();
  });
}

// ─── CATEGORY ──────────────────────────────────────────────────────────────
function detectCategory(message, paidTo) {
  const text = `${message} ${paidTo}`.toLowerCase();
  if (/petrol|diesel|disel|fuel|pump/.test(text)) return 'petrol_diesel';
  if (/bazar|bazaar|salary|majuri|majri|advance|operator|oprator|sameer|sammer|babu|shan|driver|labour|mazdoor/.test(text)) return 'operator';
  return 'other';
}

// ─── PROCESS PHONEPAY IMAGE ────────────────────────────────────────────────
async function processPhonePeImage(imageBase64, mimeType) {
  const prompt = `This is a PhonePe payment screenshot from India.
Read all text carefully. Return ONLY valid JSON:
{
  "date": "DD Month YYYY",
  "amount": <number only>,
  "paid_to_name": "<name>",
  "message": "<Message field text>",
  "transaction_id": "<PhonePe Transaction ID starting with T>"
}
Use null for missing fields.`;

  const text = await callGemini([
    { inline_data: { mime_type: mimeType, data: imageBase64 } },
    { text: prompt }
  ]);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Gemini response');
  return JSON.parse(match[0]);
}

// ─── PROCESS VOICE AUDIO NOTE ──────────────────────────────────────────────
async function processVoiceAudio(audioBase64, mimeType) {
  const prompt = `You are an AI voice assistant for a raw material business in India (selling stone/aggregate/sand by tons).
Listen carefully to this audio voice note (which may be in Hindi, Hinglish, Marathi, Gujarati, or English).
Transcribe what the speaker is saying, and convert it into a clear text command for our bot.

Examples of voice commands:
- If speaker says: "Mahesh ko 2 ton becha 200 rate se bhada 100 payment 300"
  command: "sell add mahesh 2 200 300 gadi 100"
- If speaker says: "Sell bill add karna hai"
  command: "sell bill add"
- If speaker says: "Kitna maal bacha hai" or "Haath me maal kitna hai"
  command: "stock"
- If speaker says: "Report dikhao" or "Aaj ka report"
  command: "report"
- If speaker says: "August month report" or "August ki report"
  command: "august report"
- If speaker says: "Petrol 500 rs add karo"
  command: "petrol 500"
- If speaker says: "Lock amount 5000 add karo"
  command: "lock add 5000"
- If speaker says: "Mahesh entry delete karo"
  command: "delete mahesh"

Return ONLY a valid JSON object:
{
  "transcript": "<Exact transcription in original spoken language>",
  "command": "<Clean parsed command string>"
}`;

  const text = await callGemini([
    { inline_data: { mime_type: mimeType || 'audio/ogg; codecs=opus', data: audioBase64 } },
    { text: prompt }
  ]);

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Gemini audio response');
  return JSON.parse(match[0]);
}

function parseDate(dateStr) {
  if (!dateStr) return today();
  try {
    // Parse date string manually to avoid timezone rollback issues
    // Gemini returns formats like "30 August 2026" or "30 Aug 2026"
    const months = { january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12,
      jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const parts = dateStr.toLowerCase().replace(/,/g, '').split(/\s+/);
    if (parts.length >= 3) {
      let day, month, year;
      // "30 August 2026" or "August 30 2026"
      if (isNaN(parts[0])) { month = months[parts[0]]; day = parseInt(parts[1]); year = parseInt(parts[2]); }
      else { day = parseInt(parts[0]); month = months[parts[1]]; year = parseInt(parts[2]); }
      if (day && month && year) {
        return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      }
    }
    // Fallback: try native parse but adjust for IST (+5:30)
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const ist = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
      return ist.toISOString().split('T')[0];
    }
  } catch {}
  return today();
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

  // Maintenance
  const totalMaint = expArr.reduce((s, e) => s + Number(e.amount || 0), 0);
  const yearMaint = expArr.filter(e => e.entry_date?.startsWith(currentYear)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const todayMaint = expArr.filter(e => e.entry_date === todayDate).reduce((s, e) => s + Number(e.amount || 0), 0);
  const monthMaint = expArr.filter(e => e.entry_date?.startsWith(month)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const petrolTotal = expArr.filter(e => e.category === 'petrol_diesel').reduce((s, e) => s + Number(e.amount || 0), 0);
  const operatorTotal = expArr.filter(e => e.category === 'operator').reduce((s, e) => s + Number(e.amount || 0), 0);

  // PC Entries (Raw Material purchases)
  const yearRM = pcArr.filter(r => r.entry_date?.startsWith(currentYear)).reduce((s, r) => s + (Number(r.qty || 0) * Number(r.rate || 0)), 0);
  const yearExpense = yearMaint + yearRM;

  // Stock
  const pcStock = pcArr.reduce((s, r) => s + Number(r.qty || 0), 0);
  const soldStock = sellArr.reduce((s, e) => s + Number(e.quantity || 0), 0);
  const stockAdj = Number(settings?.[0]?.stock_adjustment || 0);
  const totalStock = pcStock - soldStock + stockAdj;

  // Sales
  const totalQty = soldStock;
  const totalPay = sellArr.reduce((s, e) => s + Number(e.payment || 0), 0);
  const monthQty = sellArr.filter(e => e.entry_date?.startsWith(month)).reduce((s, e) => s + Number(e.quantity || 0), 0);
  const todayQty = sellArr.filter(e => e.entry_date === todayDate).reduce((s, e) => s + Number(e.quantity || 0), 0);
  const yearTons = sellArr.filter(e => e.entry_date?.startsWith(currentYear)).reduce((s, e) => s + Number(e.quantity || 0), 0);

  // Money
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

      // Complete wizard & insert row into sells table
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
        return `❌ *Sell Entry Save Nahi Hua!*\nReason: ${savedRow?.message || 'Supabase RLS permission issue'}`;
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
  // e.g. "august report", "august month ki report", "is mahine ki report", "july report"
  const monthMap = {
    january: '01', jan: '01',
    february: '02', feb: '02',
    march: '03', mar: '03',
    april: '04', apr: '04',
    may: '05',
    june: '06', jun: '06',
    july: '07', jul: '07',
    august: '08', aug: '08',
    september: '09', sep: '09', sept: '09',
    october: '10', oct: '10',
    november: '11', nov: '11',
    december: '12', dec: '12'
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

  // ── ADD FUNDS / LOCK AMOUNT UPDATE (Exact website Add Funds modal) ───────
  // Examples: "add funds 5000", "add money 5000", "lock ammount add 1 rs", "add lock 5000"
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

    // Update settings: both total_money and lock_money (exact website Add Funds logic)
    const patchRes = await supabase('PATCH', 'settings?id=eq.1', {
      total_money: newTotal,
      lock_money: newLock
    });

    if (!Array.isArray(patchRes) || patchRes.length === 0 || patchRes.code || patchRes.error) {
      return `❌ *Database Permission Error!*\nSupabase RLS policy is blocking updates to settings.\n\nPlease run the SQL query in Supabase SQL Editor once to grant permissions.`;
    }

    // Extract optional note from message
    const note = text.replace(/add|funds?|lock|ammount|amount|money|paisa|rs|rupees|₹|jodo|karo|plus|\+|dalo|increase|subtract|minus|kam|hatao|nikal|deduct|[\d,.]+/gi, '').trim();

    // Log to audit_logs table (for website history tab)
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

    // Calculate Net Available Money (lock_money - yearExpense)
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

    // If single line contains 3+ numbers (e.g. sell add Mahesh 2 200 200 gadi 500) -> fast add!
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

    // Otherwise, START STEP-BY-STEP INTERACTIVE WIZARD!
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

    // Search query in sells table first by name or date
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

    // Search query in expenses table by name or date
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

  // ── FALLBACK — never ignore any message ───────────────────────────────────
  return `🤖 *Samajh nahi aaya!*\n"_${text.slice(0, 40)}_"\n\nYeh commands try karo:\n• *sell entry add* — Add sell bill\n• *report* — Full data\n• *petrol* — Petrol details\n• *stock* — Maal balance\n• *balance* — Cash balance\n• *delete [name]* — Delete entry\n\n📸 _PhonePe screenshot bhejo for auto-entry_`;
}

// ─── PERSISTENT SUPABASE AUTH STATE (Prevents Render Unlinking) ───────────────
async function useCombinedAuthState(folder) {
  const localAuth = await useMultiFileAuthState(folder);

  try {
    const res = await supabase('GET', 'bot_session?id=eq.creds');
    if (Array.isArray(res) && res.length > 0 && res[0]?.data) {
      const dbCreds = JSON.parse(JSON.stringify(res[0].data), BufferJSON.reviver);
      if (dbCreds && dbCreds.noiseKey) {
        Object.assign(localAuth.state.creds, dbCreds);
        console.log('🔄 Restored WhatsApp auth session from Supabase Database!');
      }
    }
  } catch (e) {
    console.log('ℹ️ Supabase auth session fallback to local auth');
  }

  const saveCreds = async () => {
    await localAuth.saveCreds();
    try {
      const payloadData = JSON.parse(JSON.stringify(localAuth.state.creds, BufferJSON.replacer));
      const res = await supabase('POST', 'bot_session', {
        id: 'creds',
        data: payloadData,
        updated_at: new Date().toISOString()
      });
      if (res?.code || res?.error) {
        await supabase('PATCH', 'bot_session?id=eq.creds', {
          data: payloadData,
          updated_at: new Date().toISOString()
        });
      }
    } catch {}
  };

  const originalGet = localAuth.state.keys.get;
  const originalSet = localAuth.state.keys.set;

  localAuth.state.keys.get = async (type, ids) => {
    const data = await originalGet(type, ids);
    const missingIds = ids.filter(id => !data[id]);
    if (missingIds.length > 0) {
      await Promise.all(missingIds.map(async id => {
        const keyId = `${type}-${id}`;
        try {
          const res = await supabase('GET', `bot_session?id=eq.${encodeURIComponent(keyId)}`);
          if (Array.isArray(res) && res.length > 0 && res[0]?.data) {
            const val = JSON.parse(JSON.stringify(res[0].data), BufferJSON.reviver);
            if (type === 'app-state-sync-key' && val && proto) {
              data[id] = proto.Message.AppStateSyncKeyData.fromObject(val);
            } else {
              data[id] = val;
            }
          }
        } catch {}
      }));
    }
    return data;
  };

  localAuth.state.keys.set = async (data) => {
    await originalSet(data);
    const tasks = [];
    for (const type in data) {
      for (const id in data[type]) {
        const value = data[type][id];
        const keyId = `${type}-${id}`;
        if (value) {
          const payloadData = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
          tasks.push(
            supabase('POST', 'bot_session', {
              id: keyId,
              data: payloadData,
              updated_at: new Date().toISOString()
            }).catch(() =>
              supabase('PATCH', `bot_session?id=eq.${encodeURIComponent(keyId)}`, {
                data: payloadData,
                updated_at: new Date().toISOString()
              })
            )
          );
        } else {
          tasks.push(supabase('DELETE', `bot_session?id=eq.${encodeURIComponent(keyId)}`));
        }
      }
    }
    await Promise.all(tasks).catch(() => {});
  };

  return { state: localAuth.state, saveCreds };
}

// ─── FAST IN-MEMORY GROUP CACHE (Eliminates Network Delays) ────────────────
const groupSubjectCache = new Map();

async function isTargetGroup(sock, jid) {
  if (!jid) return false;
  if (!jid.endsWith('@g.us')) return true; // Allow direct 1-on-1 chat to bot

  function matchesTargetGroup(subj) {
    if (!subj) return false;
    const s = subj.trim().toLowerCase();
    return s.includes('total raw material') || s.includes('total-raw-material') || s === TARGET_GROUP.trim().toLowerCase();
  }

  if (groupSubjectCache.has(jid)) {
    return matchesTargetGroup(groupSubjectCache.get(jid));
  }
  const meta = await sock.groupMetadata(jid).catch(() => null);
  if (meta?.subject) {
    groupSubjectCache.set(jid, meta.subject);
    return matchesTargetGroup(meta.subject);
  }
  try {
    const groups = await sock.groupFetchAllParticipating();
    for (const gId in groups) {
      if (groups[gId]?.subject) {
        groupSubjectCache.set(gId, groups[gId].subject);
        if (gId === jid) {
          return matchesTargetGroup(groups[gId].subject);
        }
      }
    }
  } catch {}
  return false;
}

let currentSock = null;

// ─── MAIN BOT ──────────────────────────────────────────────────────────────
async function startBot() {
  if (currentSock) {
    try { currentSock.ev.removeAllListeners(); currentSock.ws?.close(); } catch {}
    currentSock = null;
  }

  const { state, saveCreds } = await useCombinedAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    markOnlineOnConnect: true,
    syncFullHistory: false,
    keepAliveIntervalMs: 10000, // Keep WebSocket connection hot every 10s
    connectTimeoutMs: 60000,
    retryRequestDelayMs: 250
  });
  currentSock = sock;

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Connection updates
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && !sock.authState.creds.registered && !currentPairingCode) {
      try {
        const cleanNumber = PHONE_NUMBER.replace(/[^0-9]/g, '');
        const code = await sock.requestPairingCode(cleanNumber);
        currentPairingCode = code;
        botStatus = `Pairing Code: ${code}`;
        console.log('\n==================================================');
        console.log(`🔑 YOUR WHATSAPP PAIRING CODE IS: ${code}`);
        console.log(`📱 Phone Number: +${cleanNumber}`);
        console.log('==================================================');
        console.log('Open WhatsApp → Settings → Linked Devices → Link with phone number instead → Enter code!\n');
      } catch (e) {
        console.error('Failed to request pairing code:', e?.message || e);
      }
    }
    if (connection === 'open') {
      botStatus = 'LIVE & READY';
      currentPairingCode = null;
      console.log('\n✅ WhatsApp Bot is LIVE and ready!');
      console.log(`✅ Listening to group: "${TARGET_GROUP}"`);
      console.log('✅ Forward any PhonePe screenshot to the group to add expenses.');
      console.log('✅ Send any Audio Voice Note to auto-transcribe and process commands!\n');

      // Pre-fetch participating groups to cache target group JID instantly
      try {
        const groups = await sock.groupFetchAllParticipating();
        for (const gId in groups) {
          if (groups[gId]?.subject) {
            groupSubjectCache.set(gId, groups[gId].subject);
          }
        }
        console.log(`✅ Pre-cached ${groupSubjectCache.size} WhatsApp groups!`);
      } catch (e) {
        console.error('Group pre-fetch error:', e?.message || e);
      }

      // ── 8:00 PM AUTOMATIC DAILY CLOSING BULLETIN SCHEDULE ──────────────────
      if (!global.bulletinInterval) {
        let lastBulletinDate = '';
        global.bulletinInterval = setInterval(async () => {
          try {
            const now = new Date();
            const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
            const hours = ist.getUTCHours();
            const minutes = ist.getUTCMinutes();
            const dateStr = ist.toISOString().split('T')[0];

            // Trigger at 8:00 PM IST (20:00 IST)
            if (hours === 20 && minutes === 0 && lastBulletinDate !== dateStr) {
              lastBulletinDate = dateStr;
              console.log('📢 Triggering 8:00 PM Daily Closing Bulletin...');
              if (currentSock) {
                const groups = await currentSock.groupFetchAllParticipating().catch(() => ({}));
                const group = Object.values(groups).find(g => g.subject === TARGET_GROUP);
                if (group?.id) {
                  const rpt = await generateReport();
                  const dateFmt = dateStr.split('-').reverse().join('-');
                  const bulletinHeader = `📢 *DAILY EVENING CLOSING BULLETIN (8:00 PM)*\n📅 Date: *${dateFmt}*\n━━━━━━━━━━━━━━━━━━━━\n`;
                  await currentSock.sendMessage(group.id, { text: bulletinHeader + rpt });
                  console.log('✅ Daily 8:00 PM Bulletin posted to WhatsApp group!');
                }
              }
            }
          } catch (e) {
            console.error('Bulletin timer error:', e?.message || e);
          }
        }, 45000);
      }
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      botStatus = `Disconnected (${code})`;
      console.log('⚠️ Connection closed. Code:', code, '| Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(startBot, code === 515 ? 1000 : 3000);
      } else {
        console.log('❌ Logged out. Delete baileys_auth folder and restart.');
      }
    }
  });

  // Messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      try {
        if (!msg.key.remoteJid) continue;

        // Get chat info
        const jid = msg.key.remoteJid;
        // Check if message is from target group or direct chat (0.0001ms)
        if (!(await isTargetGroup(sock, jid))) continue;

        const msgContent = msg.message;
        if (!msgContent) continue;

        // Skip messages that are bot's own replies (to prevent loops)
        const textContent = msgContent.conversation || msgContent.extendedTextMessage?.text || '';
        const BOT_REPLY_PREFIXES = [
          '⏳', '✅', '❌', '⚠️', // status messages
          '📊', '💰', '⛽', '👷', '🗑️', '🤖', '💵', '📢', '🎙️', // report & voice messages
          '📦 *STOCK', '🔒 *Lock', '🛒 *SELL', '📋 *DATA', '📄 *PDF', '📝', '👤', '⚖️', '💳', '🚛', // wizard & command replies
          '📅', // date lines in reports
        ];
        if (textContent && BOT_REPLY_PREFIXES.some(p => textContent.startsWith(p))) {
          continue; // skip own bot replies
        }

        console.log(`📨 Message in "${TARGET_GROUP}" | fromMe: ${msg.key.fromMe} | Type: ${Object.keys(msgContent).join(', ')}`);

        // ── IMAGE: PhonePe Screenshot ─────────────────────────────────────
        const imgMsg = msgContent.imageMessage || msgContent.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        const actualImg = msgContent.imageMessage;

        if (actualImg) {
          console.log('🖼️ Image detected! Processing...');
          await sock.sendMessage(jid, { text: '⏳ Screenshot padh raha hoon...' });

          // Download image
          const { downloadMediaMessage } = require('@whiskeysockets/baileys');
          const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
          const base64 = buffer.toString('base64');
          const mime = actualImg.mimetype || 'image/jpeg';

          let data;
          try {
            data = await processPhonePeImage(base64, mime);
          } catch (e) {
            console.error('Gemini error:', e.message);
            await sock.sendMessage(jid, { text: '❌ Screenshot read nahi hua. Clear image bhejiye.' });
            continue;
          }

          console.log('📋 Gemini extracted:', JSON.stringify(data));

          if (!data.amount) {
            await sock.sendMessage(jid, { text: '❌ Amount nahi mila. Check karein.' });
            continue;
          }

          // Duplicate check
          if (data.transaction_id) {
            try {
              const dup = await supabase('GET', `expenses?phonepay_txn_id=eq.${data.transaction_id}&select=id,name,amount`);
              if (Array.isArray(dup) && dup.length > 0) {
                await sock.sendMessage(jid, { text: `⚠️ *Duplicate Entry Blocked!*\nYeh transaction pehle se add hai:\n${dup[0].name} — ${fmtINR(dup[0].amount)}` });
                continue;
              }
            } catch {}
          }

          const category = detectCategory(data.message || '', data.paid_to_name || '');
          const catLabel = category === 'petrol_diesel' ? '⛽ Petrol/Diesel' : category === 'operator' ? '👷 Operator' : '📦 Other';
          const entryName = [data.message, data.paid_to_name].filter(Boolean).join(' — ');
          const entryDate = parseDate(data.date);

          const serialCheck = await supabase('GET', `expenses?category=eq.${category}&select=serial_number&order=serial_number.desc&limit=1`);
          const newSerial = (Number(serialCheck?.[0]?.serial_number) || 0) + 1;

          const inserted = await supabase('POST', 'expenses', {
            entry_date: entryDate,
            serial_number: newSerial,
            name: entryName,
            amount: data.amount,
            category,
            phonepay_txn_id: data.transaction_id || null
          });

          console.log('📥 Supabase POST response:', JSON.stringify(inserted));

          const savedRow = Array.isArray(inserted) ? inserted[0] : inserted;
          if (!savedRow || savedRow.code || savedRow.error || !savedRow.id) {
            console.error('❌ Insert failed in Supabase:', JSON.stringify(inserted));
            await sock.sendMessage(jid, { text: `❌ Database mein save nahi hua.\nReason: ${savedRow?.message || 'RLS permission issue. Run the SQL script in Supabase.'}` });
            continue;
          }

          lastInserted = savedRow;

          const dateFmt = entryDate.split('-').reverse().join('-');
          await sock.sendMessage(jid, {
            text: `✅ *Entry Add Ho Gayi!*\n━━━━━━━━━━━━━━━━━━━━\n📅 Date: *${dateFmt}*\n💰 Amount: *${fmtINR(data.amount)}*\n📝 Name: *${entryName}*\n🏷️ Category: *${catLabel}*\n🔖 Txn ID: ${data.transaction_id || 'N/A'}\n━━━━━━━━━━━━━━━━━━━━\n_Galat tha? "delete last" likho_`
          });

        // ── TEXT COMMAND ──────────────────────────────────────────────────
        } else {
          const text = msgContent.conversation || msgContent.extendedTextMessage?.text || '';
          if (!text) continue;
          const sender = msg.key.participant || msg.key.remoteJid || 'default';
          console.log(`💬 Processing command: "${text}" from ${sender}`);
          try {
            const reply = await handleText(text, sender);
            if (reply) {
              console.log(`📤 Sending reply (${reply.length} chars) to ${jid}...`);
              const sendRes = await sock.sendMessage(jid, { text: reply });
              if (sendRes) console.log('✅ Reply sent successfully to WhatsApp!');
            }
          } catch (cmdErr) {
            console.error('❌ Command execution error:', cmdErr?.message || cmdErr);
            await sock.sendMessage(jid, { text: `❌ Command process karne mein error aaya: ${cmdErr?.message || 'Unknown error'}` }).catch(() => {});
          }
        }

      } catch (err) {
        console.error('❌ Error:', err?.message || err);
      }
    }
  });
}

console.log('🚀 Starting WhatsApp Bot for Total Raw Material...');
console.log('   No Chrome needed — connecting via WebSocket!\n');
startBot();
