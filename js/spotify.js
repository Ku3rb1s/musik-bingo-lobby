// Musik-Bingo – Spotify: Anmeldung, Playlists/CSV, Wiedergabe (Player)
'use strict';

/* ---------------- Spotify Auth (PKCE) ---------------- */
function randStr(n) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(n)), b => chars[b % chars.length]).join('');
}
async function pkceChallenge(v) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function login(cid = state.clientId || DEFAULT_CLIENT_ID) {
  if (!cid) return toast(tx('Bitte zuerst die Client ID eintragen'));
  state.clientId = cid;
  if (cid === DEFAULT_CLIENT_ID) LS.del('clientId'); else LS.set('clientId', cid);
  const verifier = randStr(64); LS.set('verifier', verifier);
  const p = new URLSearchParams({
    client_id: cid, response_type: 'code', redirect_uri: REDIRECT,
    code_challenge_method: 'S256', code_challenge: await pkceChallenge(verifier), scope: SCOPES,
  });
  location.href = 'https://accounts.spotify.com/authorize?' + p;
}
function setTok(j) {
  state.tok = { access_token: j.access_token, refresh_token: j.refresh_token || state.tok?.refresh_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  LS.set('tok', state.tok);
}
async function handleCallback() {
  const q = new URLSearchParams(location.search);
  if (!q.has('code') && !q.has('error')) return false;
  history.replaceState(null, '', REDIRECT);
  if (q.get('error')) { toast(tx('Spotify-Login abgebrochen: {e}', { e: q.get('error') })); return false; }
  const r = await fetch(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: REDIRECT, client_id: state.clientId, code_verifier: LS.get('verifier', '') }),
  });
  const j = await r.json();
  if (!r.ok) { toast(tx('Login fehlgeschlagen: {e}', { e: j.error_description || j.error }), 6000); return false; }
  setTok(j); LS.del('verifier');
  await loadMe();
  if (!state.tok) return false;
  toast(tx('Mit Spotify verbunden ✓'));
  return true;
}
async function loadMe() {
  try {
    const me = await api('/me');
    state.me = { name: me.display_name || me.id, img: me.images?.[0]?.url || '', product: me.product };
    LS.set('me', state.me); renderStatus();
  } catch (e) {
    // Im Spotify-Entwicklermodus bekommen nicht freigeschaltete Konten hier 403
    if (e.status === 403) {
      state.tok = null; LS.del('tok'); renderAll(); renderAccount();
      toast(tx('Dein Spotify-Konto ist für Musik-Bingo noch nicht freigeschaltet. Bitte den Ersteller, dich hinzuzufügen.'), 10000);
    }
  }
}
async function logout() {
  if (!await ask(tx('Von Spotify abmelden?\nDeine Songs bleiben gespeichert.'), { ok: tx('Abmelden'), danger: true })) return;
  await Player.reset();
  try { Player.sdk?.disconnect(); } catch {}
  Player.sdk = null; Player.sdkReady = null; Player.deviceId = null;
  state.tok = null; state.me = null; LS.del('tok'); LS.del('me');
  myPlaylists = null;
  renderAll(); renderAccount();
  toast(tx('Abgemeldet'));
}
let refreshing = null;
async function ensureToken() {
  if (!state.tok) throw new Error(tx('Nicht mit Spotify verbunden'));
  if (Date.now() < state.tok.exp) return;
  refreshing ??= (async () => {
    const r = await fetch(TOKEN_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: state.tok.refresh_token, client_id: state.clientId }),
    });
    const j = await r.json();
    if (!r.ok) { state.tok = null; LS.del('tok'); renderStatus(); throw new Error(tx('Sitzung abgelaufen – bitte neu verbinden')); }
    setTok(j);
  })().finally(() => refreshing = null);
  return refreshing;
}
async function api(path, opts = {}, retry = true) {
  await ensureToken();
  const url = path.startsWith('http') ? path : 'https://api.spotify.com/v1' + path;
  const r = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + state.tok.access_token, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) } });
  if (r.status === 401 && retry) { state.tok.exp = 0; return api(path, opts, false); }
  if (r.status === 429 && retry) { await sleep((+r.headers.get('Retry-After') || 2) * 1000); return api(path, opts, false); }
  if (!r.ok) {
    let m = 'HTTP ' + r.status;
    try { const j = await r.json(); m = j.error?.message || j.error_description || m; } catch {}
    const e = new Error(m); e.status = r.status; throw e;
  }
  const txt = await r.text();
  try { return txt ? JSON.parse(txt) : null; } catch { return null; }
}

