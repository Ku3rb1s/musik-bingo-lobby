// Musik-Bingo – Bingo: Karten, Einladen, Prüfen, Spielende, Karte anzeigen/markieren, Tipp-Zettel
'use strict';

/* ---------------- Bingo ---------------- */
// Die Felder einer Karte sind die aktiven Kategorien (in ihren Farben). Wer die Frage einer Runde
// richtig beantwortet, markiert ein Feld dieser Kategorie. Volle Reihe, Spalte oder Diagonale = Bingo.
const PUBLIC_URL = 'https://ku3rb1s.github.io/musik-bingo-lobby/';
const b64u = {
  enc: s => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))),
};
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const SHORT = { title: 'Titel', artist: 'Interpret', year: 'Genaues Jahr', decade: 'Jahrzehnt', album: 'Album', country: 'Herkunftsland', kind: 'Band/Solo', gender: 'Sänger/in' };
// Kurzname auf der Karte – immer deutsch gespeichert (gemeinsam für alle), angezeigt wird er übersetzt: tx(k.n)
const shortCat = c => c.builtin && c.answer === 'range' ? `Jahr ± ${c.tol}`
  : c.builtin && SHORT[c.answer] ? SHORT[c.answer]
  : c.name.length > 22 ? c.name.slice(0, 21) + '…' : c.name;
// Der Karten-Link zeigt immer auf die Online-Adresse – auch wenn die Karten am PC (start.bat) erstellt werden.
const cardBase = () => location.protocol === 'https:' && !/^(localhost|127\.|\[::1\])/.test(location.hostname) ? REDIRECT : PUBLIC_URL;
// Kompaktes Format (Zeilen statt JSON), damit der QR-Code nicht zu dicht wird
const bingoUrl = b => cardBase() + '?b=' + b64u.enc([b.g, b.s + (hasJoker(b) ? 'f' : ''), ...b.k.map(k => [k.i, k.c, k.e, k.n].join('|'))].join('\n'));
// Mit Lobby genügt der kurze Code – die Karten-Daten kommen live vom Server
const lobbyUrl = code => cardBase() + '?l=' + code;
const joinUrl = b => Lobby.code ? lobbyUrl(Lobby.code) : bingoUrl(b);
const parseBingo = p => {
  const [g, s, ...rest] = b64u.dec(p).split('\n');
  return { g, s: parseInt(s), ...(/f$/.test(s) ? { f: 1 } : {}), k: rest.map(x => { const [i, c, e, ...n] = x.split('|'); return { i, c, e, n: n.join('|') }; }) };
};
function cardFields(b, num) {
  const r = rng(hashStr(b.g + ':' + num));
  const n = b.s * b.s, free = hasJoker(b), slots = free ? n - 1 : n;   // Joker: Mitte ist schon frei
  // Kategorien gleichmäßig verteilen, Anordnung je Karte zufällig
  const start = Math.floor(r() * b.k.length);
  const arr = [...Array(slots)].map((_, i) => b.k[(start + i) % b.k.length].i);
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  if (free) arr.splice(Math.floor(n / 2), 0, '*');
  return arr;
}
// Joker in der Mitte – nur bei ungerader Größe (3×3, 5×5), 4×4 hat keine Mitte
const hasJoker = b => !!b?.f && b.s % 2 === 1;
// Buzzer (nur mit Lobby): Mitspieler dürfen per Knopf den Countdown starten – wird beim Erstellen festgelegt (b.z)
const hasBuzz = b => !!b?.z;
const fieldCount = b => b.s * b.s - (hasJoker(b) ? 1 : 0);   // Felder zum Markieren
function bingoLines(s) {
  const L = [];
  for (let i = 0; i < s; i++) { L.push([...Array(s)].map((_, j) => i * s + j)); L.push([...Array(s)].map((_, j) => j * s + i)); }
  L.push([...Array(s)].map((_, j) => j * s + j)); L.push([...Array(s)].map((_, j) => j * s + (s - 1 - j)));
  return L;
}
function bcell(b, f, cls = '', attrs = '') {
  if (f === '*') return `<div class="bcell free ${cls}" ${attrs}><span class="bi">★</span><span>${tx('Joker')}</span></div>`;
  const k = b.k.find(x => x.i === f) || { a: 'none', n: '?' };
  const [icon, color] = kStyle(k);
  return `<div class="bcell ${cls}" style="--c:${color}" ${attrs}><span class="bi">${icon}</span><span>${esc(tx(k.n)).replace(/\//g, '/<wbr>')}</span></div>`;   // „Sänger/in“: Umbruch nach dem Schrägstrich
}
const catChip = c => `<span class="cat-chip" style="--c:${catStyle(c)[1]}">${catStyle(c)[0]} ${esc(tx(shortCat(c)))}</span>`;

