// Musik-Bingo – Grundlagen: Hilfsfunktionen, Konstanten, Spielzustand, Hinweise, Menüs (Sheets)
'use strict';

// iPhone/iPad erkennen – iPadOS meldet sich als Mac, verrät sich aber über den Touchscreen
if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) document.documentElement.classList.add('ios');
const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ic = n => `<svg class="ic"><use href="#i-${n}"/></svg>`;

// Bei jedem Update hochzählen (wird unten in den Einstellungen angezeigt)
const APP_VERSION = '4.12.1', APP_DATE = '11.10.2026';

const LS = {
  get(k, d) { try { const v = localStorage.getItem('mb_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mb_' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('mb_' + k); } catch {} },
};

// Client ID der Musik-Bingo-App im Spotify-Dashboard. Sie ist kein Geheimnis (PKCE-Login ohne Client Secret).
const DEFAULT_CLIENT_ID = 'c70410ac2fb640c1b6c4bbd4732cc749';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SCOPES = 'streaming user-read-email user-read-private playlist-read-private playlist-read-collaborative user-read-playback-state user-modify-playback-state';
const REDIRECT = location.origin + location.pathname.replace(/index\.html$/, '');

// Firebase-Projekt für die Bingo-Lobbys (Realtime Database + anonyme Anmeldung). Auch das ist kein Geheimnis –
// geschützt wird die Datenbank durch die Regeln in database.rules.json. Bleibt es leer, laufen die Karten
// wie bisher ohne Server über den Link im QR-Code.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAmAfQj1wRPXCkSKJxjv_qhwTbsrL92FRc',
  authDomain: 'musik-bingo-ku3rb1s.firebaseapp.com',
  databaseURL: 'https://musik-bingo-ku3rb1s-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'musik-bingo-ku3rb1s',
  appId: '1:124964911502:web:ff5d409e2bfafd646c0cdf',
};
const FIREBASE_VER = '10.12.2';
const hasFirebase = () => !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL);