/* ---------------- Songs & Playlists ---------------- */
// Aus Spotifys Bildliste das kleinste nehmen, das für min Pixel (Breite) noch scharf ist – spart Datenvolumen und
// Rechenzeit beim Anzeigen (Listen mit Dutzenden Covern). Ohne Größenangabe: das erste (größte).
function pickImg(images, min) {
  const list = (images || []).filter(i => i?.url);
  if (!list.length) return '';
  if (list.some(i => !i.width)) return list[0].url;
  const ok = list.filter(i => i.width >= min).sort((a, b) => a.width - b.width);
  return (ok[0] || list.reduce((a, b) => (b.width > a.width ? b : a))).url;
}
function normTrack(t) {
  const date = t.album?.release_date || '', names = (t.artists || []).map(a => a.name);
  return {
    id: t.id, uri: t.uri, title: t.name,
    artists: names.join(', '),
    ...(names[0]?.includes(',') ? { a1: names[0] } : {}),   // Hauptkünstler mit Komma im Namen, z. B. „Earth, Wind & Fire“
    album: t.album?.name || '', date, year: parseInt(date) || null,
    cover: t.album?.images?.[0]?.url || '', thumb: pickImg(t.album?.images, 120), duration: t.duration_ms || 0,
  };
}
function saveLib() {
  const ids = new Set(state.tracks.map(t => t.id));
  state.played = state.played.filter(id => ids.has(id));
  LS.set('tracks', state.tracks); LS.set('sources', state.sources); LS.set('played', state.played);
}
// Jeder Song merkt sich, aus welchen Playlists er stammt (srcs) – so lassen sich Playlists einzeln entfernen.
function mergeTracks(list, src) {
  const byId = new Map(state.tracks.map(t => [t.id, t]));
  let added = 0;
  for (const t of list) {
    if (!t.id) continue;
    const ex = byId.get(t.id);
    if (ex) { ex.srcs = [...new Set([...(ex.srcs || []), src])]; if (t.a1) ex.a1 = t.a1; }   // Playlist aktualisiert → Hauptkünstler nachtragen
    else { t.srcs = [src]; state.tracks.push(t); byId.set(t.id, t); added++; }
  }
  saveLib(); renderAll(); mbKick();   // Originaljahre der neuen Songs im Hintergrund nachschlagen
  return added;
}
function upsertSource(s) {
  const i = state.sources.findIndex(x => x.id === s.id);
  if (i >= 0) state.sources[i] = { ...state.sources[i], ...s }; else state.sources.push(s);
  saveLib();
}
function removeSource(id) {
  state.tracks = state.tracks.filter(t => {
    const s = t.srcs || [];
    if (id === '_legacy') return s.length > 0;
    if (!s.includes(id)) return true;
    t.srcs = s.filter(x => x !== id);
    return t.srcs.length > 0;
  });
  state.sources = state.sources.filter(s => s.id !== id);
  saveLib(); renderAll(); renderMyPlaylists();
}
function parsePlaylistId(s) {
  s = s.trim();
  const m = s.match(/playlist[/:]([A-Za-z0-9]{22})/);
  if (m) return m[1];
  return /^[A-Za-z0-9]{22}$/.test(s) ? s : null;
}
const loadingPl = new Set();
async function loadPlaylist(id) {
  if (!state.tok) { openSheet('sheetSettings', 'account'); return toast(tx('Bitte zuerst mit Spotify verbinden')); }
  if (loadingPl.has(id)) return;
  loadingPl.add(id); renderMyPlaylists();
  const btn = $('#btnLoadPl');
  try {
    const meta = myPlaylists?.find(p => p.id === id) || plSearch.list?.find(p => p.id === id);
    let name = meta?.name, cover = meta?.cover;
    if (!name) { try { const p = await api(`/playlists/${id}?fields=name,images`); name = p?.name; cover = pickImg(p?.images, 120); } catch {} }
    let page;
    try { page = await api(`/playlists/${id}/items?limit=50`); }
    catch (e) { if (e.status === 401) throw e; page = await api(`/playlists/${id}/tracks?limit=50`); }
    const out = [];
    while (page) {
      for (const it of page.items || []) {
        const t = it.item || it.track;
        if (t && t.type === 'track' && !t.is_local && t.id) out.push(normTrack(t));
      }
      page = page.next ? await api(page.next) : null;
    }
    if (!out.length) throw new Error(tx('Keine abspielbaren Songs gefunden'));
    upsertSource({ id, name: name || 'Playlist', cover: cover || out[0].cover || '' });
    const added = mergeTracks(out, id);
    toast(tx('„{n}“: {a} neue Songs ({t} insgesamt)', { n: name || 'Playlist', a: added, t: out.length }));
    return true;
  } catch (e) {
    toast(tx('Playlist konnte nicht geladen werden: {e}', { e: e.message }) +
      (e.status === 403 || e.status === 404 ? tx(' – Spotify erlaubt Entwickler-Apps teils nur eigene Playlists. Tipp: Playlist in deine Bibliothek kopieren oder CSV-Import nutzen.') : ''), 9000);
    return false;
  } finally {
    loadingPl.delete(id); renderMyPlaylists(); renderLib();
    btn.disabled = false; btn.querySelector('.loader')?.remove();
  }
}
async function addFromLink() {
  const id = parsePlaylistId($('#plUrl').value);
  if (!id) return toast(tx('Das sieht nicht nach einem Playlist-Link aus'));
  $('#plUrl').blur();
  // Ladekreis vor den Text (der Text bleibt – so stimmt er auch nach einem Sprachwechsel)
  const btn = $('#btnLoadPl'); btn.disabled = true; if (!btn.querySelector('.loader')) btn.insertAdjacentHTML('afterbegin', '<span class="loader"></span>');
  if (await loadPlaylist(id)) $('#plUrl').value = '';
}

