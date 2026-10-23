// Musik-Bingo – Spielablauf: Runden, Countdown, Auflösung, Originaljahr (MusicBrainz), Tipps
'use strict';

/* ---------------- Spielablauf ---------------- */
// Vorige aufgelöste Runde, die man noch nachtragen darf – nicht die laufende selbst und nicht aus einer früheren Partie
const lastRevFor = r => { const l = state.lastRev; return l && r && l.id !== r.id && l.n > (state.partieFrom || 0) ? l : null; };
let timerIv = null;
function stopTimer() { clearInterval(timerIv); timerIv = null; }

function needSongs() {
  if (state.tracks.length) return false;
  openSheet(state.tok ? 'sheetLib' : 'sheetSettings', state.tok ? 'add' : 'account');
  return true;
}
// Welche Kategorien können gezogen werden? Läuft Bingo, nur die auf den Karten (und davon die aktiven) –
// eine Kategorie, die auf keiner Karte steht, könnte niemand markieren
function roundCats() {
  const en = state.cats.filter(c => c.enabled);
  if (!state.bingo) return en;
  const onCard = new Set(state.bingo.k.map(k => k.i)), fromCard = state.cats.filter(c => onCard.has(c.id));
  const both = fromCard.filter(c => c.enabled);
  return both.length ? both : fromCard.length ? fromCard : en;
}
/* Automatisch weiter: nach der Auflösung startet der nächste Song nach x Sekunden (Einstellungen). Ist der Spielleiter
   beschäftigt (Menü oder Rückfrage offen, Bingo-Ruf noch nicht geprüft, Spielende), bleibt die Zeit stehen. */
let autoNextT = null, autoNextEnd = 0, autoNextLast = 0;
function startAutoNext() {
  stopAutoNext();
  const s = +state.settings.autoNext || 0;
  if (!s || !round || round.phase !== 'revealed' || (Lobby.code && state.match?.over)) return;
  autoNextEnd = Date.now() + s * 1000; autoNextLast = Date.now();
  autoNextT = setInterval(tickAutoNext, 250);
}
function stopAutoNext() { clearInterval(autoNextT); autoNextT = null; }
const autoNextBusy = () => !!document.querySelector('dialog[open]') || !$('#endScreen').classList.contains('hidden') || pendingCallers().length > 0;
const autoNextLabel = () => autoNextT ? ` · ${Math.max(0, Math.ceil((autoNextEnd - Date.now()) / 1000))}` : '';
function tickAutoNext() {
  const now = Date.now();
  if (!round || round.phase !== 'revealed' || (Lobby.code && state.match?.over)) { stopAutoNext(); return render(); }
  if (autoNextBusy()) autoNextEnd += now - autoNextLast;   // pausiert
  autoNextLast = now;
  const el = $('#controls .an'); if (el) el.textContent = autoNextLabel();
  if (now >= autoNextEnd) { stopAutoNext(); nextRound(); }
}
async function nextRound() {
  stopAutoNext();
  if (needSongs()) return;
  const cats = roundCats();
  if (!cats.length) return toast(tx('Keine Kategorie aktiv – siehe Einstellungen'));
  Player.unlock(); keepScreenOn();
  stopTimer(); clearTimeout(snippetT);
  // Für „Rückgängig“: vorherige Runde merken
  const prev = round ? { round, played: state.played.slice() } : null;
  const playedSet = new Set(state.played);
  let pool = state.tracks.filter(t => !playedSet.has(t.id));
  let reshuffled = false;
  if (!pool.length) {   // alle gespielt → neu mischen, aber nicht gleich wieder den Song, der gerade lief
    reshuffled = true; state.played = [];
    pool = state.tracks.length > 1 ? state.tracks.filter(t => t.id !== round?.track?.id) : state.tracks.slice();
  }
  // Kategorie zuerst. „Film/Serie“ nur mit einem Song, für den ein Film bekannt ist – gibt es keinen, eine andere Kategorie
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let cat = pick(cats);
  if (cat.answer === 'film') {
    const withFilm = pool.filter(t => filmsOf(t).length);
    const others = cats.filter(c => c.answer !== 'film');
    if (withFilm.length) pool = withFilm;
    else if (others.length) cat = pick(others);
  }
  const track = pick(pool);
  state.played.push(track.id); LS.set('played', state.played);
  // n = Anzeige (übersprungene Runden behalten die Nummer), id = eindeutig – daran hängen die Tipps in der Lobby
  round = { n: (state.history[0]?.n || 0) + 1, id: Date.now(), track, cat, phase: 'playing', hints: 0, pos: Player.startMs(track) };
  mbLookup(track);
  if (ARTIST_FACTS.includes(cat.answer)) artistLookup(track);
  spinCategory(cat);
  render(); Lobby.syncRound();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (reshuffled) toast(tx('Alle Songs wurden gespielt – die Liste wird neu gemischt'));
  // Rückgängig nur beim Überspringen (Song lief noch, Runde war nicht aufgelöst)
  // (und nur, solange die neue Runde noch läuft – wurde sie schon aufgelöst, steht sie im Verlauf)
  else if (prev && prev.round.phase !== 'revealed') { const cur = round; toast(tx('Song übersprungen'), 5000, { label: tx('Rückgängig'), fn: () => { if (round === cur && cur.phase !== 'revealed') undoNext(prev); } }); }
  await playSnippet();
}
// Zurück zur vorherigen Runde (versehentlich „Nächster Song“ oder „Überspringen“ getippt)
function undoNext(prev) {
  stopAutoNext(); stopTimer(); clearTimeout(snippetT); cancelSpin();
  round = prev.round;
  if (round.phase === 'countdown') { round.phase = 'playing'; round.bz = null; }
  state.played = prev.played; LS.set('played', state.played);
  render(); Lobby.syncRound();
  playSnippet();
}
// Spielt den Song der Runde – bei begrenzter Song-Länge nur einen Ausschnitt
let snippetT;
async function playSnippet() {
  const r = round; if (!r) return;
  clearTimeout(snippetT);
  r.snippetDone = false;
  try { await Player.play(r.track, r.pos); }
  catch (e) {
    if (e.wake) return offerSpotifyWake(e.message);
    return toast(tx('Wiedergabe-Fehler: {e}', { e: e.message }), 9000, { label: tx('Wiedergabe einstellen'), fn: () => openSheet('sheetSettings', 'play') });
  }
  const lim = +state.settings.limit;
  if (lim) snippetT = setTimeout(() => {
    if (round !== r || r.phase === 'revealed') return;
    Player.pause(); r.snippetDone = true; renderPlayState();
  }, lim * 1000);
}