const DEFAULT_CATS = [
  { id: 'title',  name: 'Titel des Songs',            answer: 'title',  enabled: true, builtin: true },
  { id: 'year',   name: 'Genaues Erscheinungsjahr',   answer: 'year',   enabled: true, builtin: true },
  { id: 'artist', name: 'Band / Sänger(in)',          answer: 'artist', enabled: true, builtin: true },
  { id: 'decade', name: 'Aus welchem Jahrzehnt?',     answer: 'decade', enabled: true, builtin: true },
  { id: 'range3', name: 'Erscheinungsjahr ± 3 Jahre', answer: 'range', tol: 3, enabled: true, builtin: true },
  // Neu (4.3.0): Antwort kommt von MusicBrainz – von Haus aus ausgeschaltet
  { id: 'country', name: 'Aus welchem Land kommt der Künstler?', answer: 'country', enabled: false, builtin: true },
  { id: 'kind', name: 'Band oder Solo?', answer: 'kind', enabled: false, builtin: true },
  { id: 'gender', name: 'Sänger oder Sängerin?', answer: 'gender', enabled: false, builtin: true },
];
const ANSWER_TYPES = {
  title: 'Songtitel', artist: 'Interpret', year: 'Genaues Jahr', decade: 'Jahrzehnt',
  range: 'Jahr ± Toleranz', album: 'Album', country: 'Herkunftsland (automatisch)', kind: 'Band oder Solo (automatisch)', gender: 'Sänger oder Sängerin (automatisch)', none: 'Keine – ihr entscheidet selbst',
};
const CAT_STYLE = {
  title: ['🎵', '#1ed760'], artist: ['🎤', '#ff4fa3'], year: ['🎯', '#ffb020'], decade: ['🕰️', '#8b6cff'],
  range: ['📅', '#22d3ee'], album: ['💿', '#ff8a3d'], country: ['🌍', '#60a5fa'], kind: ['👥', '#f87171'], gender: ['🎙️', '#e879f9'], none: ['❓', '#a3e635'],
};
const catStyle = c => {
  const base = CAT_STYLE[c?.answer] || CAT_STYLE.none;
  return [c?.icon || base[0], c?.color || base[1]];
};
// Eigene Kategorien bekommen eine Farbe und ein Symbol, die noch keine andere Kategorie hat
const CUSTOM_COLORS = ['#f43f5e', '#14b8a6', '#6366f1', '#eab308', '#d946ef', '#0ea5e9', '#f97316', '#84cc16', '#ef4444', '#10b981', '#a855f7', '#fb7185'];
const CUSTOM_ICONS = ['⭐', '🔥', '💎', '🎸', '🎹', '🥁', '🎺', '🌍', '💃', '🎬', '❤️', '🚀'];
// Passendes Symbol zur Frage: Stichwörter im Text (Reihenfolge zählt – „Jahrzehnt“ vor „Jahr“)
const ICON_WORDS = [
  [/jahrzehnt|dekade/, '🕰️'], [/album|platte|\blp\b/, '💿'], [/film|movie|serie|soundtrack|kino/, '🎬'],
  [/musikvideo|video|\btv\b|fernseh/, '📺'], [/konzert|festival|\blive\b|tour/, '🎪'], [/eurovision|\besc\b|casting|show/, '🎙️'],
  [/chart|platz|nummer|\bhits?\b|erfolg|grammy|preis|award/, '🏆'], [/stadt|city/, '🏙️'], [/land|herkunft|nation|welt|kontinent/, '🌍'],
  [/rap|hip.?hop|\bdj\b|techno|elektro|\bedm\b|house/, '🎧'], [/genre|stil|rock|metal|gitarre|punk/, '🎸'],
  [/klavier|piano|keyboard|instrument/, '🎹'], [/schlagzeug|drum/, '🥁'], [/trompete|saxophon|bläser/, '🎺'],
  [/tanz|dance|disco|choreo/, '💃'], [/liebe|love|herz/, '❤️'], [/weihnacht|xmas|christmas/, '🎄'], [/sommer|summer|sonne|urlaub/, '☀️'],
  [/party|feier/, '🎉'], [/cover|bild|foto/, '🖼️'], [/label|plattenfirma/, '🏷️'], [/sprache|language/, '🗣️'],
  [/songtext|text|lyrics|zeile|refrain|strophe/, '📝'], [/länge|dauer|minute|sekunde|tempo|bpm/, '⏱️'],
  [/duett|feat|zusammen|mitglied|besetzung/, '👥'], [/remix|neuauflage|coverversion|original/, '🔁'],
  [/sänger|saenger|stimme|singt|band|interpret|künstler|kuenstler|gruppe|rapper/, '🎤'],
  [/jahr|wann|erschien/, '📅'], [/titel|song|lied|name/, '🎵'],
];
const iconFor = (name, answer) => [ICON_WORDS.find(([re]) => re.test(String(name).toLowerCase()))?.[1], answer !== 'none' && CAT_STYLE[answer]?.[0]].filter(Boolean);
function assignStyle(cat, cats) {
  const usedC = new Set(cats.map(c => catStyle(c)[1].toLowerCase()));
  const usedI = new Set(cats.map(c => catStyle(c)[0]));
  cat.color = CUSTOM_COLORS.find(c => !usedC.has(c)) || CUSTOM_COLORS[cats.length % CUSTOM_COLORS.length];
  // Passendes Symbol (lieber eines, das noch frei ist), sonst ein freies aus der Liste
  const fit = iconFor(cat.name, cat.answer);
  cat.icon = fit.find(i => !usedI.has(i)) || fit[0] || CUSTOM_ICONS.find(i => !usedI.has(i)) || CUSTOM_ICONS[cats.length % CUSTOM_ICONS.length];
  return cat;
}