let myPlaylists = null, myPlLoading = false;
async function loadMyPlaylists(force) {
  if (!state.tok || myPlLoading || (myPlaylists && !force)) return renderMyPlaylists();
  myPlLoading = true; renderMyPlaylists();
  try {
    let page = await api('/me/playlists?limit=50');
    const out = [];
    while (page && out.length < 300) {
      for (const p of page.items || []) if (p?.id) out.push({
        id: p.id, name: p.name, cover: pickImg(p.images, 120), total: (p.tracks || p.items)?.total ?? null,
      });
      page = page.next ? await api(page.next) : null;
    }
    myPlaylists = out;
  } catch (e) { myPlaylists = []; toast(tx('Deine Playlists konnten nicht geladen werden: {e}', { e: e.message }), 6000); }
  finally { myPlLoading = false; renderMyPlaylists(); }
}

// Öffentliche Playlists suchen. Playlists von Spotify selbst (Owner „spotify“) lassen sich mit Entwickler-Apps meist
// nicht laden – sie stehen deshalb hinten und sind gekennzeichnet.
const plSearch = { q: '', list: null, busy: false, seq: 0, t: null };
async function searchPlaylists() {
  const q = $('#plSearch').value.trim();
  if (!state.tok || q.length < 2) return renderPlSearch();
  if (q === plSearch.q && plSearch.list) return renderPlSearch();
  const my = ++plSearch.seq;
  plSearch.q = q; plSearch.list = null; plSearch.busy = true; renderPlSearch();
  try {
    // Spotify erlaubt Entwickler-Apps nur wenige Treffer pro Anfrage („Invalid limit“ bei mehr) → 10 versuchen,
    // sonst 5; dazu eine zweite Seite (optional)
    const page = (off, lim) => api(`/search?type=playlist&limit=${lim}&offset=${off}&q=` + encodeURIComponent(q));
    let lim = 10;
    const r1 = await page(0, lim).catch(e => { if (!/limit/i.test(e.message)) throw e; lim = 5; return page(0, lim); });
    const r2 = r1?.playlists?.next ? await page(lim, lim).catch(() => null) : null;
    if (my !== plSearch.seq) return;
    const items = [...(r1?.playlists?.items || []), ...(r2?.playlists?.items || [])];
    const list = [...new Map(items.filter(p => p?.id).map(p => [p.id, p])).values()].map(p => ({
      id: p.id, name: p.name, cover: pickImg(p.images, 120), total: (p.tracks || p.items)?.total ?? null,
      owner: p.owner?.display_name || p.owner?.id || '', spotify: p.owner?.id === 'spotify',
    }));
    plSearch.list = [...list.filter(p => !p.spotify), ...list.filter(p => p.spotify)];
  } catch (e) {
    if (my !== plSearch.seq) return;
    plSearch.list = []; plSearch.q = '';
    toast(tx('Suche fehlgeschlagen: {e}', { e: e.message }), 6000);
  } finally { if (my === plSearch.seq) { plSearch.busy = false; renderPlSearch(); } }
}