let bingoSize = 4;
function createBingo() {
  const cats = state.cats.filter(c => c.enabled);
  if (cats.length < 2) return toast(tx('Für Bingo braucht es mindestens 2 aktive Kategorien (Einstellungen → Kategorien).'), 6000);
  state.bingo = { g: randStr(6), s: bingoSize, ...(state.settings.joker && bingoSize % 2 ? { f: 1 } : {}),
    ...(state.settings.buzz && hasFirebase() && (Lobby.code || state.settings.lobby !== false) ? { z: 1 } : {}), k: cats.map(c => { const [e, col] = catStyle(c); return { i: c.id, c: col.slice(1), e, n: shortCat(c) }; }) };
  LS.set('bingo', state.bingo);
  // Neue Karten: für die Prüfung zählen nur Runden ab jetzt (frühere Runden konnte niemand auf dieser Karte markieren)
  state.partieFrom = state.history[0]?.n || 0; LS.set('partieFrom', state.partieFrom);
  renderLobby(); renderMyCardBtn();
  // Lobby: bestehende bekommt die neuen Karten (alle Handys wechseln automatisch), sonst eine neue öffnen
  if (Lobby.code) { Lobby.setBingo(state.bingo); Lobby.syncRound(); }
  else if (hasFirebase() && state.settings.lobby !== false) {
    Lobby.opening = true;
    Lobby.open(state.bingo)
      .then(code => toast(tx('Lobby {c} ist offen', { c: code })))
      .catch(e => toast(tx('Lobby konnte nicht geöffnet werden: {e} – die Karten laufen ohne Server weiter.', { e: tx(e.message) }), 8000))
      .finally(() => { Lobby.opening = false; renderBingo(); renderLobby(); });
  }
  renderBingo();
}
let qrLib = null;
function loadQrLib() {
  qrLib ??= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    s.onload = () => res(window.qrcode); s.onerror = () => { qrLib = null; rej(new Error(tx('QR-Code konnte nicht geladen werden'))); };
    document.head.appendChild(s);
  });
  return qrLib;
}
let checkPlayer = null;
async function renderBingo() {
  const b = state.bingo;
  $('#bingoStart').classList.toggle('hidden', !!b);
  $('#bingoActive').classList.toggle('hidden', !b);
  $('#bingoEndBox').classList.toggle('hidden', !b);
  if (!b) {
    document.querySelectorAll('#bingoSizeSeg button').forEach(x => x.classList.toggle('on', +x.dataset.size === bingoSize));
    $('#bingoJokerBox').classList.toggle('hidden', bingoSize % 2 === 0);
    $('#setJoker').checked = !!state.settings.joker;
    $('#setBuzz').checked = !!state.settings.buzz;
    $('#bingoLobbyBox').classList.toggle('hidden', !hasFirebase());
    document.querySelectorAll('#bingoLobbySeg button').forEach(x => x.classList.toggle('on', (x.dataset.lobby === '1') === (state.settings.lobby !== false)));
    $('#bingoGamesBox').classList.toggle('hidden', state.settings.lobby === false);
    document.querySelectorAll('#bingoSecSeg button').forEach(x => x.classList.toggle('on', +x.dataset.sec === +state.settings.seconds));
    document.querySelectorAll('#bingoStartSeg button').forEach(x => x.classList.toggle('on', x.dataset.start === state.settings.start));
    document.querySelectorAll('#bingoHintSeg button').forEach(x => x.classList.toggle('on', +x.dataset.hints === +(state.settings.hintMax ?? 2)));
    document.querySelectorAll('#bingoGamesSeg button').forEach(x => x.classList.toggle('on', +x.dataset.games === (state.settings.games ?? 0)));
    document.querySelectorAll('.set-host-plays').forEach(x => { x.checked = state.settings.hostPlays !== false; });
    // Alle Kategorien als Schalter: antippen = an/aus (gleiche Einstellung wie unter Einstellungen → Kategorien)
    const on = state.cats.filter(c => c.enabled).length;
    $('#bingoCats').innerHTML = state.cats.map((c, i) => `<button class="cat-chip pick ${c.enabled ? '' : 'off'}" style="--c:${catStyle(c)[1]}" data-bcat="${i}" aria-pressed="${c.enabled}">${catStyle(c)[0]} ${esc(tx(shortCat(c)))}</button>`).join('');
    $('#bingoCatsNote').textContent = on < 2 ? tx('Nur {n} aktiv – für Bingo braucht es mindestens 2 Kategorien.', { n: on }) : tx('{a} von {b} aktiv – antippen schaltet eine Kategorie an oder aus.', { a: on, b: state.cats.length });
    $('#bingoCatsNote').style.color = on < 2 ? 'var(--warn)' : '';
    return;
  }
  renderRules();
  $('#bingoInfo').innerHTML = `${b.k.map(k => { const [icon, color] = kStyle(k); return `<span class="cat-chip" style="--c:${color}">${icon} ${esc(tx(k.n))}</span>`; }).join('')}`;
  renderCheckWho(); renderMatch();
  document.querySelectorAll('.set-host-plays').forEach(x => { x.checked = state.settings.hostPlays !== false; });
  $('#myCardCell').classList.toggle('hidden', state.settings.hostPlays === false);
  $('#checkBox').innerHTML = '';
  $('#qrNote').textContent = Lobby.code ? tx('Mit der Handy-Kamera scannen · Lobby {c}', { c: Lobby.code }) : tx('Mit der Handy-Kamera scannen');
  // Beitreten ohne QR-Code: kurze Adresse + Code
  $('#joinCodeBox').classList.toggle('hidden', !Lobby.code);
  $('#joinUrlShort').textContent = (cardBase() + 'join').replace(/^https?:\/\//, '');
  $('#joinCodeBig').textContent = Lobby.code || '';
  $('#tvHint').classList.toggle('hidden', !Lobby.code);
  if (Lobby.code) $('#tvLink').href = $('#tvLink2').href = cardBase() + '?tv=' + Lobby.code;
  $('#tvLink2').classList.toggle('hidden', !Lobby.code);
  $('#btnBingoOff .sub').classList.toggle('hidden', !Lobby.code);
  $('#bingoNewSub').textContent = Lobby.code ? tx('Alle in der Lobby bekommen automatisch eine neue Karte') : tx('Alle müssen den neuen QR-Code scannen');
  if (Lobby.opening) { $('#qr').innerHTML = '<span class="loader"></span>'; return; }
  try {
    const qrcode = await loadQrLib();
    const qr = qrcode(0, 'L'); qr.addData(joinUrl(b)); qr.make();
    $('#qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  } catch (e) { $('#qr').textContent = e.message; }
}
// Regeln dieses Bingos (nur Anzeige – festgelegt beim Einrichten). Ausnahme: Der Spielleiter darf später noch einsteigen
// (wie jeder Mitspieler), aber nicht mittendrin aussteigen – Karte, Markierungen und Siege gingen sonst verloren.
function renderRules() {
  const b = state.bingo; if (!b) return;
  const code = Lobby.code, m = state.match, plays = state.settings.hostPlays !== false;
  const row = (ic, label, val, sub = '') => `<div class="cell rule"><span class="rule-ic">${ic}</span><span class="grow">${label}${sub ? `<span class="sub">${sub}</span>` : ''}</span><span class="rule-v">${val}</span></div>`;
  // Countdown und Song-Start gelten nicht fest – antippen springt in die Einstellungen
  const link = (ic, label, val, to) => `<button class="cell tap rule" data-goto-set="${to}"><span class="rule-ic">${ic}</span><span class="grow">${label}<span class="sub">${tx('Antippen zum Ändern (Einstellungen)')}</span></span><span class="rule-v">${val}</span><svg class="ic chev"><use href="#i-chev"/></svg></button>`;
  const START = { begin: 'Am Anfang', s30: 'Ab 0:30', random: 'Zufällige Stelle' };
  $('#bingoRules').innerHTML = [
    row(ic('grid'), tx('Karten'), `${b.s} × ${b.s}${hasJoker(b) ? ' · ★ ' + tx('Joker') : ''}`, tx('{n} Felder zum Markieren', { n: fieldCount(b) })),
    row(ic('signal'), tx('Lobby'), code ? esc(code) : tx('ohne'), code ? tx('Live – Markierungen und Tipps kommen sofort an') : tx('Karten nur per QR-Code, ohne Live-Sync')),
    code && m ? row(ic('trophy'), tx('Partien'), m.total ? tx('{g} von {t}', { g: m.game, t: m.total }) : tx('endlos'), tx('Nach jedem bestätigten Bingo geht es mit der nächsten Partie weiter')) : '',
    code ? row(ic('check'), tx('Markieren'), tx('1 pro Runde'), tx('Nach der Auflösung, nur die Kategorie der Runde')) : row(ic('check'), tx('Markieren'), tx('selbst'), tx('Jeder markiert auf seinem Handy, du prüfst bei „Bingo!“')),
    code ? row(ic('bell'), tx('Buzzer'), hasBuzz(b) ? tx('an') : tx('aus'), hasBuzz(b) ? tx('Mitspieler starten den Countdown') : '') : '',
    link(ic('timer'), tx('Countdown'), tx('{n} s', { n: state.settings.seconds }), 'rowSec'),
    link(ic('play'), tx('Startpunkt im Song'), tx(START[state.settings.start] || START.begin), 'rowStart'),
    link(ic('skip'), tx('Automatisch weiter'), +state.settings.autoNext ? tx('{n} s', { n: state.settings.autoNext }) : tx('aus'), 'rowAutoNext'),
    link(ic('bulb'), tx('Tipps pro Runde'), +state.settings.hintMax ? String(state.settings.hintMax) : tx('keine'), 'rowHints'),
    `<div class="cell rule"><span class="rule-ic">${ic('star')}</span><span class="grow">${tx('Spielleiter')}<span class="sub">${plays ? tx('Du spielst mit eigener Karte mit') : tx('Du kannst noch einsteigen – aussteigen geht erst mit „Bingo beenden“')}</span></span>`
      + (plays ? `<span class="rule-v">${tx('spielt mit')}</span>` : `<button class="mini" data-host-join>${tx('Mitspielen')}</button>`) + '</div>',
  ].join('');
}
// „Wer hat Bingo gerufen?“ – die Mitspieler aus der Lobby
// Eigene Karte des Spielleiters („Meine Karte“) – wird wie ein Mitspieler geprüft
const HOST_ID = '__host';
function hostCard() {
  if (Lobby.code) return null;   // mit Lobby steht der Spielleiter als normaler Mitspieler in der Liste
  const b = state.bingo, st = state.settings.hostPlays !== false && b && LS.get('card_' + b.g, null);
  return st ? { name: tx('Spielleiter'), num: st.num, marks: st.marks, g: b.g, host: true, ok: !!state.match?.won?.includes(HOST_ID) } : null;
}
const whoById = id => id === HOST_ID ? hostCard() : Lobby.players[id];
function renderCheckWho() {
  const list = lobbyList(), host = hostCard();
  if (checkPlayer && !whoById(checkPlayer)) checkPlayer = null;
  // Kein Chip gewählt = beliebige Kartennummer prüfen (Feld unten). Gewählten Chip nochmal antippen = abwählen.
  const html = (host ? `<button class="chip-btn ${checkPlayer === HOST_ID ? 'on' : ''}" data-check-who="${HOST_ID}">⭐ ${tx('Spielleiter')}</button>` : '') +
    list.map(p => `<button class="chip-btn ${checkPlayer === p.id ? 'on' : ''}" data-check-who="${esc(p.id)}">${p.bingo ? '🎉 ' : ''}${esc(p.name)}</button>`).join('');
  const el = $('#checkWho');
  if (el._html !== html) { el._html = html; el.innerHTML = html; }
  $('#checkWhoBox').classList.toggle('hidden', !list.length && !host);
}
// Link direkt in die Zwischenablage (Fallback für Browser ohne Clipboard-API)
async function copyBingoLink() {
  const url = joinUrl(state.bingo);
  let ok = false;
  try { await navigator.clipboard.writeText(url); ok = true; } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: url, readOnly: true });
    ta.style.cssText = 'position:fixed;opacity:0';
    (document.querySelector('dialog[open]') || document.body).appendChild(ta);
    ta.select(); ta.setSelectionRange(0, url.length);
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
  }
  if (!ok) return toast(tx('Kopieren nicht möglich – {u}', { u: url }), 8000);
  toast(tx('Link kopiert')); beep(1320, .06);
  const lbl = $('#btnBingoShare .grow');
  lbl.textContent = tx('✓ Kopiert'); clearTimeout(copyBingoLink.t);
  copyBingoLink.t = setTimeout(() => { lbl.textContent = tx('Link kopieren'); }, 1800);
}
// Prüft, ob eine Karte ein Bingo haben kann: Für jede Linie muss es genug Runden der jeweiligen
// Kategorie gegeben haben. Mit gewähltem Lobby-Spieler (id) werden seine echten Markierungen geprüft.
// Liefert das HTML eines Prüf-Ergebnisses; good = eindeutiges Bingo.
function checkHtml(num, id) {
  const b = state.bingo;
  const fields = cardFields(b, num);
  const avail = {};
  for (const h of state.history) if (h.catId && h.n > (state.partieFrom || 0)) avail[h.catId] = (avail[h.catId] || 0) + 1;
  const lineOk = l => {
    const need = {};
    for (const i of l) if (fields[i] !== '*') need[fields[i]] = (need[fields[i]] || 0) + 1;
    return Object.entries(need).every(([c, n]) => (avail[c] || 0) >= n);
  };
  const who = id ? whoById(id) : null;
  const marks = who && +who.num === num ? new Set(who.g === b.g ? who.marks || [] : []) : null;
  // Mit Lobby: nur die Linien, die der Spieler wirklich voll markiert hat
  const fullLines = marks ? bingoLines(b.s).filter(l => l.every(i => fields[i] === '*' || marks.has(i))) : bingoLines(b.s);
  const winLines = fullLines.filter(lineOk);
  // Pro richtig beantworteter Runde darf nur ein Feld markiert werden – mehr Markierungen als Runden fallen auf
  const over = marks ? b.k.filter(k => [...marks].filter(i => fields[i] === k.i).length > (avail[k.i] || 0)) : [];
  const inLine = new Set((marks ? fullLines : winLines).flat());
  const win = winLines.length > 0;
  const counts = b.k.map(k => `${kStyle(k)[0]} ${avail[k.i] || 0}×`).join(' · ');
  const head = marks
    ? (win && !over.length ? tx('🎉 BINGO bestätigt für {n}!', { n: esc(who.name) })
      : win ? tx('⚠️ Volle Linie – aber {n} hat mehr markiert, als gespielt wurde', { n: esc(who.name) })
      : fullLines.length ? tx('⚠️ {n} hat eine volle Linie, aber dafür wurden nicht genug passende Runden gespielt', { n: esc(who.name) })
      : tx('Kein Bingo – {n} hat noch keine volle Linie', { n: esc(who.name) }))
    : win ? tx('🎉 BINGO ist möglich (Karte Nr. {n})', { n: num }) : tx('Noch kein Bingo möglich');
  const note = (marks && over.length ? tx('Zu viele Markierungen bei: {k}', { k: over.map(k => `${kStyle(k)[0]} ${esc(tx(k.n))}`).join(', ') }) + '<br>' : '')
    + tx('Bisher gespielte Runden: {c}', { c: counts })
    + (!marks && lobbyList().length ? '<br>' + tx('Für eine genaue Prüfung oben den Spieler wählen.') : '');
  const cls = i => `${marks?.has(i) ? 'on' : ''} ${inLine.has(i) ? 'line' : ''}`;
  const html = `<div class="check-block">
    <div class="check-res ${win && !over.length ? 'won' : 'no'}">${head}</div>
    <div class="bgrid n${b.s}" style="--n:${b.s}">${fields.map((f, i) => bcell(b, f, cls(i))).join('')}</div>
    <div class="group-f" style="text-align:center;margin-top:0">${note}</div>
    ${marks && (!who.host || Lobby.code) && (who.ok || fullLines.length) ? `<div class="chips" style="margin-top:6px">${who.ok
      ? `<span class="chip-btn on">${tx('✓ Bingo bestätigt')}</span>`
      : win && !over.length ? `<button class="chip-btn" data-confirm="${esc(id)}">${tx('✓ Bingo für {n} bestätigen', { n: esc(who.name) })}</button>`
      // Volle Linie, aber die App hat Bedenken (zu wenige passende Runden / mehr markiert als gespielt) –
      // der Spielleiter kann trotzdem bestätigen (mit Rückfrage). Ohne volle Linie gibt es nichts zu bestätigen.
      : `<button class="chip-btn force" data-confirm-force="${esc(id)}">${tx('Trotzdem bestätigen')}</button>`}</div>` : ''}</div>`;
  return { html, good: win && !over.length };
}
function checkCard() {
  const b = state.bingo, num = parseInt($('#checkNo').value);
  if (!b || !(num >= 1 && num <= 9999)) return toast(tx('Bitte die Kartennummer eingeben'));
  $('#checkNo').blur();
  const r = checkHtml(num, checkPlayer);
  $('#checkBox').innerHTML = r.html;
  if (r.good) { confetti(); beep(1046, .3); }
}
// Wer hat Bingo gerufen und ist noch nicht bestätigt? (except = gerade bestätigte ID)
const pendingCallers = (except = null) => lobbyList().filter(p => p.bingo && !p.ok && p.id !== except && !state.match?.won?.includes(p.id));
// Alle offenen Bingo-Rufe auf einmal prüfen – rufen zwei gleichzeitig, werden beide angezeigt
function checkCallers() {
  const callers = pendingCallers();
  openSheet('sheetGame', 'check');
  if (!callers.length) return;
  checkPlayer = callers.length === 1 ? callers[0].id : null;
  $('#checkNo').value = callers.length === 1 ? callers[0].num : '';
  renderCheckWho();
  const rs = callers.map(p => checkHtml(+p.num, p.id));
  $('#checkBox').innerHTML = (callers.length > 1 ? `<div class="check-multi">${tx('🎉 {n} Bingo-Rufe gleichzeitig – alle werden hier geprüft', { n: callers.length })}</div>` : '')
    + rs.map((r, i) => (callers.length > 1 ? `<div class="check-name">${esc(callers[i].name)} · ${tx('Karte Nr. {n}', { n: esc(callers[i].num) })}</div>` : '') + r.html).join('');
  if (rs.some(r => r.good)) { confetti(); beep(1046, .3); }
}
// Spielende-Bildschirm (Spielleiter und Mitspieler): Sieger, Siege, Knöpfe
// Kleine Statistik fürs Spielende
function statsHtml(m) {
  const out = [];
  if (m.rounds) out.push(tx(m.rounds === 1 ? '🎵 1 Song' : '🎵 {n} Songs', { n: m.rounds }) + ' ' + tx(m.game === 1 ? 'in 1 Partie' : 'in {n} Partien', { n: m.game }));
  if (m.fast) out.push(tx(m.fast.r === 1 ? '⚡ Schnellstes Bingo: {n} nach 1 Runde' : '⚡ Schnellstes Bingo: {n} nach {r} Runden', { n: esc(m.fast.name), r: m.fast.r }));
  const tips = Object.entries(m.tips || {}).sort((a, b) => b[1] - a[1]);
  const most = tips.filter(t => t[1] === tips[0]?.[1]).map(t => esc(m.names?.[t[0]] || '?'));   // bei Gleichstand alle
  if (tips.length) out.push(tx('💬 Meiste Tipps: {n} ({c})', { n: nameList(most), c: tips[0][1] }));
  return out.map(x => `<div>${x}</div>`).join('');
}
function showEnd(m, buttons) {
  $('#endWinner').textContent = matchWinner(m) || tx('Niemand hat gewonnen');
  $('#endTable').innerHTML = winsHtml(m);
  $('#endStats').innerHTML = statsHtml(m);
  $('#endBtns').innerHTML = buttons;
  const el = $('#endScreen');
  if (el.classList.contains('hidden')) { el.classList.remove('hidden'); confetti(); beep(1046, .4); }
}
let endShown = false;
function showEndHost() {
  if (!state.match?.over) return;
  // Beim ersten Mal: Song ausblenden, Menüs schließen. Danach (weiterer Sieger) nur die Anzeige aktualisieren.
  if (!endShown) { endShown = true; Player.fadeOut(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); }
  showEnd(state.match, `<button class="big" data-new-match>${tx('Nochmal spielen (Siege auf 0)')}</button>` +
    `<button class="ghost" data-end-stop>${tx('Bingo beenden')}</button><button class="ghost" data-end-close>${tx('Schließen')}</button>`);
}
function confetti() {
  const c = document.createElement('div'); c.className = 'confetti';
  const cols = ['#1ed760', '#ff4fa3', '#ffb020', '#8b6cff', '#22d3ee'];
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + 'vw'; s.style.background = cols[i % cols.length];
    s.style.animationDelay = Math.random() * .6 + 's'; s.style.animationDuration = 2 + Math.random() * 1.6 + 's';
    c.appendChild(s);
  }
  // In ein offenes Menü einhängen – sonst läge das Konfetti dahinter
  (document.querySelector('dialog.sheet[open]') || document.body).appendChild(c); setTimeout(() => c.remove(), 4500);
  vib([30, 40, 30]);
}