const state = {
  clientId: LS.get('clientId', '') || DEFAULT_CLIENT_ID,
  tok: LS.get('tok', null),
  me: LS.get('me', null),
  tracks: LS.get('tracks', []),
  sources: LS.get('sources', []),
  played: LS.get('played', []),
  cats: LS.get('cats', null) || structuredClone(DEFAULT_CATS),
  settings: Object.assign({ seconds: 30, start: 'begin', beep: true, buzzSound: false, autoReveal: true, pauseOnReveal: false, mode: 'auto', volume: 80,
    limit: 0, hints: true, mb: true, theme: 'graphit', lobby: true, games: 0, hostPlays: true }, LS.get('settings', {})),
  bingo: (b => b?.k ? b : null)(LS.get('bingo', null)),   // { g, s, k: [{ i, c, e, n }] } – aktuelle Bingo-Runde
  lobby: LS.get('lobby', null),     // Code der eigenen Lobby (Firebase), solange Bingo läuft
  match: LS.get('match', null),     // Partien & Siege in der Lobby (siehe newMatch)
  partieFrom: LS.get('partieFrom', 0),   // Rundennummer, ab der die aktuelle Partie zählt (für die Bingo-Prüfung)
  mb: LS.get('mb', {}),             // Originaljahre laut MusicBrainz (0 = nichts Besseres gefunden)
  mbArtist: LS.get('mbArtist', {}),   // Künstler laut MusicBrainz: { c: Land (ISO), t: Art (Person/Group/…), g: Geschlecht } – {} = nicht gefunden
  yearFix: LS.get('yearFix', {}),
  history: LS.get('history', []),
  lastRev: LS.get('lastRev', null),   // zuletzt aufgelöste Runde { id, i, q, n } – darf noch nachgetragen werden
};
// Ältere eigene Kategorien (noch ohne eigene Farbe) nachträglich einfärben
LS.del('mbCountry');   // Vorgänger von mbArtist (4.3.0)
// 4.11.1: Buzzer-Ton ist jetzt standardmäßig aus – einmalig auch bei allen, die ihn mit 4.10.x automatisch an hatten
if (!LS.get('buzzOff1', false)) { state.settings.buzzSound = false; LS.set('settings', state.settings); LS.set('buzzOff1', true); }
// Neue Standard-Kategorien auch bei bestehenden Spielern ergänzen – so, wie sie ausgeliefert werden (Herkunftsland: aus)
if (DEFAULT_CATS.some(d => !state.cats.some(c => c.id === d.id))) {
  for (const d of DEFAULT_CATS) if (!state.cats.some(c => c.id === d.id)) state.cats.push(structuredClone(d));
  LS.set('cats', state.cats);
}
if (state.cats.some(c => !c.builtin && !c.color)) {
  state.cats.forEach((c, i) => { if (!c.builtin && !c.color) assignStyle(c, state.cats.slice(0, i)); });
  LS.set('cats', state.cats);
}
// Bingo-Felder: Farbe/Symbol stecken direkt im Feld (k.c ohne „#“, k.e), ältere Runden hatten nur den Antworttyp (k.a)
const kStyle = k => { const base = CAT_STYLE[k.a] || CAT_STYLE.none; return [k.e || base[0], k.c ? '#' + k.c : base[1]]; };
if (state.bingo) state.bingo.k = state.bingo.k.map(k => { const [e, c] = kStyle(k); return { i: k.i, c: c.slice(1), e, n: k.n }; });
// Firebase lässt leere Listen/Objekte weg → beim Laden ergänzen
if (state.match) { state.match.wins ??= {}; state.match.names ??= {}; state.match.won ??= []; state.match.tips ??= {}; }
let round = null;      // { n, track, cat, phase: 'playing'|'countdown'|'revealed', timeUp }
let spinning = false;

// Reihenfolge: eigene Korrektur > Originaljahr (MusicBrainz) > Spotify-Albumjahr
const mbYear = t => state.settings.mb && state.mb[t.id] > 0 ? state.mb[t.id] : null;
const yearOf = t => state.yearFix[t.id] ?? mbYear(t) ?? t.year ?? null;
// Jahrzehnt: „80er“ / „80s“ / … (Endung aus der Sprachdatei: '{d}er')
const decLabel = d => tx('{d}er', { d: d < 2000 ? String(d).slice(2) : d });
const decadeOf = y => y ? tx('{d}er', { d: Math.floor(y / 10) * 10 }) : '?';