function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/)[0];
  const delim = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); f = ''; if (row.some(x => x.trim())) rows.push(row); row = [];
    } else f += c;
  }
  row.push(f); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
function importCSV(text, fileName) {
  const rows = parseCSV(text);
  if (rows.length < 2) return toast(tx('CSV ist leer'));
  const h = rows[0].map(x => x.trim().toLowerCase());
  const find = (...tests) => {
    for (const t of tests) {
      const i = h.findIndex(x => typeof t === 'string' ? x === t : t.test(x));
      if (i >= 0) return i;
    }
    return -1;
  };
  const iUri = find(/^track uri/, 'uri', 'spotify uri', 'spotify-link', 'spotify link', 'link', /spotify/);
  const iTitle = find(/^track name/, 'titel', 'title', 'song', 'name');
  const iArtist = find(/^artist name/, 'interpret', 'artist', 'artists', 'künstler', 'band', 'sänger');
  const iYear = find(/album release date/, /release date/, 'jahr', 'year', 'erscheinungsjahr');
  const iAlbum = find(/^album name/, 'album');
  const iDur = find(/duration/);
  const iImg = find(/image url/, 'cover');
  if (iUri < 0 || iTitle < 0) return toast(tx('CSV braucht mindestens die Spalten Titel und Spotify-Link/URI'), 6000);
  const out = [];
  for (const r of rows.slice(1)) {
    const m = (r[iUri] || '').match(/track[/:]([A-Za-z0-9]{22})/);
    if (!m) continue;
    const date = iYear >= 0 ? (r[iYear] || '').trim() : '';
    out.push({
      id: m[1], uri: 'spotify:track:' + m[1], title: (r[iTitle] || '').trim(),
      artists: iArtist >= 0 ? (r[iArtist] || '').replace(/\s*;\s*/g, ', ').trim() : '',
      album: iAlbum >= 0 ? (r[iAlbum] || '').trim() : '', date,
      year: parseInt(date.match(/\d{4}/)?.[0]) || null,
      cover: iImg >= 0 ? (r[iImg] || '').trim() : '', duration: iDur >= 0 ? (parseInt(r[iDur]) || 0) : 0,
    });
  }
  if (!out.length) return toast(tx('Keine Songs mit Spotify-Link in der Datei gefunden'), 6000);
  const id = 'csv-' + Date.now();
  upsertSource({ id, name: (fileName || 'CSV-Import').replace(/\.(csv|txt)$/i, ''), cover: out.find(t => t.cover)?.cover || '' });
  const added = mergeTracks(out, id);
  toast(tx('{n} Songs aus der Datei importiert', { n: added }));
  openSheet('sheetLib', 'main');
}

