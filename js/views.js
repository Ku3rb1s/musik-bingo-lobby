// Musik-Bingo – Ansichten: Mitspieler (QR/Lobby/Code), Fernseher, Karte des Spielleiters
'use strict';

/* Sprachwahl oben bei den Mitspielern: „🌐 DE“ – darunter liegt die (unsichtbare) Auswahlliste des Handys */
$('#langCode').textContent = LANG.toUpperCase();
$('#langSelP').innerHTML = langOptions();
$('#langSelP').onchange = e => setLang(e.target.value);

// Lösung vom Spielleiter (kommt immer auf Deutsch, siehe Lobby.syncRound) in der eigenen Sprache anzeigen.
// Titel/Interpret/Album/Jahr bleiben, Land kommt als Code, feste Sätze und Jahrzehnte werden übersetzt.
function locAnswer(r) {
  if (r.cc) return regionName(r.cc);
  if (['title', 'artist', 'album', 'year'].includes(r.at)) return r.a;
  const one = p => {
    let m;
    if (hasTx(p)) return tx(p);
    if ((m = p.match(/^(\d{2,4})er$/))) return tx('{d}er', { d: m[1] });
    if ((m = p.match(/^🤔 (.+) – ihr entscheidet selbst$/))) return tx('🤔 {k} – ihr entscheidet selbst', { k: tx(m[1]) });
    if ((m = p.match(/^(\d{4}) \(richtig: (\d+)–(\d+)\)$/))) return m[1] + ' ' + tx('(richtig: {a}–{b})', { a: m[2], b: m[3] });
    return p;
  };
  return String(r.a ?? '').split(' · ').map(one).join(' · ');
}

// Countdown-Ende auf der eigenen Uhr. Kommt der Start live an (Normalfall), zählt der Moment der Ankunft – das stimmt
// unabhängig davon, wie die Uhren der Geräte gehen. Nur wer mitten im Countdown dazukommt (Beitreten, Neuladen),
// rechnet über die Server-Zeit (r.end = Server-Zeit, geschätzt vom Spielleiter). r.end kennzeichnet den Countdown –
// sendet der Spielleiter dieselbe Runde nochmal (z. B. Jahr nachgeschlagen), bleibt das Ende gleich.
function cdClock() {
  let key = null, end = 0;
  return (r, live) => {
    if (r.end !== key) { key = r.end; end = live && r.dur ? Date.now() + r.dur : r.end - fbOffset; }
    return end;
  };
}
// Countdown-Ring (Handys und Fernseher): Sekunden, Fortschritt (--p) und die letzten 5 s rot.
// Liefert die Intervall-ID (zum Stoppen bei der nächsten Runde); bei 0 stoppt der Ring von selbst.
function runRing(ring, num, end, total = 30000) {
  let last = null;
  const tick = () => {
    const rem = Math.max(0, end - Date.now()), sec = Math.ceil(rem / 1000);
    ring.style.setProperty('--p', Math.min(1, rem / total).toFixed(3));
    if (sec !== last) { num.textContent = sec; ring.classList.toggle('urgent', sec <= 5); last = sec; }
    if (!rem) clearInterval(iv);
  };
  const iv = setInterval(tick, 250);
  tick();
  return iv;
}

/* Karten-Ansicht für Mitspieler: läuft komplett auf deren Handy, ohne Spotify */
function cardMode(param) {
  mountGuess($('#guessText'), $('#btnGuessShow'), $('#btnGuessClear'));
  let b;
  try { b = parseBingo(param); if (!b.g || !(b.s >= 3 && b.s <= 5) || !b.k.length) throw 0; }
  catch { document.body.innerHTML = `<p style="padding:40px;text-align:center">${tx('Diese Bingo-Karte ist ungültig.')}</p>`; return; }
  document.body.classList.add('card-mode');
  $('#cardApp').classList.remove('hidden');
  $('#btnWinClose').onclick = () => $('#bingoWin').classList.add('hidden');
  mountCard(b, { grid: $('#cardGrid'), no: $('#cardNo'), hits: $('#cardHits'), legend: $('#cardLegend'), clear: $('#btnCardClear') }, (num, initial) => {
    if (num == null) return;
    $('#winNo').textContent = num;
    if (!initial) { confetti(); $('#bingoWin').classList.remove('hidden'); }
  });
}

/* Lobby-Ansicht für Mitspieler (?l=CODE): Namen eingeben, Karte kommt vom Server, Markierungen und
   „Bingo!“ gehen live an den Spielleiter, die aktuelle Runde wird oben angezeigt. */
// Kleine Anzeige neben „Dein Tipp“: wurde der Tipp schon abgegeben?
function guessState(el, r, g, text = null) {
  const has = r && g?.n === r.n && g.t;
  const synced = has && (text == null || text.trim() === g.t);   // Feld noch geändert, aber nicht abgegeben?
  const pending = r && r.ph !== 'r' && !synced && !!text?.trim();   // getippt, aber noch nicht abgegeben
  el.className = 'guess-state' + (synced ? ' ok' : pending ? ' wait' : '');
  el.textContent = !r ? '' : r.ph === 'r' ? (has ? tx('· für alle sichtbar') : tx('· Runde aufgelöst'))
    : synced ? tx('✓ abgegeben') : pending ? tx('noch nicht abgegeben') : '';
}

// Gibt es die Lobby und ist sie noch aktiv? Verwaiste Lobbys (24 h ohne Lebenszeichen) werden dabei gelöscht.
const STALE_MS = 24 * 3600 * 1000;
async function lobbyAlive(f, code) {
  const s = await f.get(f.at(`lobbies/${code}`));
  if (!s.exists() || !s.child('bingo').exists()) return false;
  const act = s.child('act').val() || s.child('created').val() || 0;
  if (serverNow() - act > STALE_MS) { f.remove(f.at(`lobbies/${code}`)).catch(() => {}); return false; }
  return true;
}

/* Markier-Regel in der Lobby: erst nach der Auflösung (dann weiß man, ob der Tipp richtig war), pro Runde genau ein Feld,
   und nur eines der Kategorie dieser Runde. Läuft schon der nächste Song, darf man die zuletzt aufgelöste Runde noch
   nachtragen – bis die neue Runde aufgelöst wird. Wieder abwählen geht immer – so lässt sich ein Versehen korrigieren. */