/* ---------------- UI-Helfer ---------------- */
let toastT;
// Hinweis unten/oben; optional mit Knopf: action = { label, fn }
// Hinweis über geöffneten Menüs: ins offene Menü einhängen (sonst ist sein Knopf bei offenem Menü nicht antippbar)
// und als Popover in die oberste Ebene holen (sonst läge er hinter dem Menü). Ohne Popover-Unterstützung reicht das Einhängen.
function placeToast() {
  // Oberstes offenes Fenster: Rückfrage bzw. Tipp-Vollbild liegen über den Menüs
  const open = [...document.querySelectorAll('dialog[open]')];
  const el = $('#toast'), host = open.find(d => d.id === 'dlgAsk') || open.find(d => d.id === 'guessShow') || open[0] || document.body;
  if (el.parentElement !== host) host.appendChild(el);
  if (el.showPopover) { try { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); } catch {} }
}
// Ist gerade ein Hinweis zu sehen und öffnet sich ein Fenster, holt ihn das wieder nach vorn
const raiseToast = () => { if ($('#toast').classList.contains('show')) placeToast(); };
function toast(msg, ms = 3500, action = null) {
  const el = $('#toast'), btn = $('#toastBtn');
  el.style.translate = ''; el.style.opacity = '';   // war der vorige weggewischt
  $('#toastMsg').textContent = msg;
  btn.classList.toggle('hidden', !action);
  if (action) { btn.textContent = action.label; btn.onclick = () => { el.classList.remove('show'); action.fn(); }; }
  placeToast();
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastT);
  toastT = setTimeout(() => { el.classList.remove('show'); toastT = setTimeout(() => { try { el.hidePopover?.(); } catch {} }, 300); }, ms);
}
// Hinweise wegwischen: nach oben schieben (wie beim iPhone), mit Finger oder Maus. Nach unten gibt er nur leicht nach.
// Kurzes Antippen bleibt ein Antippen.
(() => {
  const el = $('#toast');
  let x0 = null, y0 = 0, dx = 0, dy = 0;
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;   // der Knopf im Hinweis (z. B. „Rückgängig“) bleibt antippbar
    x0 = e.clientX; y0 = e.clientY; dx = dy = 0;
    el.style.transition = 'none';
    try { el.setPointerCapture(e.pointerId); } catch {}
  });
  el.addEventListener('pointermove', e => {
    if (x0 == null) return;
    dx = e.clientX - x0; dy = e.clientY - y0;
    const y = dy < 0 ? dy : dy / 4;   // nach unten: Gummiband
    el.style.translate = `0 ${y}px`;
    el.style.opacity = String(Math.max(.25, 1 + Math.min(0, dy) / 120));
  });
  const end = () => {
    if (x0 == null) return;
    x0 = null; el.style.transition = '';
    if (dy < -30) {                         // weit genug nach oben geschoben → wegfliegen lassen und schließen
      el.style.translate = `0 ${Math.min(dy * 3, -150)}px`; el.style.opacity = '0';
      clearTimeout(toastT); el.classList.remove('show');
      toastT = setTimeout(() => { try { el.hidePopover?.(); } catch {} el.style.translate = ''; el.style.opacity = ''; }, 300);
    } else { el.style.translate = ''; el.style.opacity = ''; }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
})();