/* ---------------- Wiedergabe ---------------- */
async function getDevices() {
  const r = await api('/me/player/devices');
  return (r?.devices || []).filter(d => d.id && !d.is_restricted && d.name !== 'Musik-Bingo');
}
async function hasWidevine() {
  try {
    await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [{ audioCapabilities: [{ contentType: 'audio/mp4;codecs="mp4a.40.2"' }] }]);
    return true;
  } catch { return false; }
}
const Player = {
  mode: null, sdk: null, deviceId: null, embed: null, embedReady: null, sdkReady: null, playing: false,

  unlock() {
    try { this.sdk?.activateElement(); } catch {}
    // iOS erlaubt Töne nur, wenn der AudioContext direkt bei einem Tippen entsteht
    try { actx = actx || new AudioContext(); actx.resume(); } catch {}
  },

  // Nur einmal gleichzeitig suchen – sonst starten zwei schnelle Klicks zwei Player
  ensure() {
    // „Automatisch“ ist mangels Spotify-App auf Vorschau ausgewichen → ab und zu erneut nach einem Gerät suchen
    if (this.mode === 'embed' && this.fallbackAt && Date.now() - this.fallbackAt > 20000) { this.mode = null; this.fallbackAt = 0; }
    if (this.mode) return Promise.resolve();
    this.ensuring ??= this.pick().finally(() => { this.ensuring = null; });
    return this.ensuring;
  },
  async pick() {
    const want = state.settings.mode;
    if (want === 'connect') { this.mode = 'connect'; renderStatus(); return; }
    if (want !== 'embed' && state.tok) {
      try {
        const me = await api('/me');
        if (me.product !== 'premium') {
          if (want === 'sdk') toast(tx('Der Browser-Player braucht Spotify Premium – nutze Vorschau'));
        } else {
          const drm = await hasWidevine();
          try {
            if (!drm) throw new Error('kein DRM');
            await this.initSdk(); this.mode = 'sdk'; renderStatus(); return;
          } catch (e) {
            // Browser kann nicht selbst abspielen (z. B. iPhone) → über die Spotify-App steuern
            if (want === 'auto') {
              const devs = await getDevices().catch(() => []);
              if (devs.length) {
                this.mode = 'connect';
                this.connectDev = devs.find(x => x.id === state.settings.device) || devs.find(x => x.is_active) || devs[0];
                renderStatus();
                toast(tx('Musik läuft über die Spotify-App (Gerät in den Einstellungen wählbar).'), 6000);
                return;
              }
              // iPhone ohne aktive Spotify-App: lieber Spotify aufwecken als nur Vorschau spielen
              if (!drm) throw wakeError(tx('Die Spotify-App ist gerade nicht aktiv.'));
            }
            if (want === 'auto') this.fallbackAt = Date.now();
            toast(drm
              ? tx('Der Browser-Player konnte nicht starten ({e}) – es gibt nur Vorschau-Ausschnitte.', { e: e.message })
              : tx('Öffne die Spotify-App, spiel kurz etwas ab und wähle in den Einstellungen „Spotify-App / Box“ – sonst gibt es nur Vorschau-Ausschnitte.'), 11000);
          }
        }
      } catch (e) {
        if (e.wake) throw e;
        console.warn(e);
        if (want === 'sdk') toast(tx('Browser-Player konnte nicht starten: {e}', { e: e.message }), 6000);
      }
    }
    await this.initEmbed();
    this.mode = 'embed'; renderStatus();
  },

  initSdk() {
    if (this.sdkReady) return this.sdkReady;
    this.sdkReady = new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error(tx('Zeitüberschreitung'))), 15000);
      window.onSpotifyWebPlaybackSDKReady = () => {
        const p = new Spotify.Player({
          name: 'Musik-Bingo', volume: state.settings.volume / 100,
          getOAuthToken: cb => ensureToken().then(() => cb(state.tok.access_token)).catch(e => toast(e.message)),
        });
        p.addListener('ready', ({ device_id }) => { this.deviceId = device_id; clearTimeout(to); res(); });
        // Gerät geht verloren (Standby, Netzwechsel) → beim nächsten Abspielen neu verbinden
        p.addListener('not_ready', () => { this.deviceId = null; });
        p.addListener('playback_error', ({ message }) => console.warn('Spotify:', message));
        p.addListener('autoplay_failed', () => toast(tx('Der Browser hat die Wiedergabe blockiert – tippe auf die Platte.'), 6000));
        p.addListener('initialization_error', ({ message }) => rej(new Error(message)));
        p.addListener('authentication_error', ({ message }) => rej(new Error(message)));
        p.addListener('account_error', ({ message }) => rej(new Error(message)));
        p.addListener('player_state_changed', s => { this.playing = !!s && !s.paused; renderPlayState(); });
        p.connect();
        this.sdk = p;
      };
      const s = document.createElement('script');
      s.src = 'https://sdk.scdn.co/spotify-player.js';
      s.onerror = () => rej(new Error(tx('SDK nicht ladbar')));
      document.head.appendChild(s);
    }).catch(e => { this.sdkReady = null; throw e; });
    return this.sdkReady;
  },

  initEmbed() {
    if (this.embedReady) return this.embedReady;
    this.embedReady = new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error(tx('Spotify-Embed lädt nicht'))), 15000);
      window.onSpotifyIframeApiReady = API => {
        const uri = state.tracks[0]?.uri || 'spotify:track:4uLU6hMCjMI75M1A2tKUQC';
        API.createController($('#embedHost'), { uri, width: 320, height: 152 }, c => {
          this.embed = c;
          c.addListener('playback_update', e => { this.lastUpdate = e.data; this.playing = !e.data.isPaused; renderPlayState(); });
          clearTimeout(to); res();
        });
      };
      const s = document.createElement('script');
      s.src = 'https://open.spotify.com/embed/iframe-api/v1';
      s.onerror = () => rej(new Error(tx('Spotify-Embed nicht ladbar')));
      document.head.appendChild(s);
    }).catch(e => { this.embedReady = null; throw e; });
    return this.embedReady;
  },

  startMs(t) {
    const d = t.duration || 0;
    if (state.settings.start === 's30') return d && d < 45000 ? 0 : 30000;
    if (state.settings.start === 'random') return d ? Math.floor(d * (.15 + Math.random() * .45)) : 30000;
    return 0;
  },

  // Jeder Aufruf bekommt eine Nummer: Wird schnell weitergeklickt, bricht der ältere ab und
  // kann den neuen Song nicht mehr überschreiben (z. B. durch ein verspätetes Springen).
  seq: 0,
  async play(t, pos = this.startMs(t)) {
    const my = ++this.seq, stale = () => my !== this.seq;
    await this.ensure();
    if (stale()) return;
    const body = JSON.stringify({ uris: [t.uri], position_ms: pos });
    if (this.mode === 'sdk') {
      await this.sdkPlay(body);
      if (stale()) return;
      if (pos) {
        // position_ms wird beim ersten Abspielen manchmal ignoriert → nachträglich springen
        for (let i = 0; i < 10; i++) {
          await sleep(300);
          if (stale()) return;
          const s = await this.sdk.getCurrentState().catch(() => null);
          if (s?.track_window?.current_track?.id === t.id || s?.track_window?.current_track?.uri === t.uri) {
            if (Math.abs(s.position - pos) > 3000) await this.sdk.seek(pos);
            break;
          }
        }
      }
    } else if (this.mode === 'connect') {
      let d = await this.connectDevice();
      try {
        await api(`/me/player/play?device_id=${d.id}`, { method: 'PUT', body });
      } catch (e) {
        if (e.status !== 404 && e.status !== 502) throw e;
        // Gerät war kurz weg (Spotify-App im Hintergrund) → Liste neu holen und einmal erneut versuchen
        this.connectDev = null;
        d = await this.connectDevice();
        try { await api(`/me/player/play?device_id=${d.id}`, { method: 'PUT', body }); }
        catch (e2) { this.connectDev = null; if (e2.status === 404) throw wakeError(tx('„{d}“ ist gerade nicht erreichbar.', { d: d.name })); throw e2; }
      }
      this.startSync();
    } else {
      this.lastUpdate = null;
      this.embed.loadUri(t.uri);
      await sleep(700);
      if (stale()) return;
      this.embed.play();
      // Der Embed startet manchmal nicht beim ersten Mal → kurz prüfen und notfalls nochmal anstoßen
      for (let i = 0; i < 12 && !(this.lastUpdate && !this.lastUpdate.isPaused); i++) await sleep(200);
      if (stale()) return;
      if (!this.lastUpdate || this.lastUpdate.isPaused) this.embed.play();
      if (pos) {
        // warten, bis der Embed die echte Länge meldet
        for (let i = 0; i < 15 && !(this.lastUpdate?.duration > 0 && !this.lastUpdate.isBuffering); i++) await sleep(200);
        if (stale()) return;
        const d = this.lastUpdate?.duration || 0;
        this.preview = d > 0 && d < 35000;
        if (this.preview) {
          if (!this.previewWarned) { this.previewWarned = true; toast(tx('Nur Vorschau-Ausschnitte – der Startpunkt im Song wird ignoriert.'), 7000); }
          renderStatus();
        } else if (d) this.embed.seek(Math.min(pos, d - 15000) / 1000);
      }
    }
    this.playing = true; renderPlayState();
  },
  // Browser-Player: nach Standby ist das Gerät oft „verschwunden“ → neu verbinden und einmal wiederholen
  async sdkPlay(body) {
    const go = () => api(`/me/player/play?device_id=${this.deviceId}`, { method: 'PUT', body });
    if (!this.deviceId) await this.sdkReconnect();
    try { await go(); }
    catch (e) {
      if (e.status !== 404 && e.status !== 502) throw e;
      await this.sdkReconnect();
      await api('/me/player', { method: 'PUT', body: JSON.stringify({ device_ids: [this.deviceId], play: false }) }).catch(() => {});
      await sleep(600);
      await go();
    }
  },
  async sdkReconnect() {
    this.deviceId = null;
    try { await this.sdk.connect(); } catch {}
    for (let i = 0; i < 25 && !this.deviceId; i++) await sleep(200);
    if (!this.deviceId) throw new Error(tx('Browser-Player nicht bereit – lade die Seite neu'));
  },
  async connectDevice() {
    if (this.connectDev) return this.connectDev;
    const devs = await getDevices();
    const d = devs.find(x => x.id === state.settings.device) || devs.find(x => x.is_active) || devs[0];
    if (!d) throw wakeError(tx('Kein aktives Spotify-Gerät gefunden.'));
    this.connectDev = d; renderStatus();
    return d;
  },
  // Spotify-App/Box: echten Zustand abfragen – wer direkt in Spotify pausiert oder das Gerät wechselt,
  // bringt sonst die Anzeige (und Pause/Play) durcheinander
  async syncState() {
    if (this.mode !== 'connect' || !state.tok) return null;
    const s = await api('/me/player').catch(() => null);
    if (this.mode !== 'connect') return null;
    if (s) {
      this.playing = !!s.is_playing;
      if (s.device?.id && s.device.id !== this.connectDev?.id && s.device.name !== 'Musik-Bingo') { this.connectDev = s.device; renderStatus(); }
    } else this.playing = false;
    renderPlayState();
    return s;
  },
  startSync() {
    if (this.syncIv) return;
    this.syncIv = setInterval(() => {
      if (this.mode !== 'connect' || !round) { clearInterval(this.syncIv); this.syncIv = null; return; }
      if (document.visibilityState === 'visible') this.syncState();
    }, 5000);
  },
  async pause() {
    ++this.seq;   // ein noch laufender Start soll nicht nachträglich wieder abspielen
    try {
      if (this.mode === 'sdk') await this.sdk.pause();
      else if (this.mode === 'connect') { if (this.connectDev) await api(`/me/player/pause?device_id=${this.connectDev.id}`, { method: 'PUT' }); }
      else this.embed?.pause();
    } catch {}
    this.playing = false; renderPlayState();
  },
  async toggle() {
    try {
      if (this.mode === 'sdk') {
        await this.sdk.togglePlay();
        const s = await this.sdk.getCurrentState().catch(() => null);
        this.playing = s ? !s.paused : !this.playing;
      } else if (this.mode === 'connect') {
        if (!this.connectDev) return;
        const s = await this.syncState();
        const play = !s?.is_playing;
        await api(`/me/player/${play ? 'play' : 'pause'}?device_id=${this.connectDev.id}`, { method: 'PUT' });
        this.playing = play;
      } else { this.embed?.togglePlay(); this.playing = !this.playing; }
    } catch (e) {
      if (this.mode === 'connect' && e.status === 404) return offerSpotifyWake(tx('Spotify ist gerade nicht erreichbar.'));
      toast(tx('Wiedergabe-Fehler: {e}', { e: e.message }), 9000, { label: tx('Wiedergabe einstellen'), fn: () => openSheet('sheetSettings', 'play') });
    }
    renderPlayState();
  },
  // Spielende: Lautstärke in ~3 s herunterfahren, pausieren, Lautstärke für später zurücksetzen
  async fadeOut(ms = 3000) {
    if (!this.playing) return;
    const v0 = state.settings.volume, steps = this.mode === 'connect' ? 6 : 12;
    const canFade = this.mode === 'sdk' || (this.mode === 'connect' && this.connectDev?.supports_volume);
    const set = v => this.mode === 'sdk' ? this.sdk.setVolume(Math.max(v, 0.0001) / 100)
      : api(`/me/player/volume?volume_percent=${v}&device_id=${this.connectDev.id}`, { method: 'PUT' });
    if (canFade) for (let i = steps - 1; i >= 0; i--) { try { await set(Math.round(v0 * i / steps)); } catch {} await sleep(ms / steps); }
    await this.pause();
    if (canFade) try { await set(v0); } catch {}
  },
  async reset() { await this.pause(); this.mode = null; this.connectDev = null; this.fallbackAt = 0; renderStatus(); },
  // Anderes Gerät gewählt: laufende Musik direkt dorthin übergeben
  async switchDevice(id) {
    const was = this.playing;
    this.connectDev = null;
    if (this.mode !== 'connect') return;
    try {
      await api('/me/player', { method: 'PUT', body: JSON.stringify({ device_ids: [id], play: was }) });
      await this.connectDevice();
      toast(tx('Spielt jetzt auf „{d}“', { d: this.connectDev.name }));
    } catch (e) { toast(tx('Gerätewechsel fehlgeschlagen: {e}', { e: e.message }), 6000); }
  },
  setVolume(v) {
    // Der Spotify-Embed bietet keine Lautstärke-Steuerung – nur Browser-Player und Connect.
    try {
      if (this.mode === 'sdk') this.sdk.setVolume(Math.max(v, 0.0001) / 100);
      else if (this.mode === 'connect' && this.connectDev?.supports_volume) {
        clearTimeout(this.volT);
        this.volT = setTimeout(() => api(`/me/player/volume?volume_percent=${v}&device_id=${this.connectDev.id}`, { method: 'PUT' }).catch(() => {}), 250);
      }
    } catch {}
  },
};