function showCat(c) {
  const [icon, color] = catStyle(c);
  $('#catName').textContent = tx(c.name); $('#catIcon').textContent = icon;
  document.documentElement.style.setProperty('--cat', color);
}
let spinTimers = null;
function cancelSpin() {
  if (!spinTimers) return;
  clearInterval(spinTimers.iv); clearTimeout(spinTimers.to); spinTimers = null;
  spinning = false; $('#cat').classList.remove('spin');
}
function spinCategory(final) {
  cancelSpin();
  const cats = roundCats();
  const box = $('#cat');
  spinning = true; box.classList.remove('idle'); box.classList.add('spin');
  let i = Math.floor(Math.random() * cats.length);
  const iv = setInterval(() => { showCat(cats[i++ % cats.length]); beep(300 + (i % 5) * 60, .03, .05); }, 85);
  spinTimers = { iv, to: 0 };
  spinTimers.to = setTimeout(() => {
    clearInterval(iv); spinning = false; spinTimers = null;
    showCat(final); box.classList.remove('spin');
    box.classList.add('land'); setTimeout(() => box.classList.remove('land'), 550);
    beep(660, .15);
    vib(15);
  }, 1100);
}

// by = Name des Mitspielers, der gebuzzert hat (sonst startet der Spielleiter selbst)
function startCountdown(by = null) {
  if (!round || round.phase !== 'playing') return;
  Player.unlock();
  round.phase = 'countdown'; round.timeUp = false; round.bz = by;
  const total = state.settings.seconds * 1000, end = Date.now() + total;
  round.end = end; round.dur = total; Lobby.syncRound();   // Fernseher-Ansicht zeigt den Countdown mit
  const ring = $('#ringSvg'), C = 2 * Math.PI * 56;
  ring.style.setProperty('--len', C);
  let lastSec = null;
  render();
  const tick = () => {
    const rem = Math.max(0, end - Date.now()), s = Math.ceil(rem / 1000);
    ring.style.setProperty('--off', (C * (1 - rem / total)).toFixed(2));
    if (s !== lastSec) {   // Zahl, Farbe und Ton nur bei neuer Sekunde
      $('#timerNum').textContent = s; $('#discWrap').classList.toggle('urgent', s <= 5);
      if (s <= 3 && s > 0) beep(880, .08);
      lastSec = s;
    }
    if (rem <= 0) {
      stopTimer(); beep(440, .7, .3);
      if (state.settings.autoReveal) reveal();
      else { round.timeUp = true; $('#timerNum').textContent = '⏰'; render(); }
    }
  };
  tick(); timerIv = setInterval(tick, 100);
}

// Buzzer: Ein Mitspieler hat für die laufende Runde gebuzzert → Countdown starten. Es zählt der früheste Buzz (Server-Zeit);
// round.bzT merkt sich den zuletzt verarbeiteten – nach „Rückgängig“ darf erneut gebuzzert werden.
function checkBuzz() {
  if (!Lobby.code || !hasBuzz(state.bingo) || round?.phase !== 'playing') return;
  const p = lobbyList().filter(p => p.bz?.n === round.id && p.bz.t > (round.bzT || 0) && p.id !== Lobby.uid).sort((a, b) => a.bz.t - b.bz.t)[0];
  if (!p) return;
  round.bzT = p.bz.t;
  buzzSound();
  startCountdown(p.name);
  toast(tx('🔔 {n} hat gebuzzert – der Countdown läuft', { n: p.name }), 5000);
}

function reveal() {
  if (!round || round.phase === 'revealed') return;
  stopTimer(); clearTimeout(snippetT);
  round.phase = 'revealed';
  const t = round.track;
  state.history.unshift({ n: round.n, cat: round.cat.name, catId: round.cat.id, title: t.title, artists: t.artists, year: yearOf(t), id: t.id });
  state.history = state.history.slice(0, 300); LS.set('history', state.history);
  state.lastRev = { id: round.id, i: round.cat.id, q: round.cat.name, n: round.n }; LS.set('lastRev', state.lastRev);
  mbLookup(t);   // noch kein Originaljahr (Abfrage gescheitert)? → jetzt erneut, das Ergebnis wird nachgereicht
  if (state.settings.pauseOnReveal) Player.pause();
  beep(1046, .25);
  startAutoNext();
  render(); renderHist(); Lobby.syncRound();
  if (ARTIST_FACTS.includes(round.cat.answer)) artistLookup(t);
  // Statistik fürs Spielende: gespielte Songs und wer wie oft getippt hat
  const m = state.match;
  if (Lobby.code && m && !m.over) {
    m.rounds = (m.rounds || 0) + 1; m.tips ??= {};
    for (const p of guessesFor(round.id)) { m.tips[p.id] = (m.tips[p.id] || 0) + 1; m.names[p.id] = p.name; }
    saveMatch();
  }
}