/* ---------------- Bildschirm an lassen & Spotify aufwecken ---------------- */
let wakeLock = null;
async function keepScreenOn() {
  try { if ('wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } } catch {}
}
const wakeError = msg => Object.assign(new Error(msg), { wake: true });
let wakeRetry = null;
// Die Spotify-App schläft im Hintergrund gern ein → per Knopf öffnen, beim Zurückkommen automatisch weiterspielen
function offerSpotifyWake(msg) {
  wakeRetry = round;   // auch wenn Spotify von Hand geöffnet wird, geht es beim Zurückkommen weiter
  toast(msg + ' ' + tx('Öffne kurz Spotify – danach geht es automatisch weiter.'), 15000, {
    label: tx('Spotify öffnen'),
    fn: () => { location.href = 'spotify://'; },
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (round) keepScreenOn();
  if (typeof Lobby !== 'undefined' && Lobby.code) Lobby.revive();   // Lobby inzwischen aufgeräumt? → neu anlegen
  if (Player.mode === 'connect' && !wakeRetry) Player.syncState();   // wurde in der Spotify-App pausiert/gewechselt?
  if (wakeRetry && wakeRetry === round && round.phase !== 'revealed') {
    wakeRetry = null;
    Player.connectDev = null;
    if (Player.mode !== 'sdk') Player.mode = null;
    setTimeout(() => playSnippet(), 900);   // Spotify braucht einen Moment, um sich anzumelden
  }
});
// Eigener Ersatz für confirm()/prompt() – manche Browser blockieren die nativen Dialoge.
// choice: true → liefert 'yes' / 'no' / '' (weggeklickt) statt true/false; cancel = Text des linken Knopfs
function ask(msg, { input = null, ok = tx('OK'), cancel = tx('Abbrechen'), danger = false, choice = false } = {}) {
  const d = $('#dlgAsk'), inp = $('#askInput');
  if (d.open) d.close();   // eine noch offene Frage gilt als „Abbrechen“
  $('#askMsg').textContent = msg; $('#askOk').textContent = ok; $('#askNo').textContent = cancel;
  $('#askOk').classList.toggle('danger', danger);
  inp.classList.toggle('hidden', input == null); inp.value = input ?? '';
  d.returnValue = '';
  d.showModal(); raiseToast(); if (input != null) inp.select();
  return new Promise(res => d.addEventListener('close', () => {
    const yes = d.returnValue === 'yes';
    res(choice ? d.returnValue : input == null ? yes : (yes ? inp.value : null));
  }, { once: true }));
}
let actx;
function beep(freq = 880, dur = .15, vol = .2) {
  if (!state.settings.beep) return;
  try {
    actx = actx || new AudioContext();
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
  } catch {}
}
// Buzzer-Ton wie in einer Quizshow – bewusst leise und weich: zwei leicht verstimmte Töne, oben abgeschnitten (Tiefpass),
// knapp eine halbe Sekunde. Unabhängig von „Töne beim Countdown“.
function buzzSound() {
  if (state.settings.buzzSound === false) return;
  try {
    actx = actx || new AudioContext(); actx.resume?.();
    const t = actx.currentTime, g = actx.createGain(), lp = actx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .03);
    g.gain.setValueAtTime(.05, t + .3); g.gain.exponentialRampToValueAtTime(.0005, t + .48);
    lp.connect(g).connect(actx.destination);
    for (const f of [180, 188]) { const o = actx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(t); o.stop(t + .5); }
  } catch {}
}
function fillRange(el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); }

/* ---------------- Sheets mit Unterseiten ---------------- */
function openSheet(id, page = 'main') {
  document.querySelectorAll('dialog.sheet[open]').forEach(d => { if (d.id !== id) d.close(); });
  const d = $('#' + id);
  goPage(d, page, false);
  if (!d.open) d.showModal();
  document.body.classList.add('locked');
  raiseToast();
}
function goPage(d, page, back) {
  d.querySelectorAll('.page').forEach(p => {
    const on = p.dataset.page === page;
    p.classList.toggle('active', on);
    p.classList.toggle('back', on && !!back);
  });
  const p = d.querySelector(`.page[data-page="${page}"]`);
  d.querySelector('.nav-title').textContent = p.dataset.title;
  d.querySelector('.nav-back').classList.toggle('invisible', page === 'main');
  d.querySelector('.nav-lang')?.classList.toggle('hidden', page !== 'main');   // Sprache nur auf der Hauptseite der Einstellungen
  d.dataset.page = page;
  d.querySelector('.sheet-body').scrollTop = 0;
  onPage(d.id, page);
}
function onPage(id, page) {
  if (id === 'sheetSettings') {
    if (page === 'main') renderSettings();
    if (page === 'account') renderAccount();
    if (page === 'cats') renderCats();
  } else if (id === 'sheetGame') {
    if (page === 'main') { renderLobby(); renderBingo(); }
    if (page === 'setup' || page === 'invite' || page === 'bset') renderBingo();
    if (page === 'check') renderCheckWho();
    if (page === 'mycard') renderMyCard();
  } else if (id === 'sheetLib') {
    if (page === 'main') renderLib();
    if (page === 'add') { renderAdd(); loadMyPlaylists(); }
  }
}
document.querySelectorAll('dialog').forEach(d => {
  d.addEventListener('close', () => {
    if (!document.querySelector('dialog.sheet[open]')) document.body.classList.remove('locked');
    if (d.contains($('#toast')) && $('#toast').classList.contains('show')) placeToast();
  });
  // Tippen neben das Sheet schließt es
  d.addEventListener('click', e => { if (e.target === d && d.classList.contains('sheet')) d.close(); });
});
// Sheets wie in iOS nach unten wegwischen: an der Kopfzeile oder am Inhalt, wenn er ganz oben ist
document.querySelectorAll('dialog.sheet').forEach(d => {
  const body = d.querySelector('.sheet-body');
  let y0 = null, dy = 0, t0 = 0, dragging = false;
  const reset = () => { d.style.transform = ''; d.style.transition = ''; };
  d.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || e.target.closest('input, select, textarea, #toast')) return;   // Hinweis wegwischen ≠ Menü schließen
    if (!e.target.closest('.sheet-head') && body.scrollTop > 0) return;
    y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0; dragging = false;
  }, { passive: true });
  d.addEventListener('touchmove', e => {
    if (y0 == null) return;
    dy = e.touches[0].clientY - y0;
    if (!dragging) {
      if (dy < -4) { y0 = null; return; }          // nach oben = normal scrollen
      if (dy < 8) return;
      if (!e.target.closest('.sheet-head') && body.scrollTop > 0) { y0 = null; return; }
      dragging = true; d.style.transition = 'none';
    }
    if (e.cancelable) e.preventDefault();
    d.style.transform = `translateY(${Math.max(0, dy)}px)`;
  }, { passive: false });
  const end = () => {
    if (y0 == null) return;
    y0 = null;
    if (!dragging) return;
    const fast = dy / Math.max(1, Date.now() - t0) > .55;
    d.style.transition = 'transform .25s cubic-bezier(.2,.8,.3,1)';
    if (dy > 120 || (fast && dy > 30)) {
      d.style.transform = 'translateY(105%)';
      setTimeout(() => { d.close(); reset(); }, 240);
    } else {
      d.style.transform = '';
      setTimeout(reset, 260);
    }
  };
  d.addEventListener('touchend', end);
  d.addEventListener('touchcancel', end);
});
