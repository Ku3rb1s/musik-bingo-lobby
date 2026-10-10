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
const SHORT = { title: 'Titel', artist: 'Interpret', year: 'Genaues Jahr', decade: 'Jahrzehnt', album: 'Album' };
const shortCat = c => c.builtin && c.answer === 'range' ? `Jahr ± ${c.tol}`
  : c.builtin && SHORT[c.answer] ? SHORT[c.answer]
  : c.name.length > 22 ? c.name.slice(0, 21) + '…' : c.name;
// Der Karten-Link zeigt immer auf die Online-Adresse – auch wenn die Karten am PC (start.bat) erstellt werden.
const cardBase = () => location.protocol === 'https:' && !/^(localhost|127\.|\[::1\])/.test(location.hostname) ? REDIRECT : PUBLIC_URL;
// Kompaktes Format (Zeilen statt JSON), damit der QR-Code nicht zu dicht wird
const bingoUrl = b => cardBase() + '?b=' + b64u.enc([b.g, b.s, ...b.k.map(k => [k.i, k.c, k.e, k.n].join('|'))].join('\n'));
// Mit Lobby genügt der kurze Code – die Karten-Daten kommen live vom Server
const lobbyUrl = code => cardBase() + '?l=' + code;
const joinUrl = b => Lobby.code ? lobbyUrl(Lobby.code) : bingoUrl(b);
const parseBingo = p => {
  const [g, s, ...rest] = b64u.dec(p).split('\n');
  return { g, s: +s, k: rest.map(x => { const [i, c, e, ...n] = x.split('|'); return { i, c, e, n: n.join('|') }; }) };
};
function cardFields(b, num) {
  const r = rng(hashStr(b.g + ':' + num));
  const n = b.s * b.s, free = false, slots = n;   // kein Gratisfeld in der Mitte
  // Kategorien gleichmäßig verteilen, Anordnung je Karte zufällig
  const start = Math.floor(r() * b.k.length);
  const arr = [...Array(slots)].map((_, i) => b.k[(start + i) % b.k.length].i);
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  if (free) arr.splice(Math.floor(n / 2), 0, '*');
  return arr;
}
function bingoLines(s) {
  const L = [];
  for (let i = 0; i < s; i++) { L.push([...Array(s)].map((_, j) => i * s + j)); L.push([...Array(s)].map((_, j) => j * s + i)); }
  L.push([...Array(s)].map((_, j) => j * s + j)); L.push([...Array(s)].map((_, j) => j * s + (s - 1 - j)));
  return L;
}
function bcell(b, f, cls = '', attrs = '') {
  if (f === '*') return `<div class="bcell free ${cls}" ${attrs}><span class="bi">★</span><span>Frei</span></div>`;
  const k = b.k.find(x => x.i === f) || { a: 'none', n: '?' };
  const [icon, color] = kStyle(k);
  return `<div class="bcell ${cls}" style="--c:${color}" ${attrs}><span class="bi">${icon}</span><span>${esc(k.n)}</span></div>`;
}
const catChip = c => `<span class="cat-chip" style="--c:${catStyle(c)[1]}">${catStyle(c)[0]} ${esc(shortCat(c))}</span>`;

