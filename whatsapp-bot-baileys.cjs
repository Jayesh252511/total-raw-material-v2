/**
 * WhatsApp Bot — Total Raw Material (Baileys Version)
 * Web Server with Pairing Code & QR Image for 24/7 Cloud Hosting
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcodeTerm = require('qrcode-terminal');
const QRCode = require('qrcode');
const pino = require('pino');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env if present
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const k = parts[0].trim();
      const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  });
}

// ─── CONFIG ────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const SUPABASE_URL   = process.env.SUPABASE_URL || 'ujgepdkbproyrexmtapn.supabase.co';
const SUPABASE_KEY   = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZ2VwZGticHJveXJleG10YXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTQ4MzIsImV4cCI6MjA5MzQ3MDgzMn0.COpbpBVao65qzGsK0heH4ente6fcMAM0R_g3kujqI7I';
const TARGET_GROUP   = 'Bot total raw material';
const AUTH_FOLDER    = './baileys_auth';

const EXT_URL = 'bdqskcyjzeshsjwacbvr.supabase.co';
const EXT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXNrY3lqemVzaHNqd2FjYnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODMwNTAsImV4cCI6MjA5MzQ1OTA1MH0.DlCOhjBW3PTnPmzYNPrUgrVcPatfJgdX-uI9bP3xm0s';

// ─── STATE ─────────────────────────────────────────────────────────────────
let latestQRDataURL = null;
let latestPairingCode = null;
let isBotConnected = false;
let currentSock = null;

// ─── HTTP SERVER (PAIRING CODE & QR DISPLAY WEBPAGE) ───────────────────────
const PORT = process.env.PORT || 3000;
require('http').createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  
  // Endpoint to reset pairing code / QR
  if (urlObj.pathname === '/reset') {
    latestPairingCode = null;
    latestQRDataURL = null;
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  // Endpoint to request pairing code
  if (urlObj.pathname === '/pair' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const params = new URLSearchParams(body);
        let phone = (params.get('phone') || '').replace(/[^0-9]/g, '');
        if (phone && currentSock && !isBotConnected) {
          console.log(`📱 Requesting pairing code for phone: ${phone}`);
          latestPairingCode = await currentSock.requestPairingCode(phone);
          console.log(`🔑 Pairing Code: ${latestPairingCode}`);
        }
      } catch (err) {
        console.error('Pairing code error:', err.message);
      }
      res.writeHead(302, { Location: '/' });
      res.end();
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  if (isBotConnected) {
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>WhatsApp Bot Status</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;background:#0d1117;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;} .card{background:#161b22;padding:30px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.5);text-align:center;border:1px solid #30363d;} .badge{background:#238636;color:#fff;padding:8px 18px;border-radius:20px;font-weight:bold;display:inline-block;margin-bottom:15px;}</style></head>
      <body>
        <div class="card">
          <div class="badge">🟢 ONLINE & CONNECTED</div>
          <h2>WhatsApp Bot — Total Raw Material</h2>
          <p style="color:#8b949e">Bot is active and running 24/7 in the cloud!</p>
        </div>
      </body>
      </html>
    `);
  } else {
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Link WhatsApp Bot</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;background:#0d1117;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;} .card{background:#161b22;padding:25px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.5);text-align:center;border:1px solid #30363d;max-width:380px;width:100%;} img{border-radius:12px;background:#fff;padding:12px;margin:15px 0;width:240px;height:240px;} input{padding:10px;border-radius:8px;border:1px solid #30363d;background:#0d1117;color:#fff;font-size:16px;width:80%;margin-bottom:10px;text-align:center;} button{padding:10px 20px;border-radius:8px;border:none;background:#238636;color:#fff;font-weight:bold;font-size:15px;cursor:pointer;} .code-box{background:#0d1117;border:2px dashed #238636;padding:15px;border-radius:12px;font-size:28px;font-weight:bold;letter-spacing:4px;color:#3fb950;margin:15px 0;}</style></head>
      <body>
        <div class="card">
          <h2 style="margin:0 0 10px 0">📱 Link WhatsApp Bot</h2>
          
          ${latestPairingCode ? `
            <p style="color:#8b949e;font-size:14px;">WhatsApp → Linked Devices → Link with phone number instead</p>
            <div class="code-box">${latestPairingCode}</div>
            <p style="color:#58a6ff;font-size:12px;">Type this 8-digit code in WhatsApp!</p>
            <p style="margin-top:15px;"><a href="/reset" style="color:#f85149;font-size:13px;text-decoration:none;">❌ Wrong Number? Click here to try again</a></p>
          ` : `
            <form action="/pair" method="POST" style="margin-bottom:20px;">
              <p style="color:#8b949e;font-size:13px;margin-bottom:8px;">Enter your phone number with country code (e.g. 919876543210):</p>
              <input type="text" name="phone" placeholder="919876543210" required />
              <br/>
              <button type="submit">Get 8-Digit Code</button>
            </form>
            <hr style="border:0;border-top:1px solid #30363d;margin:20px 0;"/>
            <p style="color:#8b949e;font-size:13px;">Or scan QR image below:</p>
            ${latestQRDataURL ? `<img src="${latestQRDataURL}" alt="Scan QR Code" />` : `<p style="color:#8b949e">Loading QR...</p>`}
          `}
        </div>
      </body>
      </html>
    `);
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Web & Pairing Server listening on port ${PORT}`);
});

// Self-pinger to prevent Render free tier from sleeping
setInterval(() => {
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) {
    https.get(renderUrl).on('error', () => {});
  }
}, 4 * 60 * 1000);

// ─── HELPERS ───────────────────────────────────────────────────────────────
function fmtINR(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);
}
function today() { return new Date().toISOString().split('T')[0]; }
function currentMonth() { return today().slice(0, 7); }

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
        ...(method === 'POST' ? { 'Prefer': 'return=representation' } : {}),
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

function parseDate(dateStr) {
  if (!dateStr) return today();
  try {
    const months = { january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12,
      jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const parts = dateStr.toLowerCase().replace(/,/g, '').split(/\s+/);
    if (parts.length >= 3) {
      let day, month, year;
      if (isNaN(parts[0])) { month = months[parts[0]]; day = parseInt(parts[1]); year = parseInt(parts[2]); }
      else { day = parseInt(parts[0]); month = months[parts[1]]; year = parseInt(parts[2]); }
      if (day && month && year) {
        return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      }
    }
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
    supabase('GET', 'settings?select=total_money,lock_money,sell_money&id=eq.1'),
    fetchExt('entries?select=qty,rate,entry_date')
  ]);
  const todayDate = today(); const month = currentMonth();

  const expArr = Array.isArray(expenses) ? expenses : [];
  const sellArr = Array.isArray(sells) ? sells : [];
  const pcArr = Array.isArray(pcEntries) ? pcEntries : [];

  const totalMaint = expArr.reduce((s, e) => s + Number(e.amount || 0), 0);
  const yearMaint = expArr.filter(e => e.entry_date?.startsWith(currentYear)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const todayMaint = expArr.filter(e => e.entry_date === todayDate).reduce((s, e) => s + Number(e.amount || 0), 0);
  const monthMaint = expArr.filter(e => e.entry_date?.startsWith(month)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const petrolTotal = expArr.filter(e => e.category === 'petrol_diesel').reduce((s, e) => s + Number(e.amount || 0), 0);
  const operatorTotal = expArr.filter(e => e.category === 'operator').reduce((s, e) => s + Number(e.amount || 0), 0);

  const yearRM = pcArr.filter(r => r.entry_date?.startsWith(currentYear)).reduce((s, r) => s + (Number(r.qty || 0) * Number(r.rate || 0)), 0);
  const yearExpense = yearMaint + yearRM;

  const totalQty = sellArr.reduce((s, e) => s + Number(e.quantity || 0), 0);
  const totalPay = sellArr.reduce((s, e) => s + Number(e.payment || 0), 0);
  const monthQty = sellArr.filter(e => e.entry_date?.startsWith(month)).reduce((s, e) => s + Number(e.quantity || 0), 0);
  const todayQty = sellArr.filter(e => e.entry_date === todayDate).reduce((s, e) => s + Number(e.quantity || 0), 0);

  const lockMoney = Number(settings?.[0]?.lock_money || 0);
  const totalMoney = lockMoney - yearExpense; // Exact Vercel formula
  const dateLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return `📊 *TOTAL RAW MATERIAL REPORT*
📅 ${dateLabel}
━━━━━━━━━━━━━━━━━━━━
💰 *CASH BALANCE (Total Money)*
Haath mein paisa: *${fmtINR(totalMoney)}*
Lock Amount: *${fmtINR(lockMoney)}*

━━━━━━━━━━━━━━━━━━━━
📦 *SALES (Bikri)*
• Total Qty: *${totalQty.toFixed(3)} tons*
• Total Payment: *${fmtINR(totalPay)}*
• Is Mahine ki Qty: *${monthQty.toFixed(3)} tons*
• Aaj ki Qty: *${todayQty.toFixed(3)} tons*

━━━━━━━━━━━━━━━━━━━━
🔧 *MAINTENANCE (Kharcha)*
• Total Saal ka: *${fmtINR(totalMaint)}*
• Is Mahine ka: *${fmtINR(monthMaint)}*
• Aaj ka: *${fmtINR(todayMaint)}*
• Petrol/Diesel: *${fmtINR(petrolTotal)}*
• Operator Majuri: *${fmtINR(operatorTotal)}*

━━━━━━━━━━━━━━━━━━━━
_"petrol report" — Petrol details_
_"operator report" — Majuri details_
_"balance" — Cash balance only_`;
}

async function generatePetrolReport() {
  const expenses = await supabase('GET', 'expenses?select=name,amount,entry_date&category=eq.petrol_diesel&order=entry_date.desc&limit=10');
  const expArr = Array.isArray(expenses) ? expenses : [];
  const total = expArr.reduce((s, e) => s + Number(e.amount || 0), 0);
  const lines = expArr.map(e => `• ${e.entry_date?.slice(5).split('-').reverse().join('-')} — ${e.name} — *${fmtINR(e.amount)}*`).join('\n');
  return `⛽ *PETROL / DIESEL REPORT* (Last 10)\n━━━━━━━━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━━━━━━━━\nTotal: *${fmtINR(total)}*`;
}

async function generateOperatorReport() {
  const expenses = await supabase('GET', 'expenses?select=name,amount,entry_date&category=eq.operator&order=entry_date.desc&limit=10');
  const expArr = Array.isArray(expenses) ? expenses : [];
  const total = expArr.reduce((s, e) => s + Number(e.amount || 0), 0);
  const lines = expArr.map(e => `• ${e.entry_date?.slice(5).split('-').reverse().join('-')} — ${e.name} — *${fmtINR(e.amount)}*`).join('\n');
  return `👷 *OPERATOR / MAJURI REPORT* (Last 10)\n━━━━━━━━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━━━━━━━━\nTotal: *${fmtINR(total)}*`;
}

// ─── TEXT COMMAND HANDLER ──────────────────────────────────────────────────
let lastInserted = null;

async function handleText(text) {
  const t = text.toLowerCase().trim();
  if (/petrol|diesel/.test(t) && /report|dikhao|batao/.test(t)) return generatePetrolReport();
  if (/operator|majuri/.test(t) && /report|dikhao|batao/.test(t)) return generateOperatorReport();
  if (/report|dikhao|batao|bata|kitna|sari|summary|status|total|aaj|poora|pura/.test(t)) return generateReport();
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
  if (/delete|galat|undo|hatao|nikal/.test(t)) {
    if (!lastInserted) return '❌ Koi recent entry nahi mili.';
    await supabase('DELETE', `expenses?id=eq.${lastInserted.id}`);
    const e = lastInserted; lastInserted = null;
    return `🗑️ *Deleted:*\n${e.name} — ${fmtINR(e.amount)}\n(${e.entry_date})`;
  }
  if (/help|commands/.test(t)) {
    return `🤖 *BOT COMMANDS*\n━━━━━━━━━━━━━━━━━━━━\n📸 *Photo bhejo* — PhonePe screenshot\n📊 *report* — Full report\n⛽ *petrol report* — Petrol details\n👷 *operator report* — Majuri details\n💰 *balance* — Cash balance\n🗑️ *delete last* — Last entry hatao\n━━━━━━━━━━━━━━━━━━━━`;
  }
  return null;
}

// ─── MAIN BOT ──────────────────────────────────────────────────────────────
async function startBot() {
  if (currentSock) {
    try { currentSock.ev.removeAllListeners(); currentSock.ws?.close(); } catch {}
    currentSock = null;
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    markOnlineOnConnect: false,
    syncFullHistory: false
  });
  currentSock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 New QR code generated. Visit your web URL to scan!\n');
      qrcodeTerm.generate(qr, { small: true });
      try {
        latestQRDataURL = await QRCode.toDataURL(qr);
      } catch (err) {
        console.error('QR image render error:', err);
      }
    }
    if (connection === 'open') {
      isBotConnected = true;
      latestQRDataURL = null;
      latestPairingCode = null;
      console.log('\n✅ WhatsApp Bot is LIVE and ready!');
      console.log(`✅ Listening to group: "${TARGET_GROUP}"`);
      console.log('✅ Forward any PhonePe screenshot to the group to add expenses.\n');
    }
    if (connection === 'close') {
      isBotConnected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log('⚠️ Connection closed. Code:', code, '| Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(startBot, code === 515 ? 1000 : 3000);
      } else {
        console.log('❌ Logged out. Delete baileys_auth folder and restart.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      try {
        if (!msg.key.remoteJid) continue;

        const jid = msg.key.remoteJid;
        const isGroup = jid.endsWith('@g.us');
        let isTargetGroup = false;

        if (isGroup) {
          const groupMeta = await sock.groupMetadata(jid).catch(() => null);
          if (groupMeta && groupMeta.subject) {
            if (groupMeta.subject.toLowerCase().includes('total raw material')) {
              isTargetGroup = true;
            }
          } else {
            // Allow if metadata check temporary fails
            isTargetGroup = true;
          }
        } else {
          // Allow Direct Messages (DMs) to the bot as well
          isTargetGroup = true;
        }

        if (!isTargetGroup) continue;

        const msgContent = msg.message;
        if (!msgContent) continue;

        const textContent = msgContent.conversation || msgContent.extendedTextMessage?.text || '';
        const botPrefixes = ['⏳ Screenshot', '✅ *Entry', '❌', '⚠️ *Duplicate', '📊 *TOTAL', '💰 *Cash', '⛽ *PETROL', '👷 *OPERATOR', '🗑️ *Deleted', '🤖 *BOT'];
        if (textContent && botPrefixes.some(p => textContent.startsWith(p))) {
          continue;
        }

        console.log(`📨 Message in "${TARGET_GROUP}" | fromMe: ${msg.key.fromMe} | Type: ${Object.keys(msgContent).join(', ')}`);

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
            console.error('Gemini error:', e.message);
            await sock.sendMessage(jid, { text: '❌ Screenshot read nahi hua. Clear image bhejiye.' });
            continue;
          }

          console.log('📋 Gemini extracted:', JSON.stringify(data));

          if (!data.amount) {
            await sock.sendMessage(jid, { text: '❌ Amount nahi mila. Check karein.' });
            continue;
          }

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

        } else {
          const text = msgContent.conversation || msgContent.extendedTextMessage?.text || '';
          if (!text) continue;
          console.log(`💬 Text: "${text}"`);
          const reply = await handleText(text);
          if (reply) await sock.sendMessage(jid, { text: reply });
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
