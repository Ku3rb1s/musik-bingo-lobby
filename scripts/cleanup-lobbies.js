// Löscht Lobbys, in denen seit 24 Stunden nichts mehr passiert ist.
// Läuft täglich als GitHub Action (.github/workflows/cleanup-lobbies.yml).
// Zugang: Schlüssel des Firebase-Kontos „lobby-cleanup“ (nur Datenbank-Rechte) im Secret FIREBASE_CLEANUP_KEY.
// Ohne Fremdpakete – nur Node-Bordmittel (Node 18+).
'use strict';
const crypto = require('crypto');

const DB = 'https://musik-bingo-ku3rb1s-default-rtdb.europe-west1.firebasedatabase.app';
const STALE_MS = 24 * 3600 * 1000;     // gleiche Grenze wie in der App und in database.rules.json
const DRY = process.argv.includes('--dry-run');

const b64url = x => Buffer.from(x).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

// Zugriffstoken per signiertem JWT (Service-Account-Ablauf von Google)
async function accessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const sig = crypto.createSign('RSA-SHA256').update(`${head}.${claim}`).sign(key.private_key);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${b64url(sig)}` }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Anmeldung fehlgeschlagen: ' + (j.error_description || j.error || r.status));
  return j.access_token;
}

async function db(token, path, opts = {}) {
  const r = await fetch(`${DB}/${path}.json${opts.query || ''}`, { method: opts.method || 'GET', headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${path}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

(async () => {
  const raw = process.env.FIREBASE_CLEANUP_KEY;
  if (!raw) throw new Error('Secret FIREBASE_CLEANUP_KEY fehlt');
  const token = await accessToken(JSON.parse(raw));

  // Nur die Lobby-Codes holen (shallow), dann je Lobby das Lebenszeichen
  const codes = Object.keys(await db(token, 'lobbies', { query: '?shallow=true' }) || {});
  let removed = 0;
  for (const code of codes) {
    const act = await db(token, `lobbies/${code}/act`) ?? await db(token, `lobbies/${code}/created`) ?? 0;
    const age = Date.now() - act;
    if (age <= STALE_MS) continue;
    console.log(`${DRY ? '[Probe] würde löschen' : 'Lösche'}: ${code} (seit ${Math.round(age / 3600000)} h inaktiv)`);
    if (!DRY) await db(token, `lobbies/${code}`, { method: 'DELETE' });
    removed++;
  }
  console.log(`Fertig: ${codes.length} Lobbys geprüft, ${removed} ${DRY ? 'würden gelöscht' : 'gelöscht'}.`);
})().catch(e => { console.error('Fehler:', e.message); process.exit(1); });