// r = { key, ph, i, q, pv } (pv = zuletzt aufgelöste Runde { id, i, q, n }), name(i, q) = Kurzname der Kategorie auf der Karte
// → { key, cat, name, late } | { wait: true } | null
function markable(r, name) {
  if (!r) return null;
  if (r.old) return { wait: true, old: true };   // Runde gehört noch zur vorigen Partie
  if (r.ph === 'r') return { key: r.key, cat: r.i, name: name(r.i, r.q) };
  if (r.pv) return { key: r.pv.id, cat: r.pv.i, name: name(r.pv.i, r.pv.q), late: true, n: r.pv.n };
  return { wait: true };
}
function markGuard(m, lm, cat, adding) {
  if (!adding) return null;
  if (!m) return tx('Gerade läuft keine Runde – markieren geht nach der Auflösung.');
  if (m.old) return tx('Neue Partie – markieren geht ab der nächsten Runde.');
  if (m.wait) return tx('Erst nach der Auflösung markieren – dann weißt du, ob dein Tipp richtig war.');
  if (cat !== m.cat) return m.late ? tx('Nachtragen geht nur für die letzte Runde: „{c}“ – tippe ein leuchtendes Feld an.', { c: tx(m.name) })
    : tx('In dieser Runde zählt nur „{c}“ – tippe ein leuchtendes Feld an.', { c: tx(m.name) });
  if (lm && lm.n === m.key) return tx('Du hast für diese Runde schon ein Feld markiert. Tippe es nochmal an, um es zu ändern.');
  return null;
}
// Welche Felder leuchten: nach der Auflösung die Kategorie der Runde; beim Nachtragen nur, solange noch nichts markiert ist
const markHot = (m, lm) => m && !m.wait && !(m.late && lm?.n === m.key) ? m.cat : null;
// Hinweis unter der Karte
function markHelp(m, lm) {
  if (m?.late && lm?.n !== m.key) return tx('Runde {n} vergessen? „{c}“ kannst du noch nachtragen, bis die nächste Runde aufgelöst ist.', { n: m.n, c: tx(m.name) });
  if (m && !m.wait && !m.late) return tx('Lag dein Tipp richtig? Tippe ein leuchtendes Feld an – 1 Feld pro Runde.');
  if (m?.old) return tx('Neue Partie – markieren geht ab der nächsten Runde.');
  return tx('Nach der Auflösung: Lag dein Tipp richtig? Dann ein leuchtendes Feld antippen – 1 Feld pro Runde.');
}
// Neue „letzte Markierung“ nach einer Änderung: gesetzt → merken, eigenes Feld dieser Runde abgewählt → freigeben
function nextLm(lm, key, added, removed) {
  if (added != null) return { n: key, i: added };
  if (removed === 'all' || (lm && lm.n === key && lm.i === removed)) return null;
  return lm || null;
}

/* Kartenwahl: zeigt eine Karte; „Andere Karte zeigen“ würfelt eine neue Nummer, die in der Lobby noch frei ist.
   keep = { num, onKeep }: zusätzlich „Meine Karte behalten“ (neue Partie) */
function cardPicker(box, b, used, onPick, keep = null) {
  let num;
  box.innerHTML = (keep ? `<button class="big pick-keep">${ic('check')} ${tx('Meine Karte behalten (Nr. {n})', { n: esc(keep.num) })}</button>` : '') +
    `<span class="pill">${keep ? tx('Oder neue Karte Nr.') : tx('Karte Nr.')} <b class="pick-no"></b></span><div class="pick-card"></div>
    <button class="${keep ? 'ghost' : 'big'} full pick-take" style="width:100%">${keep ? '' : ic('check')} ${keep ? tx('Diese neue Karte nehmen') : tx('Diese Karte nehmen')}</button>
    <button class="ghost full pick-more" style="margin-top:10px;width:100%">${ic('refresh')} ${tx('Andere Karte zeigen')}</button>`;
  const roll = () => {
    do num = 1000 + Math.floor(Math.random() * 9000); while (used.has(num));
    box.querySelector('.pick-no').textContent = num;
    box.querySelector('.pick-card').innerHTML = `<div class="bgrid n${b.s}" style="--n:${b.s}">${cardFields(b, num).map(fl => bcell(b, fl)).join('')}</div>`;
  };
  box.querySelector('.pick-more').onclick = roll;
  box.querySelector('.pick-take').onclick = e => { e.currentTarget.disabled = true; onPick(num); };
  if (keep) box.querySelector('.pick-keep').onclick = keep.onKeep;
  roll();
}

/* Beitreten ohne QR-Code (…/join/ bzw. ?join): Lobby-Code und Name eingeben.
   Nach Spielende oder wenn eine Lobby geschlossen wurde, landen die Mitspieler wieder hier. */
async function codeMode(note = null) {
  note ??= LS.get('joinMsg', null); LS.del('joinMsg');
  document.body.classList.add('card-mode');
  $('#cardApp').classList.remove('hidden');
  $('#cardLive').classList.add('hidden');
  $('#joinBox').classList.remove('hidden');
  $('#pickBox').classList.add('hidden');
  $('#joinBox h3').innerHTML = tx('Lobby <span id="joinCode">beitreten</span>');   // EN: „Join a lobby“ (lobbyMode setzt später den Code ein)
  const inp = $('#joinCodeInput'), btn = $('#btnJoin');
  for (const el of [inp, $('#joinName'), btn]) el.classList.remove('hidden');
  inp.value = '';
  $('#joinName').value = LS.get('name', '');
  $('#joinMsg').textContent = note || tx('Gib den Lobby-Code vom Spielleiter und deinen Namen ein.');
  inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  const go = async () => {
    const code = inp.value.trim(), name = $('#joinName').value.trim();
    if (code.length < 4) return inp.focus();
    if (!name) return $('#joinName').focus();
    btn.disabled = true; $('#joinMsg').textContent = tx('Suche Lobby …');
    try {
      const f = await firebase();
      if (!await lobbyAlive(f, code)) {
        btn.disabled = false; $('#joinMsg').textContent = tx('Lobby „{c}“ gibt es nicht – bitte den Code prüfen.', { c: code });
        return inp.select();
      }
    } catch (e) { btn.disabled = false; $('#joinMsg').textContent = tx('Keine Verbindung zum Server: {e}', { e: e.message }); return; }
    inp.classList.add('hidden');
    history.replaceState(null, '', location.pathname + '?l=' + code);   // Neuladen landet direkt in der Lobby
    lobbyMode(code, name);
  };
  btn.disabled = false; btn.onclick = go;
  inp.onkeydown = e => { if (e.key === 'Enter') $('#joinName').focus(); };
  $('#joinName').onkeydown = e => { if (e.key === 'Enter') go(); };
  inp.focus();
}