function answerFor(cat, t) {
  const y = yearOf(t);
  switch (cat.answer) {
    case 'title': return esc(baseTitle(t.title) || t.title);   // ohne Zusätze wie „- Remastered 2011“ (steht vollständig darunter)
    case 'artist': return esc(t.artists);
    case 'year': return y ?? '?';
    case 'decade': return decadeOf(y);
    case 'range': return y ? `${y} <span class="small">${tx('(richtig: {a}–{b})', { a: y - cat.tol, b: y + cat.tol })}</span>` : '?';
    case 'album': return esc(t.album || '?');
    case 'film': { const f = filmsOf(t); return f.length ? esc(f.join(' · ')) : tx('🤔 Ihr entscheidet selbst'); }
    case 'country': case 'kind': case 'gender': {   // kommt von MusicBrainz
      const v = artistFact(t, cat.answer);
      return v ? esc(v) : v === null ? tx('🔎 Wird nachgeschlagen …') : tx('🤔 Unbekannt – ihr entscheidet selbst');
    }
    // Eigene Frage ohne Daten (z. B. „Aus welchem Film?“): die App kennt die Antwort nicht – der Song steht darunter
    default: return tx('🤔 Ihr entscheidet selbst');
  }
}

async function fixYear() {
  const t = round?.track; if (!t) return;
  const v = await ask(tx('Richtiges Erscheinungsjahr für „{t}“?\nSpotify liefert das Datum des Albums – bei Best-of oder Remaster oft falsch.', { t: t.title }), { input: String(yearOf(t) ?? ''), ok: tx('Speichern') });
  if (v == null) return;
  const y = parseInt(v);
  if (!y || y < 1000 || y > 2100) return toast(tx('Ungültiges Jahr'));
  state.yearFix[t.id] = y; LS.set('yearFix', state.yearFix);
  if (state.history[0]?.id === t.id) { state.history[0].year = y; LS.set('history', state.history); }
  render(); renderHist(); Lobby.syncRound();
}

// Bibliothek speichern, wenn gerade nichts los ist (bei vielen Songs ist das ein großer Text – nicht mitten im Spiel)
let saveTracksT = null;
function saveTracksSoon() {
  clearTimeout(saveTracksT);
  saveTracksT = setTimeout(() => (self.requestIdleCallback || (f => f()))(() => LS.set('tracks', state.tracks)), 3000);
}
addEventListener('pagehide', () => { if (saveTracksT) { clearTimeout(saveTracksT); LS.set('tracks', state.tracks); } });
async function loadCover(t) {
  if (t.cover || t._coverTried) return;
  t._coverTried = true;
  try {
    const r = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent('https://open.spotify.com/track/' + t.id));
    const j = await r.json();
    if (j.thumbnail_url) { t.cover = j.thumbnail_url; saveTracksSoon(); if (round?.track === t && round.phase === 'revealed') { renderReveal(); Lobby.syncRound(); } }
  } catch {}
}

