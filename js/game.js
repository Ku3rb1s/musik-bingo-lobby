// Musik-Bingo – Spielablauf: Runden, Countdown, Auflösung, Originaljahr (MusicBrainz), Tipps
'use strict';

/* ---------------- Spielablauf ---------------- */
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
async function nextRound() {
  if (needSongs()) return;
  const cats = roundCats();
  if (!cats.length) return toast('Keine Kategorie aktiv – siehe Einstellungen');
  Player.unlock(); keepScreenOn();
  stopTimer(); clearTimeout(snippetT);
  // Für „Rückgängig“: vorherige Runde merken
  const prev = round ? { round, played: state.played.slice() } : null;
  let pool = state.tracks.filter(t => !state.played.includes(t.id));
  let reshuffled = false;
  if (!pool.length) { reshuffled = true; state.played = []; pool = state.tracks.slice(); }
  const track = pool[Math.floor(Math.random() * pool.length)];
  const cat = cats[Math.floor(Math.random() * cats.length)];
  state.played.push(track.id); LS.set('played', state.played);
  // n = Anzeige (übersprungene Runden behalten die Nummer), id = eindeutig – daran hängen die Tipps in der Lobby
  round = { n: (state.history[0]?.n || 0) + 1, id: Date.now(), track, cat, phase: 'playing', hints: 0, pos: Player.startMs(track) };
  mbLookup(track);
  spinCategory(cat);
  render(); Lobby.syncRound();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (reshuffled) toast('Alle Songs wurden gespielt – die Liste wird neu gemischt');
  // Rückgängig nur beim Überspringen (Song lief noch, Runde war nicht aufgelöst)
  else if (prev && prev.round.phase !== 'revealed') toast('Song übersprungen', 5000, { label: 'Rückgängig', fn: () => undoNext(prev) });
  await playSnippet();
}
// Zurück zur vorherigen Runde (versehentlich „Nächster Song“ oder „Überspringen“ getippt)
function undoNext(prev) {
  stopTimer(); clearTimeout(snippetT); cancelSpin();
  round = prev.round;
  if (round.phase === 'countdown') round.phase = 'playing';
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
    return toast('Wiedergabe-Fehler: ' + e.message, 7000);
  }
  const lim = +state.settings.limit;
  if (lim) snippetT = setTimeout(() => {
    if (round !== r || r.phase === 'revealed') return;
    Player.pause(); r.snippetDone = true; renderPlayState();
  }, lim * 1000);
}

function showCat(c) {
  const [icon, color] = catStyle(c);
  $('#catName').textContent = c.name; $('#catIcon').textContent = icon;
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
    try { navigator.vibrate?.(15); } catch {}
  }, 1100);
}

function startCountdown() {
  if (!round || round.phase !== 'playing') return;
  Player.unlock();
  round.phase = 'countdown'; round.timeUp = false;
  const total = state.settings.seconds * 1000, end = Date.now() + total;
  round.end = end; Lobby.syncRound();   // Fernseher-Ansicht zeigt den Countdown mit
  const ring = $('#ring'), C = 2 * Math.PI * 56;
  ring.style.strokeDasharray = C;
  let lastSec = null;
  render();
  const tick = () => {
    const rem = Math.max(0, end - Date.now()), s = Math.ceil(rem / 1000);
    $('#timerNum').textContent = s;
    ring.style.strokeDashoffset = C * (1 - rem / total);
    $('#discWrap').classList.toggle('urgent', s <= 5);
    if (s !== lastSec) { if (s <= 3 && s > 0) beep(880, .08); lastSec = s; }
    if (rem <= 0) {
      stopTimer(); beep(440, .7, .3);
      if (state.settings.autoReveal) reveal();
      else { round.timeUp = true; $('#timerNum').textContent = '⏰'; render(); }
    }
  };
  tick(); timerIv = setInterval(tick, 100);
}

function reveal() {
  if (!round || round.phase === 'revealed') return;
  stopTimer(); clearTimeout(snippetT);
  round.phase = 'revealed';
  const t = round.track;
  state.history.unshift({ n: round.n, cat: round.cat.name, catId: round.cat.id, title: t.title, artists: t.artists, year: yearOf(t), id: t.id });
  state.history = state.history.slice(0, 300); LS.set('history', state.history);
  if (state.settings.pauseOnReveal) Player.pause();
  beep(1046, .25);
  render(); renderHist(); Lobby.syncRound();
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
    case 'title': return esc(t.title);
    case 'artist': return esc(t.artists);
    case 'year': return y ?? '?';
    case 'decade': return decadeOf(y);
    case 'range': return y ? `${y} <span class="small">(richtig: ${y - cat.tol}–${y + cat.tol})</span>` : '?';
    case 'album': return esc(t.album || '?');
    default: return `${esc(t.artists)} – ${esc(t.title)}`;
  }
}

async function fixYear() {
  const t = round?.track; if (!t) return;
  const v = await ask(`Richtiges Erscheinungsjahr für „${t.title}“?\nSpotify liefert das Datum des Albums – bei Best-of oder Remaster oft falsch.`, { input: String(yearOf(t) ?? ''), ok: 'Speichern' });
  if (v == null) return;
  const y = parseInt(v);
  if (!y || y < 1000 || y > 2100) return toast('Ungültiges Jahr');
  state.yearFix[t.id] = y; LS.set('yearFix', state.yearFix);
  if (state.history[0]?.id === t.id) { state.history[0].year = y; LS.set('history', state.history); }
  render(); renderHist(); Lobby.syncRound();
}