let leaveLobby = null;   // wird in der Lobby-Ansicht gesetzt

/* Lobby-Ansicht für Mitspieler (?l=CODE): Name + Karte wählen, Markierungen und „Bingo!“ gehen live an den
   Spielleiter, die aktuelle Runde wird oben angezeigt. autoName: kommt von der Code-Seite. */
async function lobbyMode(code, autoName = null) {
  code = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  document.body.classList.add('card-mode', 'lobby-mode');
  $('#cardApp').classList.remove('hidden');
  $('#cardLive').classList.add('hidden');
  $('#joinBox').classList.remove('hidden');
  $('#joinCode').textContent = code;
  $('#btnWinClose').onclick = () => $('#bingoWin').classList.add('hidden');
  mountGuess($('#guessText'), $('#btnGuessShow'), $('#btnGuessClear'));
  const msg = t => { $('#joinMsg').textContent = t; };
  const btn = $('#btnJoin'); btn.disabled = true; msg(tx('Verbinde mit der Lobby …'));
  let f;
  try { f = await firebase(); } catch (e) { return msg(tx('Keine Verbindung zum Server: {e}', { e: e.message })); }
  const base = `lobbies/${code}`, meRef = f.at(`${base}/players/${f.uid}`);
  let me;
  try {
    if (!await lobbyAlive(f, code)) {
      history.replaceState(null, '', location.pathname + '?join');
      return codeMode(tx('Die Lobby „{c}“ gibt es nicht mehr – gib den neuen Lobby-Code ein.', { c: code }));
    }
    me = (await f.get(meRef)).val();
  } catch (e) { return msg(tx('Fehler: {e}', { e: e.message })); }
  // Zurück zur Code-Eingabe (Lobby geschlossen oder Spiel vorbei)
  const leave = note => {
    LS.set('joinMsg', note);
    f.onDisconnect(f.at(`${base}/players/${f.uid}/on`)).cancel().catch(() => {}).finally(() => location.replace(location.pathname + '?join'));
  };

  let started = false;
  const start = () => {
    if (started) return; started = true;
    $('#joinBox').classList.add('hidden');
    $('#cardLive').classList.remove('hidden');
    $('#cardLobbyInfo').textContent = `Lobby ${code} · ${me.name}`;
    // Lobby von sich aus verlassen (Knopf auf dem Spielende-Bildschirm)
    leaveLobby = () => {
      leaving = true;
      f.onDisconnect(f.at(`${base}/players/${f.uid}/on`)).cancel().catch(() => {})
        .then(() => f.remove(meRef)).catch(() => {}).finally(() => location.replace(location.pathname + '?join'));
    };
    // Online-Status für den Spielleiter
    f.onValue(f.at('.info/connected'), s => {
      if (!s.val()) return;
      f.onDisconnect(f.at(`${base}/players/${f.uid}/on`)).set(false);
      f.set(f.at(`${base}/players/${f.uid}/on`), true).catch(() => {});
    });
    // Alle Zustände zuerst anlegen: Firebase kann Rückmeldungen aus dem Zwischenspeicher sofort liefern
    let curB = null, card = null, mounted = null, wonSent = null, hot = null, leaving = false;
    let curRound = null, lastKey = null, allPlayers = {}, firstPlayers = true, lastGame = null, lastOver = false, cdIv = null;
    let lastPh = null, lastPhKey = null, buzzSent = null, buzzT = null;   // Runden-Box: Countdown-Start erkennen, Buzzer gedrückt
    const cdEndOf = cdClock(); let roundSeen = false, cdEnd = 0;          // Countdown-Ende auf der eigenen Uhr
    const keyOf = r => r ? r.id ?? r.n : null;   // eindeutige Runden-ID
    const curMark = () => curRound && markable({ key: keyOf(curRound), ph: curRound.ph, i: curRound.i, q: curRound.q, pv: curRound.pv, old: curRound.old }, (i, q) => curB?.k.find(k => k.i === i)?.n || q);
    // Leuchtende Felder und Hinweis an den aktuellen Stand anpassen (neue Runde, Auflösung, eigene Markierung)
    const updMark = () => { const m = curMark(); hot = markHot(m, me?.lm); card?.setHot(hot); $('#markHelp').textContent = markHelp(m, me?.lm); };
    const mountMine = () => {
      const b = curB; wonSent = null;
      card = mountCard(b, { grid: $('#cardGrid'), no: $('#cardNo'), hits: $('#cardHits'), legend: $('#cardLegend'), clear: $('#btnCardClear') }, (num, initial) => {
        const won = num != null;
        if (won) $('#winNo').textContent = num;
        if (won && !initial) { confetti(); $('#winLobby').textContent = tx('Der Spielleiter hat dein Bingo bekommen und prüft gleich deine Karte.'); $('#bingoWin').classList.remove('hidden'); }
        if (!won) $('#bingoWin').classList.add('hidden');   // Markierungen weg (neue Partie) → Bingo-Bildschirm zu
        if (wonSent !== won) { wonSent = won; f.update(meRef, { bingo: won ? f.serverTimestamp() : null, ...(won ? {} : { ok: null }) }).catch(() => {}); }
      }, {
        num: me.num,
        marks: me.g === b.g ? me.marks || [] : [],
        guard: (i, cat, adding) => markGuard(curMark(), me?.lm, cat, adding),
        onChange: (marks, added, removed) => {
          const m = curMark(), lm = nextLm(me?.lm, m && !m.wait ? m.key : null, added, removed);
          if (me) me.lm = lm;   // sofort merken – ein zweiter schneller Tipp wird so auch ohne Server-Antwort abgelehnt
          f.update(meRef, { marks, g: b.g, lm }).catch(e => toast(tx('Sync-Fehler: {e}', { e: e.message })));
          updMark();
        },
      });
      mounted = { g: b.g, num: me.num };
      updMark();
    };
    f.onValue(f.at(`${base}/bingo`), s => {
      const b = s.val();
      if (!b) return leave(tx('Der Spielleiter hat das Bingo beendet. Für ein neues Spiel den neuen Lobby-Code eingeben.'));
      if (curB && b.g === curB.g) return;
      const fresh = !!curB;      // neue Karten während des Spiels
      curB = b; mountMine(); drawRound();
      f.update(meRef, { g: b.g, ...(me.g === b.g ? {} : { marks: null }) }).catch(() => {});
      if (fresh) toast(tx('Neue Karten – deine Karte wurde neu gemischt'), 6000);
    });
    // Eigener Eintrag: Spielleiter setzt Markierungen zurück, bestätigt das Bingo oder entfernt einen
    let wasOk = !!me?.ok;   // schon bestätigt → nach dem Neuladen nicht nochmal melden
    f.onValue(meRef, async s => {
      const p = s.val();
      if (!p) {      // entfernt: Lobby noch da → neu beitreten, sonst zurück zur Code-Eingabe
        if (leaving) return;
        const still = await f.get(f.at(`${base}/bingo`)).then(x => x.exists()).catch(() => false);
        if (still) f.onDisconnect(f.at(`${base}/players/${f.uid}/on`)).cancel().finally(() => location.reload());
        else leave(tx('Die Lobby wurde geschlossen. Für ein neues Spiel den neuen Lobby-Code eingeben.'));
        return;
      }
      me = p;
      if (curB && p.num !== mounted?.num) mountMine();                 // neue Karte gewählt
      else if (card && p.g === curB?.g) card.setMarks(p.marks || []);
      if (p.ok && !wasOk) { toast(tx('✅ Der Spielleiter hat dein Bingo bestätigt!'), 8000); confetti(); $('#winLobby').textContent = tx('✅ Der Spielleiter hat dein Bingo bestätigt!'); }
      wasOk = !!p.ok;
      updMark();
      renderGuesses();
    });
    // Tipps: werden mit „Fertig“ auf der Tastatur (oder beim Verlassen des Felds) abgegeben – nur solange die Runde läuft.
    // Die anderen sehen erst nach dem Auflösen, was getippt wurde – vorher nur, wer schon fertig ist.
    const sendGuess = () => {
      if (!curRound || curRound.ph === 'r') return;
      const t = $('#guessText').value.trim().slice(0, 80);
      const cur = me?.guess;
      if ((cur?.n === keyOf(curRound) ? cur.t : '') === t) return;   // nichts geändert
      f.update(meRef, { guess: t ? { t, n: keyOf(curRound) } : null }).catch(() => {});
    };
    $('#guessText').addEventListener('blur', sendGuess);
    $('#guessText').addEventListener('keydown', e => { if (e.key === 'Enter') sendGuess(); });   // „Fertig“ auf der Tastatur
    $('#guessText').addEventListener('input', () => {
      // Abgegebenen Tipp ändern → wieder „nicht abgegeben“ (der ✓ bei den anderen verschwindet), bis erneut „Fertig“
      const g = me?.guess;
      if (curRound && curRound.ph !== 'r' && g?.t && g.n === keyOf(curRound) && $('#guessText').value.trim() !== g.t) {
        me.guess = null; f.update(meRef, { guess: null }).catch(() => {});
      }
      renderGuesses();
    });
    $('#btnGuessClear').addEventListener('click', () => { sendGuess(); renderGuesses(); });
    $('#btnGuessShow').addEventListener('click', sendGuess);
    function renderGuesses() {
      const box = $('#guessLive'), r = curRound;
      guessState($('#plGuessState'), r && { n: keyOf(r), ph: r.ph }, me?.guess, $('#guessText').value);
      const list = Object.entries(allPlayers).filter(([, p]) => p?.name).map(([id, p]) => ({ id, ...p }));
      box.classList.toggle('hidden', !r || list.length < 2);
      if (!r || list.length < 2) return;
      const has = p => p.guess?.n === keyOf(r) && p.guess.t;
      box.innerHTML = r.ph === 'r'
        ? list.map(p => `<span class="${has(p) ? 'ok' : ''}"><b>${esc(p.name)}${p.id === f.uid ? tx(' (du)') : ''}:</b> ${has(p) ? esc(p.guess.t) : '–'}</span>`).join('')
        : `<span>${tx('💬 Fertig: {a} / {b}', { a: list.filter(has).length, b: list.length })}</span>` + list.map(p => `<span class="${has(p) ? 'ok' : ''}">${has(p) ? '✓' : '…'} ${esc(p.name)}</span>`).join('');
    }
    // Alle Mitspieler: Tipps, und wer Bingo ruft oder gewonnen hat
    f.onValue(f.at(`${base}/players`), s => {
      const prev = allPlayers;
      allPlayers = s.val() || {};
      if (!firstPlayers) for (const [id, p] of Object.entries(allPlayers)) {
        if (id === f.uid || !p?.name) continue;
        if (p.ok && !prev[id]?.ok) { toast(tx('🏆 {n} hat Bingo und gewinnt die Partie!', { n: p.name }), 7000); confetti(); }
        else if (p.bingo && !prev[id]?.bingo) toast(tx('🎉 {n} ruft BINGO!', { n: p.name }), 6000);
      }
      firstPlayers = false;
      renderGuesses();
    });
    // Partie-Stand und Siege; neue Partie → Karte behalten oder neu wählen; Spiel vorbei → Spielende-Bildschirm
    f.onValue(f.at(`${base}/match`), s => {
      const m = s.val(), box = $('#matchLive');
      box.classList.toggle('hidden', !m);
      if (!m) return;
      m.wins ??= {}; m.names ??= {}; m.won ??= []; m.tips ??= {};
      box.innerHTML = `<b>${matchTitle(m)}</b>${Object.keys(m.wins).length ? winsHtml(m).replace('class="match-tbl"', 'class="match-tbl" style="margin:0"') : ''}${m.over ? `<b>${esc(matchWinner(m))}</b>` : ''}`;
      if (lastGame !== null && !m.over && (m.game !== lastGame || lastOver)) showRepick(m);
      // Spiel vorbei: eine offene Kartenwahl (neue Partie) ist hinfällig
      const rp = $('#repickBox');
      if (m.over && !rp.classList.contains('hidden')) { rp.classList.add('hidden'); rp.innerHTML = ''; $('#cardLive .card-wrap').classList.remove('hidden'); }
      if (m.over) showEnd(m, `<button class="big" data-end-leave>${tx('Lobby verlassen')}</button><button class="ghost" data-end-close>${tx('Hier bleiben')}</button>`);
      else $('#endScreen').classList.add('hidden');
      lastGame = m.game; lastOver = !!m.over;
    });
    // Neue Partie: Karte behalten oder eine neue (freie) Nummer wählen.
    // Erst nur zwei Knöpfe – die eigene Karte steht ja darunter. Beim Aussuchen ersetzt die Vorschau die eigene Karte,
    // so ist nie mehr als eine Karte auf dem Bildschirm.
    function showRepick(m) {
      if (!curB) return;
      const box = $('#repickBox'), own = $('#cardLive .card-wrap');
      const used = new Set(Object.entries(allPlayers).filter(([id]) => id !== f.uid).map(([, p]) => +p?.num));
      const done = () => { box.classList.add('hidden'); box.innerHTML = ''; own.classList.remove('hidden'); };
      own.classList.remove('hidden');
      box.classList.remove('hidden');
      box.innerHTML = `<div class="rp-h">${tx('{p} beginnt', { p: esc(partieName(m)) })}</div>
        <div class="small muted" style="margin-bottom:12px">${tx('Die Markierungen sind gelöscht. Mit deiner Karte weiterspielen oder eine neue aussuchen?')}</div>
        <button class="big rp-keep" style="width:100%">${ic('check')} ${tx('Karte Nr. {n} behalten', { n: esc(me.num) })}</button>
        <button class="ghost rp-new" style="width:100%;margin-top:10px">${ic('refresh')} ${tx('Neue Karte aussuchen')}</button>`;
      box.querySelector('.rp-keep').onclick = done;
      box.querySelector('.rp-new').onclick = () => {
        own.classList.add('hidden');
        box.innerHTML = `<div class="rp-h">${tx('Neue Karte aussuchen')}</div><div class="rp-pick"></div><button class="ghost rp-back" style="width:100%;margin-top:10px">${tx('Doch meine alte Karte behalten')}</button>`;
        box.querySelector('.rp-back').onclick = done;
        cardPicker(box.querySelector('.rp-pick'), curB, used, num => { f.update(meRef, { num, marks: null }).catch(e => toast(tx('Fehler: {e}', { e: e.message }))); done(); });
      };
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Aktuelle Runde
    f.onValue(f.at(`${base}/round`), s => {
      const r = s.val();
      curRound = r;
      if (r?.ph === 'c' && r.end) cdEnd = cdEndOf(r, roundSeen);
      roundSeen = true;
      // Neue Runde → alter Tipp weg. Macht der Spielleiter ein Überspringen rückgängig, kommt der Tipp dieser Runde zurück.
      if (r && keyOf(r) !== lastKey) {
        const mine = me?.guess;
        if (lastKey !== null && keyOf(r) > lastKey) { $('#guessText').value = ''; LS.set('guess', ''); }
        // Gespeicherter Tipp dieser Runde (nach „Rückgängig“ oder Neuladen) gehört ins Feld
        else if (mine?.t && mine.n === keyOf(r) && $('#guessText').value.trim() !== mine.t) { $('#guessText').value = mine.t; LS.set('guess', mine.t); }
        lastKey = keyOf(r);
      }
      // Karte: Felder hervorheben, die man gerade markieren darf
      // Countdown startet (Spielleiter oder Buzzer) → kurz vibrieren, damit es jeder merkt
      if (r?.ph === 'c' && lastPh === 'p' && keyOf(r) === lastPhKey) { try { navigator.vibrate?.(60); } catch {} }
      lastPh = r?.ph ?? null; lastPhKey = keyOf(r);
      updMark();
      renderGuesses();
      drawRound();
    });
    // Runden-Box oben: links Kategorie (und nach der Auflösung die Lösung), rechts ein fester Platz für
    // den Buzzer (solange der Song läuft) bzw. den Countdown-Ring – so kommt nichts Zusätzliches auf den Bildschirm.
    function drawRound() {
      const r = curRound, box = $('#roundLive');
      clearInterval(cdIv); cdIv = null;
      box.classList.toggle('hidden', !r);
      if (!r) return;
      box.style.borderColor = r.c;
      const cd = r.ph === 'c' && r.end, canBuzz = r.ph === 'p' && hasBuzz(curB), sent = buzzSent === keyOf(r);
      const st = r.ph === 'r' ? tx(' · aufgelöst') : cd ? tx(' · Countdown') : tx(' · läuft');
      const side = cd ? `<div class="rl-timer" style="--c:${esc(r.c)}" role="timer"><b class="rl-cd"></b></div>`
        : canBuzz ? `<button class="rl-buzz" ${sent ? 'disabled' : ''} aria-label="${tx('Buzzer – Countdown für alle starten')}">🔔<small>${sent ? tx('Gesendet') : tx('Buzzer')}</small></button>` : '';
      box.innerHTML = `<span class="rl-ic">${esc(r.e)}</span><div class="rl-main"><div class="rl-k">${tx('Runde {n}', { n: esc(r.n) })}${st}${r.bz ? ` <span class="rl-by">🔔 ${esc(r.bz)}</span>` : ''}</div>
        <div class="rl-n">${esc(tx(r.q))}</div>${r.ph === 'r' ? `<div class="rl-a">${esc(locAnswer(r))}</div><div class="small muted">${esc(r.s)}${r.y ? ` <span class="rv-year">· ${esc(r.y)}</span>` : ''}</div>` : ''}</div>${side}`;
      if (cd) cdIv = runRing(box.querySelector('.rl-timer'), box.querySelector('.rl-cd'), cdEnd, r.dur);
    }
    // Buzzer: Runde merken, der Spielleiter startet daraufhin den Countdown. Kommt nichts zurück (Spielleiter offline),
    // wird der Knopf nach ein paar Sekunden wieder frei.
    $('#roundLive').addEventListener('click', e => {
      if (!e.target.closest('.rl-buzz') || !curRound || curRound.ph !== 'p' || !hasBuzz(curB)) return;
      const k = keyOf(curRound);
      buzzSent = k; drawRound();
      try { navigator.vibrate?.(30); } catch {}
      f.update(meRef, { bz: { n: k, t: f.serverTimestamp() } }).catch(err => { buzzSent = null; drawRound(); toast(tx('Sync-Fehler: {e}', { e: err.message })); });
      clearTimeout(buzzT);
      buzzT = setTimeout(() => { if (buzzSent === k) { buzzSent = null; if (curRound?.ph === 'p' && keyOf(curRound) === k) { drawRound(); toast(tx('Der Spielleiter hat (noch) nicht reagiert – nochmal versuchen?')); } } }, 6000);
    });
  };

  if (me?.name) return start();
  $('#joinName').value = LS.get('name', '');
  btn.disabled = false; msg(tx('Gib deinen Namen ein, dann bekommst du deine Bingo-Karte.'));
  // Nach dem Namen: Karte aussuchen (eine Karte, „Andere Karte zeigen“ würfelt eine neue freie Nummer)
  const showPicker = async name => {
    btn.disabled = true;
    try {
      const [b, players] = await Promise.all([f.get(f.at(`${base}/bingo`)), f.get(f.at(`${base}/players`))]).then(r => r.map(x => x.val()));
      const used = new Set(Object.values(players || {}).map(p => +p?.num));
      // Name schon vergeben (zwei „Max“)? → „Max 2“, damit Liste, Siege und Tipps eindeutig bleiben
      const taken = new Set(Object.entries(players || {}).filter(([id]) => id !== f.uid).map(([, p]) => String(p?.name || '').toLowerCase()));
      const typed = name;
      for (let i = 2, base0 = name.slice(0, 21); taken.has(name.toLowerCase()); i++) name = `${base0} ${i}`;
      $('#joinName').classList.add('hidden'); $('#joinCodeInput').classList.add('hidden'); btn.classList.add('hidden');
      $('#pickBox').classList.remove('hidden');
      msg(tx('Hallo {n}! Such dir deine Karte aus:', { n: name }));
      cardPicker($('#pickBox'), b, used, async num => {
        msg(tx('Einen Moment …'));
        try {
          me = { name, num, on: true, joined: f.serverTimestamp() };
          await f.set(meRef, me);
          LS.set('name', typed);   // für das nächste Mal den eingegebenen Namen merken (ohne „ 2“)
          start();
        } catch (err) { msg(tx('Beitreten fehlgeschlagen: {e}', { e: err.message })); showPicker(name); }
      });
    } catch (e) { btn.disabled = false; msg(tx('Fehler: {e}', { e: e.message })); }
  };
  const join = () => {
    const name = $('#joinName').value.trim().slice(0, 24);
    if (!name) return $('#joinName').focus();
    $('#joinName').blur();
    showPicker(name);
  };
  btn.onclick = join;
  $('#joinName').onkeydown = e => { if (e.key === 'Enter') join(); };
  if (autoName) { $('#joinName').value = autoName; join(); }
}

/* Fernseher-Ansicht (?tv=CODE): zeigt Runde, Countdown, Auflösung, Tipps, Siege und den QR-Code zum Beitreten.
   Liest nur – schreibt nichts in die Lobby. */
async function tvMode(code) {
  code = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  document.body.classList.add('tv-mode');
  $('#tvApp').classList.remove('hidden');
  $('#tvCode').textContent = code;
  $('#tvJoin').textContent = tx('Scannen oder {u} öffnen', { u: (cardBase() + 'join').replace(/^https?:\/\//, '') });
  const show = html => { $('#tvRound').innerHTML = html; };
  show(`<div class="tv-idle">${tx('Verbinde …')}</div>`);
  let f;
  try { f = await firebase(); } catch (e) { return show(`<div class="tv-idle">${tx('Keine Verbindung: {e}', { e: esc(e.message) })}</div>`); }
  if (!await lobbyAlive(f, code).catch(() => false)) return show(`<div class="tv-idle">${tx('Die Lobby „{c}“ gibt es nicht.', { c: esc(code) })}</div>`);
  loadQrLib().then(qrcode => { const q = qrcode(0, 'L'); q.addData(lobbyUrl(code)); q.make(); $('#tvQr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }).catch(() => {});
  const base = `lobbies/${code}`;
  let r = null, players = {}, match = null, cdIv = null, ended = false;
  const cdEndOf = cdClock(); let roundSeen = false, cdEnd = 0;   // Countdown-Ende auf der eigenen Uhr
  const key = x => x ? x.id ?? x.n : null;
  // Hauptfläche: Warten → Song läuft → Countdown (Ring, wer gebuzzert hat) → Auflösung (Cover links, Lösung rechts).
  // Alle Größen richten sich nach Breite UND Höhe (--u in app.css) – auf einem Fernseher kann niemand scrollen.
  const draw = () => {
    clearInterval(cdIv); cdIv = null;
    const box = $('#tvRound');
    box.className = 'tv-round glass' + (r && !ended ? ' ph-' + r.ph : '');
    $('#tvApp').classList.toggle('playing', !!r && !ended);   // während des Spiels: QR-Code kleiner, mehr Platz für die Liste
    if (ended) return show(`<div class="tv-idle">${tx('Das Bingo wurde beendet.')}</div>`);
    if (!r) return show(`<div class="tv-idle">${tx('Gleich geht’s los …')}</div><div class="tv-k">${tx('Jetzt beitreten – QR-Code scannen')}</div>`);
    const k = `<div class="tv-k">${tx('Runde {n}', { n: esc(r.n) })}</div>`;
    const cat = `<div class="tv-cat" style="color:${esc(r.c)}"><span class="tv-ic">${esc(r.e)}</span><span>${esc(tx(r.q))}</span></div>`;
    const buzz = r.bz ? `<div class="tv-buzz">${tx('🔔 {n} hat gebuzzert!', { n: esc(r.bz) })}</div>` : '';
    if (r.ph === 'r') {
      const title = r.ti ?? r.s, artist = r.ar ?? '';
      return show(k + cat + `<div class="tv-rev">${r.cv ? `<img class="tv-cover" src="${esc(r.cv)}" alt="">` : '<div class="tv-cover tv-nocover">♪</div>'}
        <div class="tv-rev-t"><div class="tv-answer">${esc(locAnswer(r))}</div><div class="tv-title">${esc(title)}</div>
        <div class="tv-artist"><span>${esc(artist)}</span>${r.y ? `<span class="rv-year">${artist ? '· ' : ''}${esc(r.y)}</span>` : ''}</div></div></div>` + buzz);
    }
    const tips = '<div class="tv-tips" id="tvTips"></div>';
    if (r.ph === 'c' && r.end) {
      show(k + cat + `<div class="tv-ring" style="--c:${esc(r.c)}"><b id="tvCount"></b></div>` + buzz + tips);
      cdIv = runRing(box.querySelector('.tv-ring'), $('#tvCount'), cdEnd, r.dur);
    } else show(k + cat + `<div class="tv-listen">${tx('♪ Hört genau hin …')}</div>` + tips);
    drawTips();
  };
  // „💬 3 / 8 haben getippt“ unter dem Countdown bzw. dem laufenden Song
  const drawTips = () => {
    const el = $('#tvTips'); if (!el || !r) return;
    const list = Object.values(players).filter(p => p?.name);
    const n = list.filter(p => p.guess?.n === key(r) && p.guess.t).length;
    el.textContent = list.length ? tx('💬 {a} / {b} haben getippt', { a: n, b: list.length }) : '';
  };
  // Große Einblendung für Ereignisse, die alle sehen sollen (Bingo-Ruf, Sieg, neue Partie)
  let bannerT = null;
  const banner = (html, ms = 7000, party = false) => {
    const b = $('#tvBanner');
    b.innerHTML = html; b.classList.remove('hidden'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    if (party) confetti();
    clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.add('hidden'), ms);
  };
  let firstPlayers = true, lastGame = null;
  const drawSide = () => {
    const list = Object.entries(players).filter(([, p]) => p?.name).map(([id, p]) => ({ id, ...p }));
    const done = p => r && p.guess?.n === key(r) && p.guess.t;
    const wins = id => match?.wins?.[id] || 0;
    list.sort((a, b) => wins(b.id) - wins(a.id) || String(a.name).localeCompare(b.name));
    const box = $('#tvPlayers');
    if (!box.querySelector('.tv-track')) box.innerHTML = '<div class="tv-h"></div><div class="tv-scroll"><div class="tv-track"></div></div>';
    box.querySelector('.tv-h').textContent = `${r?.ph === 'r' ? tx('Tipps') : tx('Mitspieler')} · ${list.length}`;
    const rows = list.map(p => `<div class="tvp"><span>${p.bingo ? '🎉 ' : ''}${esc(p.name)}${wins(p.id) ? ` <b>🏆${wins(p.id)}</b>` : ''}</span>` +
      (r?.ph === 'r' ? `<span class="g">${done(p) ? esc(p.guess.t) : '–'}</span>` : `<span class="g">${done(p) ? '<b>✓</b>' : ''}</span>`) + '</div>').join('') || `<div class="g">${tx('Noch niemand da – QR-Code scannen!')}</div>`;
    // Passen nicht alle auf den Bildschirm, läuft die Liste langsam endlos nach oben (zweite Kopie direkt dahinter = nahtlos).
    // Die Animation hängt am bleibenden .tv-track – neue Tipps tauschen nur den Inhalt, die Liste springt also nicht nach oben.
    const track = box.querySelector('.tv-track'), view = track.parentElement;
    track.innerHTML = `<div class="tv-copy">${rows}</div>`;
    const h = track.firstChild.offsetHeight, over = h > view.clientHeight + 2;
    if (over) track.insertAdjacentHTML('beforeend', `<div class="tv-copy" aria-hidden="true">${rows}</div>`);
    box.classList.toggle('rolling', over);
    const d = Math.round(h / 28) + 's';   // ca. 28 Pixel pro Sekunde
    if (over && track.style.getPropertyValue('--d') !== d) track.style.setProperty('--d', d);
    $('#tvMatch').textContent = match ? matchTitle(match) : '';
  };
  addEventListener('resize', () => drawSide());
  f.onValue(f.at(`${base}/round`), s => {
    r = s.val();
    if (r?.ph === 'c' && r.end) cdEnd = cdEndOf(r, roundSeen);
    roundSeen = true;
    draw(); drawSide();
  });
  f.onValue(f.at(`${base}/players`), s => {
    const prev = players;
    players = s.val() || {};
    if (!firstPlayers) for (const [id, p] of Object.entries(players)) {
      if (!p?.name) continue;
      if (p.ok && !prev[id]?.ok) banner(`<div class="tv-b-big">🏆</div><div>${tx('{n} gewinnt die Partie!', { n: esc(p.name) })}</div>`, 9000, true);
      else if (p.bingo && !prev[id]?.bingo) banner(`<div class="tv-b-big">🎉 <b>BINGO!</b></div><div>${tx('{n} ruft Bingo – der Spielleiter prüft die Karte', { n: esc(p.name) })}</div>`, 8000);
    }
    firstPlayers = false;
    drawSide(); drawTips();
  });
  f.onValue(f.at(`${base}/match`), s => {
    match = s.val(); if (match) { match.wins ??= {}; match.names ??= {}; match.won ??= []; match.tips ??= {}; }
    if (match && lastGame !== null && match.game > lastGame && !match.over) banner(`<div class="tv-b-big"><b>${esc(partieName(match))}</b></div><div>${tx('Neue Partie – Markierungen sind gelöscht')}</div>`, 6000);
    if (match) lastGame = match.game;
    drawSide();
    if (match?.over) showEnd(match, ''); else $('#endScreen').classList.add('hidden');
  });
  f.onValue(f.at(`${base}/bingo`), s => { ended = !s.exists(); draw(); });
}

/* Eigene Karte des Spielleiters (im Menü „Bingo“)
   Mit Lobby ist die Spielleiter-Karte ein normaler Lobby-Eintrag: erst aussuchen, dann live synchronisiert */
let myMount = null;    // { g, num, ctl } der gerade angezeigten Karte
let myRepick = false;  // neue Partie: Karte behalten oder neu wählen
function renderMyCard() {
  const b = state.bingo;
  $('#myCardOff').classList.toggle('hidden', !!b);
  $('#myCardOn').classList.toggle('hidden', !b);
  myMount = null;
  if (!b) return;
  const me = Lobby.me();
  const pick = !!Lobby.code && (!me?.name || myRepick);
  $('#myCardPick').classList.toggle('hidden', !pick);
  $('#myCardPlay').classList.toggle('hidden', pick);
  if (pick) {
    if (!Lobby.uid) { $('#myPickBox').innerHTML = '<span class="loader"></span>'; return; }
    if (me?.name) {   // neue Partie
      $('#myPickText').textContent = tx('{p} beginnt – behalte deine Karte oder such dir eine neue aus.', { p: state.match ? partieName(state.match) : '' });
      const used = new Set(lobbyList().filter(p => p.id !== Lobby.uid).map(p => +p.num));
      return cardPicker($('#myPickBox'), b, used, num => {
        myRepick = false;
        Lobby.write(`players/${Lobby.uid}/marks`, null);
        Lobby.write(`players/${Lobby.uid}/num`, num);
      }, { num: me.num, onKeep: () => { myRepick = false; renderMyCard(); } });
    }
    $('#myPickText').textContent = tx('Such dir deine Karte aus – du spielst in der Lobby wie alle anderen mit.');
    return cardPicker($('#myPickBox'), b, new Set(lobbyList().map(p => +p.num)), num => Lobby.joinHost(num));
  }
  mountGuess($('#myGuessText'), $('#btnMyGuessShow'), $('#btnMyGuessClear'));
  let wonSent = null;
  const ctl = mountCard(b, { grid: $('#myCardGrid'), no: $('#myCardNo'), hits: $('#myCardHits'), legend: $('#myCardLegend'), clear: $('#btnMyCardClear') }, (num, initial) => {
    $('#myCardWin').classList.toggle('hidden', num == null);
    if (num != null) { $('#myCardWinNo').textContent = num; if (!initial) { confetti(); beep(1046, .3); } }
    // Bingo auch in der Lobby anzeigen (wie bei den Mitspielern)
    const won = num != null;
    if (me && wonSent !== won) { wonSent = won; Lobby.write(`players/${Lobby.uid}/bingo`, won ? Date.now() : null); if (!won) Lobby.write(`players/${Lobby.uid}/ok`, null); }
  }, me ? {
    num: me.num,
    marks: me.g === b.g ? me.marks || [] : [],
    guard: (i, cat, adding) => markGuard(hostMark(), Lobby.me()?.lm, cat, adding),
    onChange: (marks, added, removed) => {
      const m = hostMark(), cur = Lobby.me(), lm = nextLm(cur?.lm, m && !m.wait ? m.key : null, added, removed);
      if (cur) cur.lm = lm;
      Lobby.write(`players/${Lobby.uid}/marks`, marks); Lobby.write(`players/${Lobby.uid}/g`, b.g); Lobby.write(`players/${Lobby.uid}/lm`, lm);
      updHostMark();
    },
  } : null);
  myMount = { g: b.g, num: me?.num, ctl };
  updHostMark();
  renderMyGuessState();
  renderMyLive();
}
// Spielleiter spielt mit: oben auf „Meine Karte“ Partie-Stand und wer schon getippt hat (nach der Auflösung: was)
function renderMyLive() {
  const box = $('#myLive'), gl = $('#myGuessLive'), m = state.match, on = !!(Lobby.code && Lobby.me());
  box.classList.toggle('hidden', !on || !m);
  if (on && m) box.innerHTML = `<b>${matchTitle(m)}</b>${Object.keys(m.wins || {}).length ? winsHtml(m).replace('class="match-tbl"', 'class="match-tbl" style="margin:0"') : ''}${m.over ? `<b>${esc(matchWinner(m))}</b>` : ''}`;
  const list = on ? lobbyList() : [], r = round, show = on && r && list.length >= 2;
  gl.classList.toggle('hidden', !show);
  if (!show) return;
  const has = p => p.guess?.n === r.id && p.guess.t;
  gl.innerHTML = r.phase === 'revealed'
    ? list.map(p => `<span class="${has(p) ? 'ok' : ''}"><b>${esc(p.name)}${p.id === Lobby.uid ? tx(' (du)') : ''}:</b> ${has(p) ? esc(p.guess.t) : '–'}</span>`).join('')
    : `<span>${tx('💬 Fertig: {a} / {b}', { a: list.filter(has).length, b: list.length })}</span>` + list.map(p => `<span class="${has(p) ? 'ok' : ''}">${has(p) ? '✓' : '…'} ${esc(p.name)}</span>`).join('');
}
// Lobby hat sich geändert, während „Meine Karte“ offen ist: Markierungen übernehmen oder neu aufbauen
function syncMyCard() {
  const me = Lobby.me(), b = state.bingo;
  if (myRepick && me) return;   // Kartenwahl der neuen Partie ist offen – nicht neu würfeln
  if (!b || !myMount || !me || myMount.g !== b.g || myMount.num !== me.num) return renderMyCard();
  myMount.ctl.setMarks(me.g === b.g ? me.marks || [] : []);
  updHostMark();
  renderMyGuessState();
  renderMyLive();
}
// Spielleiter: wie bei den Mitspielern – die zuletzt aufgelöste Runde (state.lastRev) darf nachgetragen werden
function hostMark() {
  if (!round) return null;
  return markable({ key: round.id, ph: round.phase === 'revealed' ? 'r' : 'p', i: round.cat.id, q: round.cat.name, pv: lastRevFor(round), old: round.n <= (state.partieFrom || 0) },
    (i, q) => state.bingo?.k.find(k => k.i === i)?.n || q);
}
// Ohne Lobby gelten keine Regeln: dort leuchtet einfach die Kategorie der Runde
function updHostMark() {
  if (!myMount) return;
  const lobby = !!Lobby.me(), m = lobby ? hostMark() : null;
  myMount.ctl.setHot(lobby ? markHot(m, Lobby.me()?.lm) : round ? round.cat.id : null);
  $('#myMarkHelp').textContent = lobby ? markHelp(m, Lobby.me()?.lm) : tx('Hast du die Frage einer Runde richtig beantwortet? Dann markiere ein Feld dieser Kategorie – genau wie die Mitspieler.');
}
const renderMyGuessState = () => guessState($('#myGuessState'), Lobby.code && round ? { n: round.id, ph: round.phase === 'revealed' ? 'r' : 'p' } : null, Lobby.me()?.guess, $('#myGuessText').value);
// Tipp des Spielleiters in die Lobby – mit „Fertig“ bzw. beim Verlassen des Felds, nur solange die Runde läuft
function sendMyGuess() {
  const me = Lobby.me();
  if (!me || !round || round.phase === 'revealed') return;
  const t = $('#myGuessText').value.trim().slice(0, 80);
  if ((me.guess?.n === round.id ? me.guess.t : '') === t) return;
  Lobby.write(`players/${Lobby.uid}/guess`, t ? { t, n: round.id } : null);
}
$('#myGuessText').addEventListener('blur', sendMyGuess);
$('#myGuessText').addEventListener('keydown', e => { if (e.key === 'Enter') sendMyGuess(); });
$('#myGuessText').addEventListener('input', () => {
  // wie bei den Mitspielern: Ändern nimmt die Abgabe zurück
  const me = Lobby.me(), g = me?.guess;
  if (round && round.phase !== 'revealed' && g?.t && g.n === round.id && $('#myGuessText').value.trim() !== g.t) {
    me.guess = null; Lobby.write(`players/${Lobby.uid}/guess`, null);
  }
  renderMyGuessState();
});
$('#btnMyGuessClear').addEventListener('click', () => { sendMyGuess(); renderMyGuessState(); });
$('#btnMyGuessShow').addEventListener('click', sendMyGuess);
const renderMyCardBtn = () => $('#myCardBtn').classList.toggle('hidden', !state.bingo || state.settings.hostPlays === false);