let bingoSize = 4;
function createBingo() {
  const cats = state.cats.filter(c => c.enabled);
  if (cats.length < 2) return toast('Für Bingo braucht es mindestens 2 aktive Kategorien (Einstellungen → Kategorien).', 6000);
  state.bingo = { g: randStr(6), s: bingoSize, k: cats.map(c => { const [e, col] = catStyle(c); return { i: c.id, c: col.slice(1), e, n: shortCat(c) }; }) };
  LS.set('bingo', state.bingo);
  renderLobby(); renderMyCardBtn();
  // Lobby: bestehende bekommt die neuen Karten (alle Handys wechseln automatisch), sonst eine neue öffnen
  if (Lobby.code) Lobby.setBingo(state.bingo);
  else if (hasFirebase() && state.settings.lobby !== false) {
    Lobby.opening = true;
    Lobby.open(state.bingo)
      .then(code => toast('Lobby ' + code + ' ist offen'))
      .catch(e => toast('Lobby konnte nicht geöffnet werden: ' + e.message + ' – die Karten laufen ohne Server weiter.', 8000))
      .finally(() => { Lobby.opening = false; renderBingo(); renderLobby(); });
  }
  renderBingo();
}
let qrLib = null;
function loadQrLib() {
  qrLib ??= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    s.onload = () => res(window.qrcode); s.onerror = () => { qrLib = null; rej(new Error('QR-Code konnte nicht geladen werden')); };
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
    $('#bingoLobbyBox').classList.toggle('hidden', !hasFirebase());
    document.querySelectorAll('#bingoLobbySeg button').forEach(x => x.classList.toggle('on', (x.dataset.lobby === '1') === (state.settings.lobby !== false)));
    $('#bingoGamesBox').classList.toggle('hidden', state.settings.lobby === false);
    document.querySelectorAll('#bingoGamesSeg button').forEach(x => x.classList.toggle('on', +x.dataset.games === (state.settings.games ?? 0)));
    document.querySelectorAll('.set-host-plays').forEach(x => { x.checked = state.settings.hostPlays !== false; });
    // Alle Kategorien als Schalter: antippen = an/aus (gleiche Einstellung wie unter Einstellungen → Kategorien)
    const on = state.cats.filter(c => c.enabled).length;
    $('#bingoCats').innerHTML = state.cats.map((c, i) => `<button class="cat-chip pick ${c.enabled ? '' : 'off'}" style="--c:${catStyle(c)[1]}" data-bcat="${i}" aria-pressed="${c.enabled}">${catStyle(c)[0]} ${esc(shortCat(c))}</button>`).join('');
    $('#bingoCatsNote').textContent = on < 2 ? `Nur ${on} aktiv – für Bingo braucht es mindestens 2 Kategorien.` : `${on} von ${state.cats.length} aktiv – antippen schaltet eine Kategorie an oder aus.`;
    $('#bingoCatsNote').style.color = on < 2 ? 'var(--warn)' : '';
    return;
  }
  $('#bingoInfo').innerHTML = `${b.s} × ${b.s} · ${b.k.map(k => { const [icon, color] = kStyle(k); return `<span class="cat-chip" style="--c:${color}">${icon} ${esc(k.n)}</span>`; }).join('')}`;
  renderCheckWho(); renderMatch();
  document.querySelectorAll('.set-host-plays').forEach(x => { x.checked = state.settings.hostPlays !== false; });
  $('#myCardCell').classList.toggle('hidden', state.settings.hostPlays === false);
  $('#checkBox').innerHTML = '';
  $('#qrNote').textContent = Lobby.code ? `Mit der Handy-Kamera scannen · Lobby ${Lobby.code}` : 'Mit der Handy-Kamera scannen';
  // Beitreten ohne QR-Code: kurze Adresse + Code
  $('#joinCodeBox').classList.toggle('hidden', !Lobby.code);
  $('#joinUrlShort').textContent = (cardBase() + 'join').replace(/^https?:\/\//, '');
  $('#joinCodeBig').textContent = Lobby.code || '';
  $('#tvHint').classList.toggle('hidden', !Lobby.code);
  if (Lobby.code) $('#tvLink').href = cardBase() + '?tv=' + Lobby.code;
  $('#btnBingoOff .sub').classList.toggle('hidden', !Lobby.code);
  $('#bingoNewSub').textContent = Lobby.code ? 'Alle in der Lobby bekommen automatisch eine neue Karte' : 'Alle müssen den neuen QR-Code scannen';
  if (Lobby.opening) { $('#qr').innerHTML = '<span class="loader"></span>'; return; }
  try {
    const qrcode = await loadQrLib();
    const qr = qrcode(0, 'L'); qr.addData(joinUrl(b)); qr.make();
    $('#qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  } catch (e) { $('#qr').textContent = e.message; }
}
// „Wer hat Bingo gerufen?“ – die Mitspieler aus der Lobby
// Eigene Karte des Spielleiters („Meine Karte“) – wird wie ein Mitspieler geprüft
const HOST_ID = '__host';
function hostCard() {
  if (Lobby.code) return null;   // mit Lobby steht der Spielleiter als normaler Mitspieler in der Liste
  const b = state.bingo, st = state.settings.hostPlays !== false && b && LS.get('card_' + b.g, null);
  return st ? { name: 'Spielleiter', num: st.num, marks: st.marks, g: b.g, host: true, ok: !!state.match?.won?.includes(HOST_ID) } : null;
}
const whoById = id => id === HOST_ID ? hostCard() : Lobby.players[id];
function renderCheckWho() {
  const list = lobbyList(), host = hostCard();
  if (checkPlayer && !whoById(checkPlayer)) checkPlayer = null;
  // Kein Chip gewählt = beliebige Kartennummer prüfen (Feld unten). Gewählten Chip nochmal antippen = abwählen.
  $('#checkWho').innerHTML = (host ? `<button class="chip-btn ${checkPlayer === HOST_ID ? 'on' : ''}" data-check-who="${HOST_ID}">⭐ Spielleiter</button>` : '') +
    list.map(p => `<button class="chip-btn ${checkPlayer === p.id ? 'on' : ''}" data-check-who="${esc(p.id)}">${p.bingo ? '🎉 ' : ''}${esc(p.name)}</button>`).join('');
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
  if (!ok) return toast('Kopieren nicht möglich – ' + url, 8000);
  toast('Link kopiert'); beep(1320, .06);
  const lbl = $('#btnBingoShare .grow');
  lbl.textContent = '✓ Kopiert'; clearTimeout(copyBingoLink.t);
  copyBingoLink.t = setTimeout(() => { lbl.textContent = 'Link kopieren'; }, 1800);
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
    ? (win && !over.length ? `🎉 BINGO bestätigt für ${esc(who.name)}!`
      : win ? `⚠️ Volle Linie – aber ${esc(who.name)} hat mehr markiert, als gespielt wurde`
      : fullLines.length ? `⚠️ ${esc(who.name)} hat eine volle Linie, aber dafür wurden nicht genug passende Runden gespielt`
      : `Kein Bingo – ${esc(who.name)} hat noch keine volle Linie`)
    : win ? `🎉 BINGO ist möglich (Karte Nr. ${num})` : 'Noch kein Bingo möglich';
  const note = (marks && over.length ? `Zu viele Markierungen bei: ${over.map(k => `${kStyle(k)[0]} ${esc(k.n)}`).join(', ')}<br>` : '')
    + `Bisher gespielte Runden: ${counts}`
    + (!marks && lobbyList().length ? '<br>Für eine genaue Prüfung oben den Spieler wählen.' : '');
  const cls = i => `${marks?.has(i) ? 'on' : ''} ${inLine.has(i) ? 'line' : ''}`;
  const html = `<div class="check-block">
    <div class="check-res ${win && !over.length ? 'won' : 'no'}">${head}</div>
    <div class="bgrid n${b.s}" style="--n:${b.s}">${fields.map((f, i) => bcell(b, f, cls(i))).join('')}</div>
    <div class="group-f" style="text-align:center;margin-top:0">${note}</div>
    ${marks && (!who.host || Lobby.code) ? `<div class="chips" style="margin-top:6px">${who.ok
      ? '<span class="chip-btn on">✓ Bingo bestätigt</span>'
      : win ? `<button class="chip-btn" data-confirm="${esc(id)}">✓ Bingo für ${esc(who.name)} bestätigen</button>`
      // Die App hat Bedenken – der Spielleiter kann trotzdem bestätigen (mit Rückfrage)
      : `<button class="chip-btn force" data-confirm-force="${esc(id)}">Trotzdem bestätigen</button>`}</div>` : ''}</div>`;
  return { html, good: win && !over.length };
}
function checkCard() {
  const b = state.bingo, num = parseInt($('#checkNo').value);
  if (!b || !(num >= 1 && num <= 9999)) return toast('Bitte die Kartennummer eingeben');
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
  $('#checkBox').innerHTML = (callers.length > 1 ? `<div class="check-multi">🎉 ${callers.length} Bingo-Rufe gleichzeitig – alle werden hier geprüft</div>` : '')
    + rs.map((r, i) => (callers.length > 1 ? `<div class="check-name">${esc(callers[i].name)} · Karte Nr. ${esc(callers[i].num)}</div>` : '') + r.html).join('');
  if (rs.some(r => r.good)) { confetti(); beep(1046, .3); }
}
// Spielende-Bildschirm (Spielleiter und Mitspieler): Sieger, Siege, Knöpfe
// Kleine Statistik fürs Spielende
function statsHtml(m) {
  const out = [];
  if (m.rounds) out.push(`🎵 ${m.rounds} ${m.rounds === 1 ? 'Song' : 'Songs'} in ${m.game} ${m.game === 1 ? 'Partie' : 'Partien'}`);
  if (m.fast) out.push(`⚡ Schnellstes Bingo: ${esc(m.fast.name)} nach ${m.fast.r} ${m.fast.r === 1 ? 'Runde' : 'Runden'}`);
  const tips = Object.entries(m.tips || {}).sort((a, b) => b[1] - a[1]);
  if (tips.length) out.push(`💬 Meiste Tipps: ${esc(m.names?.[tips[0][0]] || '?')} (${tips[0][1]})`);
  return out.map(x => `<div>${x}</div>`).join('');
}
function showEnd(m, buttons) {
  $('#endWinner').textContent = matchWinner(m) || 'Niemand hat gewonnen';
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
  showEnd(state.match, '<button class="big" data-new-match>Nochmal spielen (Siege auf 0)</button>' +
    '<button class="ghost" data-end-stop>Bingo beenden</button><button class="ghost" data-end-close>Schließen</button>');
}
function confetti() {
  const c = document.createElement('div'); c.className = 'confetti';
  const cols = ['#1ed760', '#ff4fa3', '#ffb020', '#8b6cff', '#22d3ee'];
  for (let i = 0; i < 90; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + 'vw'; s.style.background = cols[i % cols.length];
    s.style.animationDelay = Math.random() * .6 + 's'; s.style.animationDuration = 2 + Math.random() * 1.6 + 's';
    c.appendChild(s);
  }
  // In ein offenes Menü einhängen – sonst läge das Konfetti dahinter
  (document.querySelector('dialog.sheet[open]') || document.body).appendChild(c); setTimeout(() => c.remove(), 4500);
  try { navigator.vibrate?.([30, 40, 30]); } catch {}
}

/* Eine Bingo-Karte anzeigen und markieren – für Mitspieler (über den QR-Code) und für den Spielleiter in der App.
   el = { grid, no, hits, legend, clear }, onWin(num, beimÖffnen)
   sync (nur Lobby) = { num, marks, onChange(marks) }: Nummer/Markierungen vom Server, Änderungen zurück an den Server */
function mountCard(b, el, onWin, sync = null) {
  const key = 'card_' + b.g;
  const st = LS.get(key, null) || { num: 1000 + Math.floor(Math.random() * 9000), marks: [] };
  if (sync) { st.num = sync.num; if (sync.marks) st.marks = sync.marks; }
  LS.set(key, st);
  const fields = cardFields(b, st.num);
  const lines = bingoLines(b.s);
  let won = false, first = true, hot = null;
  el.no.textContent = st.num;
  el.legend.innerHTML = b.k.map(k => { const [icon, color] = kStyle(k); return `<span class="cat-chip" style="--c:${color}">${icon} ${esc(k.n)}</span>`; }).join('');
  const draw = () => {
    const on = new Set(st.marks);
    const isOn = i => fields[i] === '*' || on.has(i);
    el.grid.className = 'bgrid n' + b.s + (hot ? ' has-hot' : ''); el.grid.style.setProperty('--n', b.s);
    const winning = lines.filter(l => l.every(isOn));
    const inLine = new Set(winning.flat());
    el.grid.innerHTML = fields.map((f, i) => bcell(b, f, `${on.has(i) ? 'on' : ''} ${inLine.has(i) ? 'line' : ''} ${hot && f === hot ? 'hot' : ''}`, `data-i="${i}"`)).join('');
    el.hits.textContent = `${on.size} markiert`;
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
    if (no) { toast(no, 4000); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); try { navigator.vibrate?.([20, 40, 20]); } catch {} return; }
    st.marks = adding ? [...st.marks, i] : st.marks.filter(x => x !== i);
    LS.set(key, st); try { navigator.vibrate?.(10); } catch {}
    // Erst die Markierung speichern, dann zeichnen: draw() kann „Bingo!“ an den Server melden, und dessen
    // Echo darf die neue Markierung nicht mit dem alten Stand überschreiben
    sync?.onChange(st.marks, adding ? i : null, adding ? null : i); draw();
  };
  el.clear.onclick = async () => {
    if (!await ask('Alle Markierungen löschen?', { ok: 'Löschen', danger: true })) return;
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

/* Tipp-Zettel: Text eintippen und bei der Auflösung im Vollbild den anderen zeigen */
function mountGuess(text, show, clear) {
  text.value = LS.get('guess', '');
  text.oninput = () => LS.set('guess', text.value);
  text.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); text.blur(); } };
  clear.onclick = () => { text.value = ''; LS.set('guess', ''); text.focus(); };
  show.onclick = () => {
    const v = text.value.trim();
    if (!v) { text.focus(); return toast('Schreib zuerst deinen Tipp'); }
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