async function loadCover(t) {
  if (t.cover || t._coverTried) return;
  t._coverTried = true;
  try {
    const r = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent('https://open.spotify.com/track/' + t.id));
    const j = await r.json();
    if (j.thumbnail_url) { t.cover = j.thumbnail_url; LS.set('tracks', state.tracks); if (round?.track === t && round.phase === 'revealed') { renderReveal(); Lobby.syncRound(); } }
  } catch {}
}

/* ---------------- Originaljahr über MusicBrainz ---------------- */
// Entfernt Zusätze wie „- Remastered 2011“ oder „(feat. X)“, die es nur in Spotify-Titeln gibt.
function baseTitle(s) {
  return String(s || '')
    .replace(/\s*[-–—]\s*(\d{4}\s*)?(remaster(ed)?|re-?recorded|remix|radio edit|single version|album version|mono|stereo|live|edit|version|mix|original).*$/i, '')
    .replace(/\s*[([][^)\]]*(feat\.?|ft\.|with |remaster|version|edit|mix|live|mono|stereo)[^)\]]*[)\]]/ig, '')
    .trim();
}
const normStr = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
let mbBusy = Promise.resolve();
function mbLookup(t) {
  if (!state.settings.mb || t.id in state.mb) return;
  // MusicBrainz erlaubt ca. 1 Anfrage pro Sekunde → Anfragen nacheinander
  mbBusy = mbBusy.then(async () => {
    if (t.id in state.mb) return;
    const title = baseTitle(t.title), artist = (t.artists.split(',')[0] || '').trim();
    if (!normStr(title) || !normStr(artist)) { state.mb[t.id] = 0; return; }
    try {
      // Nur Aufnahmen suchen, die vor dem Spotify-Jahr erschienen sind – bekannte Songs haben sonst Hunderte Treffer
      let q = `recording:"${title.replace(/"/g, '')}" AND artist:"${artist.replace(/"/g, '')}"`;
      if (t.year) q += ` AND firstreleasedate:[1900 TO ${t.year - 1}]`;
      const url = 'https://musicbrainz.org/ws/2/recording?fmt=json&limit=100&query=' + encodeURIComponent(q);
      let r = await fetch(url);
      if (r.status === 503) { await sleep(2500); r = await fetch(url); }   // kurz überlastet / Ratenlimit
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      let best = null;
      for (const rec of j.recordings || []) {
        if ((rec.score ?? 0) < 90 || normStr(rec.title) !== normStr(title)) continue;
        const credit = normStr((rec['artist-credit'] || []).map(a => a.name || a.artist?.name).join(''));
        if (!credit.includes(normStr(artist)) && !normStr(artist).includes(credit)) continue;
        const y = parseInt(rec['first-release-date']);
        if (y >= 1900 && (!best || y < best)) best = y;
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
    } catch { /* offline o. ä. – beim nächsten Mal erneut versuchen */ }
    await sleep(1100);
  });
}

/* ---------------- Tipps ---------------- */
function hintsFor(cat, t) {
  const y = yearOf(t), dec = y ? decLabel(Math.floor(y / 10) * 10) : null;
  const first = s => (baseTitle(s).replace(/^(the|die|der|das)\s+/i, '').match(/[\p{L}\p{N}]/u) || ['?'])[0].toUpperCase();
  const words = baseTitle(t.title).split(/\s+/).filter(Boolean).length;
  const part = y ? ['Anfang', 'Anfang', 'Anfang', 'Mitte', 'Mitte', 'Mitte', 'Mitte', 'Ende', 'Ende', 'Ende'][y % 10] : null;
  const artist0 = t.artists.split(',')[0];
  const cover = t.cover ? { cover: t.cover } : null;
  const list = {
    title: [`Der Titel beginnt mit „${first(t.title)}“`, `Der Titel hat ${words} ${words === 1 ? 'Wort' : 'Wörter'}`, cover],
    artist: [`Der Interpret beginnt mit „${first(artist0)}“`, dec && `Erschienen in den ${dec}`, cover],
    year: [dec && `Erschienen in den ${dec}`, part && `${part} der ${dec}`],
    range: [dec && `Erschienen in den ${dec}`, part && `${part} der ${dec}`],
    decade: [y && (y < 2000 ? 'Vor 2000 erschienen' : 'Ab 2000 erschienen'), `Der Interpret beginnt mit „${first(artist0)}“`],
    album: [`Das Album beginnt mit „${first(t.album)}“`, dec && `Erschienen in den ${dec}`, cover],
    none: [dec && `Erschienen in den ${dec}`, `Der Interpret beginnt mit „${first(artist0)}“`, cover],
  }[cat.answer] || [];
  return list.filter(Boolean).slice(0, 2);   // immer (höchstens) 2 Tipps pro Runde
}
function renderHints() {
  const box = $('#hintBox');
  const show = round && round.hints && round.phase !== 'revealed';
  box.classList.toggle('hidden', !show);
  if (!show) return;
  box.innerHTML = hintsFor(round.cat, round.track).slice(0, round.hints).map(h =>
    h.cover ? `<img src="${esc(h.cover)}" alt="Unscharfes Cover">` : `<div class="hint-item">${ic('bulb')}${esc(h)}</div>`).join('');
}
function giveHint() {
  if (!round || round.phase === 'revealed') return;
  const max = hintsFor(round.cat, round.track).length;
  if ((round.hints || 0) >= max) return toast('Keine weiteren Tipps');
  round.hints = (round.hints || 0) + 1;
  beep(990, .1);
  render();
}