/* Eine Bingo-Karte anzeigen und markieren – für Mitspieler (über den QR-Code) und für den Spielleiter in der App.
   el = { grid, no, hits, legend, clear }, onWin(num, beimÖffnen)
   sync (nur Lobby) = { num, marks, onChange(marks) }: Nummer/Markierungen vom Server, Änderungen zurück an den Server */
function mountCard(b, el, onWin, sync = null) {
  const key = 'card_' + b.g;
  // Einträge früherer Bingos weg – sonst sammelt sich über viele Spielabende eine Karte pro Bingo im Speicher
  try { Object.keys(localStorage).filter(k => k.startsWith('mb_card_') && k !== 'mb_' + key).forEach(k => localStorage.removeItem(k)); } catch {}
  const st = LS.get(key, null) || { num: 1000 + Math.floor(Math.random() * 9000), marks: [] };
  if (sync) { st.num = sync.num; if (sync.marks) st.marks = sync.marks; }
  LS.set(key, st);
  const fields = cardFields(b, st.num);
  const lines = bingoLines(b.s);
  let won = false, first = true, hot = null;
  el.no.textContent = st.num;
  el.legend.innerHTML = b.k.map(k => { const [icon, color] = kStyle(k); return `<span class="cat-chip" style="--c:${color}">${icon} ${esc(tx(k.n))}</span>`; }).join('');
  const draw = () => {
    const on = new Set(st.marks);
    const isOn = i => fields[i] === '*' || on.has(i);
    el.grid.className = 'bgrid n' + b.s + (hot ? ' has-hot' : ''); el.grid.style.setProperty('--n', b.s);
    const winning = lines.filter(l => l.every(isOn));
    const inLine = new Set(winning.flat());
    el.grid.innerHTML = fields.map((f, i) => bcell(b, f, `${on.has(i) ? 'on' : ''} ${inLine.has(i) ? 'line' : ''} ${hot && f === hot ? 'hot' : ''}`, `data-i="${i}"`)).join('');
    el.hits.textContent = tx('{n} markiert', { n: on.size });
    if (winning.length && !won) { won = true; onWin(st.num, first); }
    if (!winning.length && (won || first)) { won = false; onWin(null); }
    first = false;
  };
  el.grid.onclick = e => {
    const c = e.target.closest('[data-i]'); if (!c) return;
    const i = +c.dataset.i; if (fields[i] === '*') return;
    const adding = !st.marks.includes(i);
    // Lobby: nur ein Feld der aktuellen Kategorie pro Runde – sonst kurz wackeln und erklären
    const no = sync?.guard?.(i, fields[i], adding);
    if (no) { toast(no, 4000); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); vib([20, 40, 20]); return; }
    st.marks = adding ? [...st.marks, i] : st.marks.filter(x => x !== i);
    LS.set(key, st); vib(10);
    // Erst die Markierung speichern, dann zeichnen: draw() kann „Bingo!“ an den Server melden, und dessen
    // Echo darf die neue Markierung nicht mit dem alten Stand überschreiben
    sync?.onChange(st.marks, adding ? i : null, adding ? null : i); draw();
  };
  el.clear.onclick = async () => {
    if (!await ask(tx('Alle Markierungen löschen?'), { ok: tx('Löschen'), danger: true })) return;
    st.marks = []; LS.set(key, st); sync?.onChange(st.marks, null, 'all'); draw();
  };
  draw();
  // Markierungen von außen setzen (z. B. der Spielleiter startet ein neues Spiel)
  return {
    setMarks(m) { if (JSON.stringify(m) === JSON.stringify(st.marks)) return; st.marks = m; LS.set(key, st); draw(); },
    // Kategorie der aktuellen Runde (null = keine) – diese Felder leuchten, die anderen treten zurück
    setHot(id) { const h = fields.includes(id) ? id : null; if (h === hot) return; hot = h; draw(); },
  };
}

