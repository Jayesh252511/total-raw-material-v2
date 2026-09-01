const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'ujgepdkbproyrexmtapn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZ2VwZGticHJveXJleG10YXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTQ4MzIsImV4cCI6MjA5MzQ3MDgzMn0.COpbpBVao65qzGsK0heH4ente6fcMAM0R_g3kujqI7I';

function supabase(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/' + urlPath,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
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

async function testSync() {
  const mockFiles = { 'creds.json': '{"registered":true}', 'keys.json': '{}' };
  const res = await supabase('POST', 'bot_session', { id: 'session_snapshot', data: mockFiles });
  console.log('✅ SUPABASE SESSION SAVE RESULT:', res?.[0]?.id || res);
  const fetched = await supabase('GET', 'bot_session?id=eq.session_snapshot');
  console.log('✅ SUPABASE SESSION FETCH RESULT:', fetched?.[0]?.data);
}
testSync();