/* ---------------- Originaljahr über MusicBrainz ---------------- */
// Entfernt Zusätze wie „- Remastered 2011“ oder „(feat. X)“, die es nur in Spotify-Titeln gibt.
// Wörter, an denen man Spotify-Zusätze erkennt („- 2009 Remaster“, „(Live)“, „- Single Edit“ …) – nur ganze Wörter,
// damit z. B. „(Alive)“ oder „Mixed Emotions“ nicht hängen bleiben
const EXTRA_WORDS = 'remaster(?:ed)?|re-?recorded|remix(?:ed)?|mix|version|edit|live|mono|stereo|acoustic|unplugged|demo|instrumental|extended|single|anniversary|radio|deluxe|bonus';
const RE_DASH_EXTRA = new RegExp('\\s+[-–—]\\s+[^-–—]*\\b(?:' + EXTRA_WORDS + ')\\b[^-–—]*$', 'i');
const RE_PAREN_EXTRA = new RegExp('\\s*[([][^)\\]]*\\b(?:feat\\.?|ft\\.|with|' + EXTRA_WORDS + '|soundtrack|motion picture)\\b[^)\\]]*[)\\]]|\\s*[([][^)\\]]*\\bfrom\\s*["“„\'«][^)\\]]*[)\\]]', 'ig');
function baseTitle(s) {
  return String(s || '')
    .replace(RE_DASH_EXTRA, '')
    // Filmsongs: „Danger Zone - From "Top Gun" Original Soundtrack“, „- Love Theme from "Titanic"“, „- Soundtrack Version“
    .replace(/\s*[-–—]\s*[^-–—]*(\bfrom\s*["“„'«]|\bsoundtrack\b|\bmotion picture\b|\bost\b)[^-–—]*$/i, '')
    .replace(RE_PAREN_EXTRA, '')
    .trim();
}
const normStr = s => String(s || '').toLowerCase().replace(/&/g, ' and ').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
/* MusicBrainz-Warteschlange: höchstens etwa eine Anfrage pro Sekunde (Vorgabe von MusicBrainz).
   - Der Song der laufenden Runde kommt nach vorn (urgent).
   - Jede Anfrage bricht nach 12 s ab – vorher konnte eine hängende Verbindung die Warteschlange für den ganzen Abend
     blockieren, danach wurde kein Jahr mehr korrigiert.
   - Ist nichts zu tun, werden im Hintergrund nach und nach die übrigen Songs nachgeschlagen – so steht das
     Originaljahr meist schon fest, bevor der Song drankommt. */
const mbJobs = [];
let mbRunning = false, mbPauseUntil = 0;
function mbQueue(job, urgent = false) {
  urgent ? mbJobs.unshift(job) : mbJobs.push(job);
  mbKick();
}
function mbKick() { if (!mbRunning) mbWork(); }
async function mbWork() {
  mbRunning = true;
  try {
    for (let job; (job = mbJobs.shift() || mbPrefetchJob());) {
      try { await job(); } catch {}
      if (job.bg) await sleep(1400);   // Hintergrund: zusätzliche Pause
    }
  } finally { mbRunning = false; }
}
// Hintergrund: nächster Song ohne Originaljahr (noch nicht gespielte zuerst). Nicht bei verstecktem Tab, nicht nach Fehlern
// (dann 2 Minuten Pause), jeder Song höchstens zweimal versucht.
function mbPrefetchJob() {
  if (!state.settings.mb || document.hidden || Date.now() < mbPauseUntil || !state.tracks.length) return null;
  const played = new Set(state.played);
  if (filmCatOn()) {
    const open = x => !(x.id in state.mbFilm) && !spotifyFilms(x).length && (x._mbFilmTries || 0) < 2;
    const f = state.tracks.find(x => open(x) && !played.has(x.id)) || state.tracks.find(open);
    if (f) { const job = filmJob(f); job.bg = true; return job; }
  }
  const todo = t => !(t.id in state.mb) && (t._mbTries || 0) < 2;
  const t = state.tracks.find(x => todo(x) && !played.has(x.id)) || state.tracks.find(todo);
  let job = t ? mbYearJob(t) : null;
  if (!job && state.cats.some(c => c.enabled && ARTIST_FACTS.includes(c.answer))) {
    const open = x => !mbArtistKnown(normStr(artistOf(x))) && (x._mbArtTries || 0) < 2;
    const a = state.tracks.find(x => open(x) && !played.has(x.id)) || state.tracks.find(open);
    if (a) job = artistJob(a);
  }
  if (!job) return null;
  job.bg = true;
  return job;
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) mbKick(); });
async function mbJson(url) {
  for (let i = 0; ; i++) {
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 12000);
    let r;
    try { r = await fetch(url, { signal: ac.signal }); } finally { clearTimeout(to); }
    // MusicBrainz ist kurz ausgelastet (Ratenlimit) → mit wachsender Pause erneut versuchen: 2, 4, 8 s
    if ((r.status === 503 || r.status === 429) && i < 3) { await sleep(2000 * 2 ** i); continue; }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
}
// Spotify schreibt manche Künstler mit Zusatz in Klammern, z. B. „Olly Alexander (Years & Years)“ – MusicBrainz kennt dann nur
// „Years & Years“ (bzw. „Olly Alexander“). Gesucht wird nach allen Varianten.
function artistVariants(name) {
  const v = [name], m = String(name).match(/^(.*?)\s*\((.+)\)\s*$/);
  if (m) v.push(m[2], m[1]);
  return [...new Set(v.map(s => s.trim()).filter(s => normStr(s)))];
}
const artistQuery = vs => '(' + vs.map(v => `artist:"${v.replace(/"/g, '')}"`).join(' OR ') + ')';
/* ---------------- Film / Serie (experimentell) ----------------
   Quellen: 1. Spotify-Titel („Danger Zone - From "Top Gun"“), 2. Spotify-Album („Dirty Dancing (Original Motion Picture
   Soundtrack)“), 3. MusicBrainz: Soundtrack-Alben, auf denen der Song ist. Nur Titel mit Hinweis auf Film/Serie zählen
   (sonst landen Musicals, Olympia-Feiern o. Ä. dabei). Höchstens drei, das früheste zuerst. */
const FILM_HINT = /motion picture|\bfilm\b|\bmovie\b|sound\s*track|original score|\bscore\b|\bseries\b|\bserie\b|\bseason\b|staffel|\bost\b|filmmusik/i;
function filmName(s) {
  s = String(s || '').trim();
  let m = s.match(/(?:love theme |theme |music |songs )?from\s*(?:the\s+)?(?:motion picture|film|movie|series|netflix series)?\s*["“„'«]([^"”“'»]+)["”“'»]/i);
  if (m) return m[1].trim();
  m = s.match(/^(.*?)\s*[:([–-]\s*(?:the\s+)?(?:official\s+)?(?:original\s+)?(?:music\s+(?:from|inspired)|songs\s+from|motion picture|(?:movie\s+|film\s+)?sound\s*track|(?:original\s+)?score|ost\b|filmmusik|der\s+soundtrack|bande originale|banda sonora)/i);
  if (!m || !m[1]) return '';   // kein erkennbarer Film-Name
  s = m[1];
  return s.replace(/:\s*awesome mix.*$/i, '').replace(/,?\s*(?:vol\.?|volume)\s*\d+$/i, '').replace(/[\s:–-]+$/, '').trim();
}
// Filme aus den Spotify-Angaben (ohne Abfrage)
function spotifyFilms(t) {
  const out = [];
  const fromTitle = String(t.title || '').match(/from\s*["“„'«]([^"”“'»]+)["”“'»]/i);
  if (fromTitle) out.push(fromTitle[1].trim());
  if (FILM_HINT.test(t.album || '')) { const n = filmName(t.album); if (n) out.push(n); }
  return out;
}
// Alle bekannten Filme/Serien eines Songs (höchstens drei, ohne Doppelte)
function filmsOf(t) {
  const seen = new Set(), out = [];
  for (const n of [...spotifyFilms(t), ...(state.mbFilm[t.id] || [])]) {
    const k = normStr(n);
    // gleicher oder enthaltener Name („Marvel’s Guardians of the Galaxy: Cosmic Mix“ ⊃ „Guardians of the Galaxy“) nur einmal
    if (k && ![...seen].some(x => x.includes(k) || k.includes(x))) { seen.add(k); out.push(n); }
  }
  return out.slice(0, 3);
}
const filmCatOn = () => state.cats.some(c => c.enabled && c.answer === 'film');
function filmJob(t) {
  return async () => {
    if (t.id in state.mbFilm) return;
    t._mbFilmTries = (t._mbFilmTries || 0) + 1;
    try {
      const vs = artistVariants(artistOf(t));
      const q = `recording:"${baseTitle(t.title).replace(/"/g, '')}" AND ${artistQuery(vs)}`;
      const j = await mbJson('https://musicbrainz.org/ws/2/recording?fmt=json&limit=100&query=' + encodeURIComponent(q));
      const found = new Map();   // Name → frühestes Jahr
      for (const rec of j.recordings || []) {
        if ((rec.score ?? 0) < 90 || normStr(rec.title) !== normStr(baseTitle(t.title))) continue;
        const credit = normStr((rec['artist-credit'] || []).map(a => a.name || a.artist?.name).join(''));
        if (!vs.some(v => credit.includes(normStr(v)))) continue;
        for (const r of rec.releases || []) {
          const g = r['release-group'] || {};
          if (!(g['secondary-types'] || []).includes('Soundtrack') || /bootleg|pseudo/i.test(r.status || '')) continue;
          const title = g.title || r.title || '';
          if (!FILM_HINT.test(title) && !/from\s*["“„']/i.test(title)) continue;
          const n = filmName(title);
          if (!n || normStr(n) === normStr(baseTitle(t.title))) continue;   // „Danger Zone“-Single ist kein Film
          const y = parseInt(r.date) || 9999;
          if (!found.has(n) || found.get(n) > y) found.set(n, y);
        }
      }
      state.mbFilm[t.id] = [...found].sort((a, b) => a[1] - b[1]).map(x => x[0]).slice(0, 3);
      LS.set('mbFilm', state.mbFilm);
    } catch { mbPauseUntil = Date.now() + 120000; }
    await sleep(1100);
  };
}
function mbLookup(t) {
  if (!state.settings.mb || t.id in state.mb) return;
  mbQueue(mbYearJob(t), true);
}
// Erscheinungsjahr einer Aufnahme: früheste Veröffentlichung als Album, Single oder EP – Compilations und Bootlegs zählen nicht
// (Dido „White Flag“: eine falsch datierte Doppel-CD „Life for Rent / No Angel“ mit 1999 statt 2003). Gibt es nur
// Compilations, zählen die; ohne Veröffentlichungsliste das von MusicBrainz genannte erste Datum.
function recYear(rec) {
  // Live-Mitschnitte zählen nicht (MusicBrainz: „live, 2015-11-22: Saturday Night Live …“) – das Original kam vorher
  if (/^live\b/i.test(rec.disambiguation || '')) return NaN;
  const all = rec.releases || [], rels = all.filter(r => !/bootleg|pseudo|withdrawn/i.test(r.status || ''));
  if (all.length && !rels.length) return NaN;   // nur als Bootleg erschienen (Adele: SNL-Mitschnitt, falsch auf 2005 datiert)
  const earliest = list => Math.min(...list.map(r => parseInt(r.date)).filter(y => y >= 1900));
  const orig = rels.filter(r => !(r['release-group']?.['secondary-types'] || []).includes('Compilation'));
  for (const list of [orig, rels]) { const y = earliest(list); if (isFinite(y)) return y; }
  return parseInt(rec['first-release-date']);
}
function mbYearJob(t) {
  return async () => {
    if (t.id in state.mb) return;
    const title = baseTitle(t.title), artist = artistOf(t);
    if (!normStr(title) || !normStr(artist)) { state.mb[t.id] = 0; return; }
    try {
      // Nur Aufnahmen suchen, die vor dem Spotify-Jahr erschienen sind – bekannte Songs haben sonst Hunderte Treffer.
      // Gibt es mehr Treffer als eine Seite (100) – z. B. „Purple Rain“ mit vielen Live-Mitschnitten –, wird gezielt nach
      // noch früheren gesucht (bis vor das bisher früheste Jahr), höchstens dreimal.
      const vs = artistVariants(artist), base = `recording:"${title.replace(/"/g, '')}" AND ${artistQuery(vs)}`;
      t._mbTries = (t._mbTries || 0) + 1;
      let best = null, upto = t.year ? t.year - 1 : null;
      for (let page = 0; page < 3; page++) {
        const q = upto ? `${base} AND firstreleasedate:[1900 TO ${upto}]` : base;
        if (page) await sleep(1100);
        const j = await mbJson('https://musicbrainz.org/ws/2/recording?fmt=json&limit=100&query=' + encodeURIComponent(q));
        const before = best;
        for (const rec of j.recordings || []) {
          if ((rec.score ?? 0) < 90 || normStr(rec.title) !== normStr(title)) continue;
          const credit = normStr((rec['artist-credit'] || []).map(a => a.name || a.artist?.name).join(''));
          if (!vs.some(v => credit.includes(normStr(v)) || (credit && normStr(v).includes(credit)))) continue;
          const y = recYear(rec);
          if (y >= 1900 && (!best || y < best)) best = y;
        }
        // Alles gesehen, oder diese Seite brachte nichts Früheres → fertig
        if ((j.count ?? 0) <= (j.recordings || []).length || !best || best === before) break;
        upto = best - 1;
      }
      // Nur übernehmen, wenn es früher ist als das Spotify-Jahr (Best-of/Remaster sind immer später)
      state.mb[t.id] = best && (!t.year || best < t.year) ? best : 0;
      LS.set('mb', state.mb);
      if (state.mb[t.id] && round?.track === t) {
        if (round.phase === 'revealed') {
          const h = state.history.find(x => x.id === t.id && x.n === round.n);
          if (h && state.yearFix[t.id] == null) { h.year = yearOf(t); LS.set('history', state.history); renderHist(); }
          renderReveal(); Lobby.syncRound();   // Handys und Fernseher bekommen das richtige Jahr
        }
      }
    } catch { mbPauseUntil = Date.now() + 120000; /* offline o. ä. – später erneut versuchen */ }
    await sleep(1100);
  };
}

/* ---------------- Künstler über MusicBrainz: Land, Band/Solo, Sänger/Sängerin ---------------- */
// Erst die Aufnahme suchen (Titel + Interpret) – so ist klar, welcher Künstler gemeint ist (es gibt z. B. zwei Bands „Nirvana“).
// Dann den Künstler nachschlagen. Ergebnis je Künstler gespeichert ({} = MusicBrainz kennt ihn nicht).
const ARTIST_FACTS = ['country', 'kind', 'gender'];
// Hauptkünstler: der erste Interpret – bei Namen mit Komma („Earth, Wind & Fire“) steht er vollständig in a1
const artistOf = t => (t.a1 || t.artists.split(',')[0] || '').trim();
const REGION_NAMES = {};   // je Sprache (die Sprache kann beim Spielleiter während des Spiels wechseln)
function regionName(code) {
  if (code === 'XE') return tx('Europa');
  if (code === 'XW') return tx('Weltweit');
  try { return (REGION_NAMES[LANG] ??= new Intl.DisplayNames([LANG], { type: 'region' })).of(code) || code; } catch { return code; }
}
const artistCountry = t => state.mbArtist[normStr(artistOf(t))]?.c || '';   // ISO-Code für die Handys (übersetzen selbst)
const KIND_DE = { Person: 'Solo', Group: 'Band', Orchestra: 'Orchester', Choir: 'Chor' };
const GENDER_DE = { Male: 'Sänger', Female: 'Sängerin', 'Non-binary': 'Nicht-binär' };
// Antwort für country/kind/gender: null = noch nicht nachgeschlagen, '' = unbekannt, sonst Text
function artistFact(t, what) {
  const a = state.mbArtist[normStr(artistOf(t))];
  // Noch nicht nachgeschlagen – oder ein alter Eintrag ohne Ergebnis (vor 4.17.7), der gerade neu geholt wird
  if (!a || !Object.keys(a).length || (!a.v && !a.c)) return null;
  const guest = t.artists.length > artistOf(t).length ? ' · ' + tx('mit Gast') : '';   // Spotify nennt Gastkünstler als weitere Interpreten
  if (what === 'country') return a.c ? regionName(a.c) : '';
  if (what === 'kind') return KIND_DE[a.t] ? tx(KIND_DE[a.t]) + guest : '';
  // Geschlecht gibt es nur bei Einzelpersonen – bei Bands, Orchestern, Chören entscheidet die Runde (z. B. nach der Stimme)
  if (what === 'gender') return a.t && a.t !== 'Person' ? tx('🤔 {k} – ihr entscheidet selbst', { k: tx(KIND_DE[a.t] || 'Gruppe') }) : GENDER_DE[a.g] ? tx(GENDER_DE[a.g]) + guest : '';
  return '';
}
// Bekannt = nachgeschlagen (mit Ergebnis oder als „nicht gefunden“ markiert). Leere Einträge älterer Versionen werden erneut versucht.
// Bekannt = mit der aktuellen Methode nachgeschlagen (v: 2 – Herkunft über den Geburtsort). Ältere Einträge werden einmal neu geholt.
const mbArtistKnown = k => (state.mbArtist[k]?.v || 0) >= 3;   // v: 3 = mit Namensvetter-Prüfung (4.19.1)
// Land eines Orts: direkt über den ISO-Code, sonst über das übergeordnete Gebiet (Stadt → Bezirk → Region …).
// Ergebnis je Ort gespeichert, so muss eine Stadt nur einmal nachgeschlagen werden.
const areaCode = a => a?.['iso-3166-1-codes']?.[0] || (a?.['iso-3166-2-codes']?.[0] || '').split('-')[0] || '';
async function mbAreaCountry(a, depth = 0) {
  const own = areaCode(a);
  if (own) return own;
  if (!a?.id || depth > 4) return '';
  if (a.id in state.mbArea) return state.mbArea[a.id];
  await sleep(1100);
  const x = await mbJson('https://musicbrainz.org/ws/2/area/' + a.id + '?fmt=json&inc=area-rels');
  const parents = (x.relations || []).filter(r => r.type === 'part of' && r.direction === 'backward' && r.area).map(r => r.area);
  let c = areaCode(x) || parents.map(areaCode).find(Boolean) || '';
  if (!c && parents[0]) c = await mbAreaCountry(parents[0], depth + 1);
  state.mbArea[a.id] = c; LS.set('mbArea', state.mbArea);
  return c;
}
function artistLookup(t) {
  const k = normStr(artistOf(t));
  if (!k || mbArtistKnown(k)) return;
  mbQueue(artistJob(t), true);
}
function artistJob(t) {
  const name = artistOf(t), k = normStr(name);
  return async () => {
    if (mbArtistKnown(k)) return;
    const vs = artistVariants(name), keys = vs.map(normStr);
    t._mbArtTries = (t._mbArtTries || 0) + 1;
    try {
      const MB = 'https://musicbrainz.org/ws/2/';
      const q = `recording:"${baseTitle(t.title).replace(/"/g, '')}" AND ${artistQuery(vs)}`;
      const j = await mbJson(MB + 'recording?fmt=json&limit=15&query=' + encodeURIComponent(q));
      // Namensvettern (z. B. „BUNT.“ aus Deutschland und „Bunt“ aus Australien): Es gewinnt der Künstler, der bei den
      // meisten passenden Aufnahmen genannt ist; exakt gleich geschriebener Name (mit Punkt, Groß/klein) zählt extra
      const votes = new Map();
      for (const rec of j.recordings || []) {
        if ((rec.score ?? 0) < 85) continue;
        const ac = (rec['artist-credit'] || []).find(x => keys.includes(normStr(x.artist?.name)) || keys.includes(normStr(x.name)));
        if (!ac?.artist?.id) continue;
        const exact = vs.some(v => v === ac.name || v === ac.artist.name);
        votes.set(ac.artist.id, (votes.get(ac.artist.id) || 0) + 1 + (exact ? 2 : 0));
      }
      let id = [...votes].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      await sleep(1100);
      if (!id) {   // Aufnahme nicht gefunden → Künstler direkt suchen (gleicher Name)
        const s = await mbJson(MB + 'artist?fmt=json&limit=5&query=' + encodeURIComponent(artistQuery(vs)));
        const cands = (s.artists || []).filter(x => (x.score ?? 0) >= 90 && keys.includes(normStr(x.name)));
        id = (cands.find(x => vs.includes(x.name)) || cands[0])?.id || null;
        await sleep(1100);
      }
      let info = { n: 1, v: 3 };   // n = nachgeschlagen, aber nicht gefunden
      if (id) {
        const x = await mbJson(MB + 'artist/' + id + '?fmt=json');
        // Herkunftsland: bei Personen der Geburtsort (begin-area) – „area“ ist dort oft der Wohnort
        // (Rihanna: USA statt Barbados, Tina Turner: Schweiz statt USA). Bei Bands das Gründungsland.
        let c = x.country || areaCode(x.area);
        if (x.type === 'Person' && x['begin-area']) {
          const bc = await mbAreaCountry(x['begin-area']).catch(() => '');
          if (bc) c = bc;
        }
        info = { c, t: x.type || '', g: x.gender || '', v: 3 };
      }
      state.mbArtist[k] = info; LS.set('mbArtist', state.mbArtist);
      // Kam die Antwort erst nach der Auflösung: nachreichen (auch an Handys und Fernseher)
      if (round && normStr(artistOf(round.track)) === k && ARTIST_FACTS.includes(round.cat.answer)) {
        if (round.phase === 'revealed') { renderReveal(); Lobby.syncRound(); } else render();
      }
    } catch {
      mbPauseUntil = Date.now() + 120000;   // offline o. ä. – Hintergrund-Suche später erneut
      // Künstler der laufenden Runde: nach ein paar Sekunden nochmal versuchen (MusicBrainz war z. B. kurz beschäftigt)
      if (round && normStr(artistOf(round.track)) === k && (t._mbArtTries || 0) < 4) setTimeout(() => artistLookup(t), 8000);
    }
    await sleep(1100);
  };
}

/* ---------------- Tipps ---------------- */
// Tipps einer Runde (höchstens „Tipps pro Runde“): { s: Satz, v: Werte } – Satz und Werte auf Deutsch, so kann jedes Handy
// sie in seine Sprache übersetzen (hintText). Land: { s, cc } (Ländercode), unscharfes Cover: { cover }.
function hintsFor(cat, t) {
  const max = +state.settings.hintMax || 0;
  if (!max) return [];
  return withLang('de', () => {
    const y = yearOf(t), dec = y ? decLabel(Math.floor(y / 10) * 10) : null;
    const first = s => (baseTitle(s).replace(/^(the|die|der|das)\s+/i, '').match(/[\p{L}\p{N}]/u) || ['?'])[0].toUpperCase();
    const words = baseTitle(t.title).split(/\s+/).filter(Boolean).length;
    const part = y ? ['Anfang', 'Anfang', 'Anfang', 'Mitte', 'Mitte', 'Mitte', 'Mitte', 'Ende', 'Ende', 'Ende'][y % 10] : null;
    const H = (s, v) => ({ s, v });
    const artist0 = artistOf(t);
    const cover = t.cover ? { cover: t.thumb || t.cover } : null;   // unscharfes Vorschaubild – klein reicht
    const decH = dec && H('Erschienen in den {d}n', { d: dec }), artH = H('Der Interpret beginnt mit „{c}“', { c: first(artist0) });
    const cc = artistCountry(t);
    const list = {
      title: [H('Der Titel beginnt mit „{c}“', { c: first(t.title) }), H(words === 1 ? 'Der Titel hat {n} Wort' : 'Der Titel hat {n} Wörter', { n: words }), cover],
      artist: [artH, decH, cover],
      year: [decH, part && H('{p} der {d}', { p: part, d: dec }), artH],
      range: [decH, part && H('{p} der {d}', { p: part, d: dec }), artH],
      decade: [y && H(y < 2000 ? 'Vor 2000 erschienen' : 'Ab 2000 erschienen'), artH, H('Der Titel beginnt mit „{c}“', { c: first(t.title) })],
      album: [t.album && H('Das Album beginnt mit „{c}“', { c: first(t.album) }), decH, cover],
      film: [filmsOf(t)[0] && H('Der Film/die Serie beginnt mit „{c}“', { c: first(filmsOf(t)[0]) }), decH, artH],
      none: [decH, artH, cover],
      country: [cc && { s: 'Das Land beginnt mit „{c}“', cc }, artH, cover],
      kind: [artH, decH, cover],
      gender: [artH, decH, cover],
    }[cat.answer] || [];
    return list.filter(Boolean).slice(0, max);
  });
}
// Werte eines Tipps übersetzen: feste Wörter („Anfang“), Jahrzehnte („80er“), Land über den Code
const locPart = p => {
  let m;
  if (hasTx(p)) return tx(p);
  if ((m = p.match(/^(\d{2,4})er$/))) return tx('{d}er', { d: m[1] });
  return p;
};
function hintText(h) {
  const v = Object.fromEntries(Object.entries(h.v || {}).map(([k, x]) => [k, locPart(String(x))]));
  if (h.cc) v.c = (regionName(h.cc) || '?')[0].toUpperCase();
  return tx(h.s, v);
}
// Kurzform für die Zeile unter der Frage (Handys, Fernseher, „Meine Karte“) – der Hinweis oben zeigt den ganzen Satz
const HINT_SHORT = {
  'Der Titel beginnt mit „{c}“': 'Titel: {c}…', 'Der Titel hat {n} Wort': '1 Wort', 'Der Titel hat {n} Wörter': '{n} Wörter',
  'Der Interpret beginnt mit „{c}“': 'Interpret: {c}…', 'Das Album beginnt mit „{c}“': 'Album: {c}…', 'Der Film/die Serie beginnt mit „{c}“': 'Film: {c}…', 'Das Land beginnt mit „{c}“': 'Land: {c}…',
  'Vor 2000 erschienen': 'vor 2000', 'Ab 2000 erschienen': 'ab 2000',
};
function hintShort(h) {
  if (h.s === 'Erschienen in den {d}n') return locPart(String(h.v?.d ?? ''));   // einfach „80er“
  return hintText(HINT_SHORT[h.s] ? { ...h, s: HINT_SHORT[h.s] } : h);
}
// Eine ruhige Zeile: Glühbirne, dann die Tipps mit Punkten getrennt (Cover als winziges unscharfes Bild)
const hintsLine = list => list?.length ? `<div class="hints-line">${ic('bulb')}<span>${list.map(h => h.cover
  ? `<img src="${esc(h.cover)}" alt="${tx('Unscharfes Cover')}">` : esc(hintShort(h))).join('<i>·</i>')}</span></div>` : '';
const hintHtml = h => h.cover ? `<img src="${esc(h.cover)}" alt="${tx('Unscharfes Cover')}">` : `<div class="hint-item">${ic('bulb')}${esc(hintText(h))}</div>`;
function renderHints() {
  const box = $('#hintBox');
  const show = round && round.hints && round.phase !== 'revealed';
  box.classList.toggle('hidden', !show);
  if (!show) return;
  box.innerHTML = hintsFor(round.cat, round.track).slice(0, round.hints).map(hintHtml).join('');
}
// Nächsten Tipp aufdecken – vom Spielleiter oder auf Wunsch eines Mitspielers (by = Name). Alle Handys und der Fernseher
// bekommen ihn mit der Runde (Lobby.syncRound).
// Spielt der Spielleiter in der Lobby mit und sind die Tipps pro Spieler begrenzt, gilt das Limit auch für ihn
function hostHintsLeft() {
  const pp = +state.settings.hintPP || 0;
  if (!pp || !Lobby.code || !Lobby.me()) return Infinity;
  return Math.max(0, pp - (state.match?.hu?.[Lobby.uid] || 0));
}
function giveHint(by = null) {
  if (!round || round.phase === 'revealed') return false;
  if (!by && hostHintsLeft() <= 0) { toast(tx('Deine Tipps für diese Partie sind aufgebraucht')); return false; }
  const max = hintsFor(round.cat, round.track).length;
  if ((round.hints || 0) >= max) { if (!by) toast(max ? tx('Keine weiteren Tipps') : tx('Tipps sind ausgeschaltet (Einstellungen → Tipps pro Runde)')); return false; }
  round.hintBy ??= [];
  round.hintBy[round.hints || 0] = by || '';
  round.hints = (round.hints || 0) + 1;
  beep(990, .1);
  render(); Lobby.syncRound();
  if (by) toast(tx('💡 {n} hat einen Tipp geholt', { n: by }), 4000);
  else if (hostHintsLeft() !== Infinity && state.match) {   // eigener Tipp des mitspielenden Spielleiters zählt
    state.match.hu = { ...(state.match.hu || {}), [Lobby.uid]: (state.match.hu?.[Lobby.uid] || 0) + 1 }; saveMatch(); render();
  }
  return true;
}
// Mitspieler wünschen sich einen Tipp (Knopf am Handy). Mehrere Wünsche gleichzeitig ergeben nur einen Tipp;
// round.hrT merkt sich den zuletzt verarbeiteten Wunsch.
function checkHintReq() {
  if (!Lobby.code || !round || round.phase === 'revealed') return;
  const reqs = lobbyList().filter(p => p.hr?.n === round.id && p.hr.t > (round.hrT || 0) && p.id !== Lobby.uid).sort((a, b) => a.hr.t - b.hr.t);
  if (!reqs.length) return;
  round.hrT = reqs.at(-1).hr.t;
  const pp = +state.settings.hintPP || 0, m = state.match, used = m?.hu || {};
  const who = reqs.find(p => !pp || (used[p.id] || 0) < pp);   // wer noch Tipps übrig hat
  if (!who || !giveHint(who.name)) return;
  if (m) { m.hu = { ...used, [who.id]: (used[who.id] || 0) + 1 }; saveMatch(); }
}