// Tipp-Feld bleibt einzeilig: Bei langem Text wird die Schrift kleiner (nicht unter 19 px – gut lesbar; unter 16 px würde das iPhone hineinzoomen),
// erst danach scrollt der Text wie in jedem Eingabefeld zur Seite
let fitCtx = null;
function fitGuess(el) {
  el.style.fontSize = '';
  if (!el.value || !el.clientWidth) return;
  const cs = getComputedStyle(el), base = parseFloat(cs.fontSize);
  const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4;
  fitCtx ??= document.createElement('canvas').getContext('2d');
  fitCtx.font = `${cs.fontWeight} ${base}px ${cs.fontFamily}`;
  const w = fitCtx.measureText(el.value).width;
  if (w > avail) el.style.fontSize = Math.max(19, Math.floor(base * avail / w)) + 'px';
}
// „Groß zeigen“: ohne Lobby großer Knopf neben dem Tipp, in der Lobby nur ein kleines Auge oben rechts
// (die anderen sehen die Tipps dort ohnehin live)
function placeEye(btn, small) {
  const to = btn.closest('.guess-wrap').querySelector(small ? '.guess-head' : '.guess-row');
  if (btn.parentElement !== to) to.appendChild(btn);
  btn.classList.toggle('eye-mini', small);
}
/* Tipp-Zettel: Text eintippen und bei der Auflösung im Vollbild den anderen zeigen */
function mountGuess(text, show, clear) {
  text.value = LS.get('guess', '');
  text.oninput = () => { LS.set('guess', text.value); fitGuess(text); };
  text.onfocus = () => fitGuess(text);
  text.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); text.blur(); } };
  clear.onclick = () => { text.value = ''; LS.set('guess', ''); fitGuess(text); text.focus(); };
  requestAnimationFrame(() => fitGuess(text));
  show.onclick = () => {
    const v = text.value.trim();
    if (!v) { text.focus(); return toast(tx('Schreib zuerst deinen Tipp')); }
    text.blur();
    const d = $('#guessShow'), el = $('#gsText');
    // Der Text steht in einem Rahmen mit 90 % Breite – so bleibt Luft für die schräge Handschrift
    el.innerHTML = `<span style="display:inline-block;max-width:90%">${esc(v)}</span>`;
    const span = el.firstChild;
    d.showModal(); raiseToast();
    // Schrift so groß wie möglich, ohne dass etwas abgeschnitten wird. Wörter nicht mittendrin trennen –
    // nur bei sehr langen Wörtern als Notlösung.
    requestAnimationFrame(() => {
      span.style.overflowWrap = 'normal';
      const tooBig = () => span.scrollWidth > span.clientWidth + 1 || span.offsetHeight > el.clientHeight * .95;
      let s = 220; el.style.fontSize = s + 'px';
      while (s > 28 && tooBig()) { s -= 4; el.style.fontSize = s + 'px'; }
      if (tooBig()) span.style.overflowWrap = 'anywhere';
    });
  };
}
$('#guessShow').onclick = () => $('#guessShow').close();
