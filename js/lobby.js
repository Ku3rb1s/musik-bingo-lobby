// Musik-Bingo – Lobby (Firebase): Mitspieler, Runden-Sync, Partien & Siege
'use strict';

/* ---------------- Lobby (Firebase) ---------------- */
// Realtime Database: lobbies/{CODE} = { host, created, bingo: { g, s, k }, round: { n, q, e, c, ph, a, s } | null,
//   players: { {uid}: { name, num, g, marks: [Feldnummern], on, bingo: Zeit | null, ok } } }
// Der Spielleiter schreibt Karten und Runde, jeder Mitspieler nur seinen eigenen Eintrag (siehe database.rules.json).
let fbP = null;
function firebase() {
  fbP ??= (async () => {
    if (!hasFirebase()) throw new Error('Firebase ist nicht eingerichtet');
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VER}/`;
    const [app, auth, db] = await Promise.all(['firebase-app', 'firebase-auth', 'firebase-database'].map(m => import(base + m + '.js')));
    const a = app.initializeApp(FIREBASE_CONFIG);
    const au = auth.getAuth(a);
    // Anonym anmelden – die ID bleibt im Browser gespeichert, so findet jeder nach dem Neuladen seine Karte wieder
    const user = await new Promise(res => { const off = auth.onAuthStateChanged(au, u => { off(); res(u); }); })
      || (await auth.signInAnonymously(au)).user;
    return { ...db, db: db.getDatabase(a), uid: user.uid, at: p => db.ref(db.getDatabase(a), p) };
  })();
  fbP.catch(() => { fbP = null; });
  return fbP;
}
const nameList = names => names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' und ' + names.at(-1);
const LOBBY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const plainText = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };

const Lobby = {
  code: null, players: {}, unsub: null,
  // Neue Lobby für die aktuellen Karten anlegen
  async open(b) {
    const f = await firebase();
    for (let i = 0; i < 10; i++) {
      const code = Array.from(crypto.getRandomValues(new Uint8Array(4)), x => LOBBY_CHARS[x % LOBBY_CHARS.length]).join('');
      if ((await f.get(f.at('lobbies/' + code))).exists()) continue;
      newMatch();
      await f.set(f.at('lobbies/' + code), { host: f.uid, created: f.serverTimestamp(), act: f.serverTimestamp(), bingo: b, match: state.match });
      // Frühere, nicht beendete Lobbys dieses Geräts aufräumen
      for (const old of LS.get('myLobbies', [])) if (old !== code) f.remove(f.at('lobbies/' + old)).catch(() => {});
      LS.set('myLobbies', [code]);
      state.lobby = code; LS.set('lobby', code);
      this.watch();
      return code;
    }
    throw new Error('Kein freier Lobby-Code gefunden');
  },
  // Mitspieler beobachten: Markierungen, online/offline und Bingo-Rufe
  async watch() {
    this.stop();
    if (!state.lobby || !state.bingo || !hasFirebase()) return;
    const code = this.code = state.lobby;
    try {
      const f = await firebase();
      if (this.code !== code) return;
      this.uid = f.uid;   // spielt der Spielleiter mit, steht er unter dieser ID in players
      const snap = await f.get(f.at(`lobbies/${code}/host`));
      if (snap.exists() && snap.val() !== f.uid) throw new Error('Diese Lobby gehört zu einem anderen Gerät');
      if (!state.match) newMatch();
      // Lobby wurde gelöscht (z. B. aufgeräumt) → mit demselben Code neu anlegen
      if (!snap.exists()) await f.set(f.at('lobbies/' + code), { host: f.uid, created: f.serverTimestamp(), act: f.serverTimestamp(), bingo: state.bingo, match: state.match });
      else if (state.match) await f.set(f.at(`lobbies/${code}/match`), state.match);
      let first = true;
      this.unsub = f.onValue(f.at(`lobbies/${code}/players`), s => {
        const prev = this.players;
        this.players = s.val() || {};
        if (!first && Object.entries(this.players).some(([id, p]) => p.bingo && !prev[id]?.bingo && id !== this.uid)) this.onBingo();
        first = false;
        renderLobby();
        if ($('#sheetGame').open && $('#sheetGame').dataset.page === 'check') renderCheckWho();
        if (round?.phase === 'revealed') renderGuessList();   // Tipps der Mitspieler
        if ($('#sheetGame').open && $('#sheetGame').dataset.page === 'mycard') syncMyCard();
      }, e => toast('Lobby: ' + e.message, 6000));
      this.syncRound();
      // Spielleiter ist da, solange die App offen ist (ein früher geschlossener Mitspieler-Tab kann ihn auf „offline“ gesetzt haben)
      if ((await f.get(f.at(`lobbies/${code}/players/${f.uid}/name`))).exists()) this.write(`players/${f.uid}/on`, true);
    } catch (e) {
      toast('Lobby nicht verfügbar: ' + e.message, 8000);
      if (/anderen Gerät/.test(e.message)) { state.lobby = null; LS.del('lobby'); this.code = null; }
    }
    renderLobby();
  },
  stop() { this.unsub?.(); this.unsub = null; this.players = {}; this.code = null; },
  // Lebenszeichen: Lobbys ohne Aktivität seit 24 h darf jeder löschen (siehe database.rules.json)
  touch() {
    const code = this.code; if (!code) return;
    firebase().then(f => f.set(f.at(`lobbies/${code}/act`), f.serverTimestamp())).catch(() => {});
  },
  write(path, val) {
    const code = this.code; if (!code) return;
    firebase().then(f => f.set(f.at(`lobbies/${code}/${path}`), val)).catch(e => toast('Sync-Fehler: ' + e.message));
  },
  // Alle Markierungen und Bingo-Rufe zurücksetzen (neues Spiel oder neue Karten)
  clearMarks() {
    const code = this.code; if (!code) return;
    const upd = {};
    for (const id of Object.keys(this.players)) Object.assign(upd, { [`${id}/marks`]: null, [`${id}/bingo`]: null, [`${id}/ok`]: null, [`${id}/lm`]: null });
    if (Object.keys(upd).length) firebase().then(f => f.update(f.at(`lobbies/${code}/players`), upd)).catch(() => {});
  },
  setBingo(b) { this.write('bingo', b); this.clearMarks(); if (this.me()) this.write(`players/${this.uid}/g`, b.g); },
  // Aktuelle Runde an die Handys: Kategorie während des Songs, nach der Auflösung auch die Lösung
  syncRound() {
    if (!this.code) return;
    // Neue Runde → Tipp des Spielleiters leeren; bei „Rückgängig“ den Tipp dieser Runde zurückholen
    if (round && this.me() && round.id !== this.lastId) {
      const mine = this.me().guess;
      if (this.lastId && round.id > this.lastId) { $('#myGuessText').value = ''; LS.set('guess', ''); }
      else if (mine?.t && mine.n === round.id) { $('#myGuessText').value = mine.t; LS.set('guess', mine.t); }
      this.lastId = round.id;
    }
    if (!round) return this.write('round', null);
    const [e, c] = catStyle(round.cat), rev = round.phase === 'revealed', t = round.track;
    // ph: p = läuft, c = Countdown (end = Zeitpunkt in ms), r = aufgelöst
    const cd = round.phase === 'countdown' && round.end;
    this.write('round', { n: round.n, id: round.id, i: round.cat.id, q: round.cat.name, e, c, ph: rev ? 'r' : cd ? 'c' : 'p', ...(cd ? { end: round.end } : {}),
      ...(rev ? { a: plainText(answerFor(round.cat, t)), s: `${t.artists} – ${t.title}`, ...(yearOf(t) ? { y: yearOf(t) } : {}), ...(t.cover ? { cv: t.cover } : {}) } : {}) });
    this.touch();
  },
  close() {
    const code = this.code || state.lobby; this.stop();   // auch wenn die Verbindung beim Start fehlschlug
    state.lobby = null; LS.del('lobby'); state.match = null; LS.del('match');
    if (code) firebase().then(f => f.remove(f.at('lobbies/' + code))).catch(() => {});
  },
  // Bingo bestätigen: Spieler bekommt die Bestätigung aufs Handy, der Sieg wird für die Lobby gezählt
  confirm(id) {
    const p = whoById(id);
    if (!p) return toast('Dieser Spieler ist nicht mehr in der Lobby');
    if (id !== HOST_ID) this.write(`players/${id}/ok`, true);
    // Auch nach dem Ende zählen: haben mehrere gleichzeitig in der letzten Partie Bingo, bekommt jeder seinen Sieg
    const m = state.match; if (!m) return;
    if (!m.won.includes(id)) {
      m.won.push(id); m.wins[id] = (m.wins[id] || 0) + 1; m.names[id] = p.name;
      const r = state.history.filter(h => h.n > (state.partieFrom || 0)).length;   // Runden bis zu diesem Bingo
      if (r && (!m.fast || r < m.fast.r)) m.fast = { id, name: p.name, r };
    }
    if (m.total && m.game >= m.total) m.over = true;
    saveMatch();
    if (m.over && !pendingCallers(id).length) showEndHost();
  },
  kick(id) { this.write(`players/${id}`, null); },
  // Spielleiter spielt mit: tritt mit eigener Karte der Lobby bei („⭐ Name“)
  joinHost(num) {
    const name = ('⭐ ' + (state.me?.name || 'Spielleiter')).slice(0, 24);
    this.write(`players/${this.uid}`, { name, num, on: true, g: state.bingo.g });
  },
  leaveHost() { if (this.uid && this.players[this.uid]) this.kick(this.uid); },
  me() { return this.code && this.uid ? this.players[this.uid] || null : null; },
  onBingo() {
    confetti(); beep(1046, .3);
    const callers = pendingCallers();
    if (!callers.length) return;
    toast(`🎉 BINGO von ${nameList(callers.map(c => c.name))}`, 12000, { label: 'Prüfen', fn: checkCallers });
  },
};
/* ---------------- Partien & Siege (nur mit Lobby) ---------------- */
// state.match = { total: Anzahl Partien (0 = endlos), game: aktuelle Partie, wins: { id: Siege }, names: { id: Name },
//                 won: [ids, die die aktuelle Partie gewonnen haben], over: Spiel vorbei }
function newMatch() {
  endShown = false;
  state.match = { total: state.settings.games ?? 0, game: 1, wins: {}, names: {}, won: [], over: false, rounds: 0, tips: {} };
  state.partieFrom = state.history[0]?.n || 0; LS.set('partieFrom', state.partieFrom);
  LS.set('match', state.match);
}
function saveMatch() {
  LS.set('match', state.match);
  if (Lobby.code) Lobby.write('match', state.match);
  renderMatch(); renderLobby();
}
// Nächste Partie: gleiche Karten, Markierungen weg (jeder darf seine Karte behalten oder neu wählen), Prüfung zählt nur neue Runden
function nextGame() {
  const m = state.match; if (!m || m.over || !state.bingo) return;
  m.game++; m.won = [];
  state.partieFrom = state.history[0]?.n || 0; LS.set('partieFrom', state.partieFrom);
  Lobby.clearMarks();
  myRepick = !!Lobby.me();   // auch der Spielleiter darf seine Karte behalten oder neu wählen
  saveMatch(); renderBingo(); renderMyCardBtn();
  $('#checkBox').innerHTML = '';
  toast(`Partie ${m.game}${m.total ? ' von ' + m.total : ''} – alle können ihre Karte behalten oder neu wählen 🎲`, 6000);
}
// Siegertabelle als Chips; lead = wer vorne liegt
function winsHtml(m) {
  const rows = Object.entries(m.wins || {}).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '<div class="group-f" style="text-align:center;margin:4px 0">Noch keine Siege</div>';
  const top = rows[0][1];
  return `<div class="match-tbl">${rows.map(([id, n]) => `<span class="${n === top ? 'lead' : ''}">🏆 ${esc(m.names?.[id] || '?')} ${n}</span>`).join('')}</div>`;
}
const matchTitle = m => m.over ? '🏁 Spiel vorbei' : `Partie ${m.game}${m.total ? ' von ' + m.total : ' · endlos'}`;
function matchWinner(m) {
  const rows = Object.entries(m.wins || {}).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '';
  const best = rows.filter(r => r[1] === rows[0][1]).map(r => m.names?.[r[0]] || '?');
  return best.length > 1 ? `Unentschieden: ${best.join(', ')}` : `🏆 ${best[0]} gewinnt!`;
}
function renderMatch() {
  const m = state.match, on = !!(Lobby.code && m && state.bingo);
  $('#matchMain').classList.toggle('hidden', !on);
  if (!on) return;
  const action = m.over
    ? `<div class="mc-h" style="margin-top:6px">${esc(matchWinner(m))}</div><button class="ghost" data-new-match style="margin-top:10px">Nochmal spielen (Siege auf 0)</button>`
    : m.won.length
      ? `<div class="small" style="margin:4px 0 8px">Gewonnen: ${m.won.map(id => esc(m.names[id] || '?')).join(', ')}</div><button class="big" data-next-game>Nächste Partie starten</button>`
      : '<div class="group-f" style="margin:4px 0 0;text-align:center">Ruft jemand Bingo, prüfst du es unter „Bingo prüfen“ – nach dem Bestätigen geht es mit der nächsten Partie weiter.</div>';
  $('#matchMain').innerHTML = `<div class="match-card"><div class="mc-h">${matchTitle(m)}</div>${winsHtml(m)}${action}</div>`;
}

function checkLobbyPlayer(id) {
  const p = Lobby.players[id]; if (!p) return;
  openSheet('sheetGame', 'check');
  checkPlayer = id; $('#checkNo').value = p.num;
  renderCheckWho(); checkCard();
}
const lobbyList = () => Object.entries(Lobby.players).filter(([, p]) => p?.name).map(([id, p]) => ({ id, ...p }))
  .sort((a, b) => (!!b.bingo - !!a.bingo) || (b.marks?.length || 0) - (a.marks?.length || 0) || String(a.name).localeCompare(b.name));
const marksOf = p => p.g === state.bingo?.g ? (p.marks || []).length : 0;
function renderLobby() {
  const list = lobbyList(), b = state.bingo, code = Lobby.code;
  $('#lobbyHeroK').textContent = code ? 'Lobby-Code' : 'Bingo ohne Lobby';
  $('#lobbyCode').classList.toggle('hidden', !code);
  $('#lobbyCode').textContent = code || '';
  $('#playerHead').textContent = code ? `Mitspieler (${list.length})` : 'Mitspieler';
  $('#playerHead').classList.toggle('hidden', !code);
  $('#playerList').classList.toggle('hidden', !code);
  $('#playerList').innerHTML = list.map(p => `
    <button class="cell tap pl-row ${p.bingo ? 'won' : ''}" data-lobby-check="${esc(p.id)}" style="${p.on === false && p.id !== Lobby.uid ? 'opacity:.5' : ''}">
      <span class="rank">${p.bingo ? (p.ok ? '✅' : '🎉') : p.on === false && p.id !== Lobby.uid ? '💤' : '·'}</span>
      <span class="grow">${esc(p.name)}${state.match?.wins?.[p.id] ? ` · 🏆 ${state.match?.wins?.[p.id]}` : ''}<span class="sub">Karte Nr. ${esc(p.num)}${p.bingo ? (p.ok ? ' · Bingo bestätigt' : ' · ruft BINGO!') : ''}</span></span>
      <span class="marks">${marksOf(p)} / ${b ? b.s * b.s : '–'}</span>
      <span class="icon-btn del" data-player-del="${esc(p.id)}" role="button" aria-label="Entfernen">${ic('trash')}</span>
    </button>`).join('')
    || `<div class="cell muted">${code ? 'Noch niemand beigetreten.' : 'Noch keine Lobby.'}</div>`;
  $('#playerNote').textContent = !hasFirebase()
    ? 'Für Lobbys mit Live-Sync muss im Code noch das Firebase-Projekt eingetragen werden (FIREBASE_CONFIG). Bis dahin funktionieren die Karten wie bisher über den QR-Code.'
    : code ? 'Antippen, um die Karte eines Mitspielers zu prüfen. Markierungen und „Bingo!“ kommen hier live an.'
    : b ? 'Diese Bingo-Runde läuft ohne Lobby – die Karten kommen über den QR-Code, ohne Live-Sync.'
    : 'Erstelle Bingo-Karten – mit Lobby treten alle per QR-Code oder Code bei und alles läuft live.';
  $('#bingoSub').textContent = b ? `${b.s} × ${b.s} Karten · ${b.k.length} Kategorien${code ? ' · antippen zum Einladen' : ''}` : '';
  renderScorebar(); renderMatch();
}
// Leiste auf dem Hauptbildschirm: Mitspieler mit Siegen und ✓, wer für diese Runde fertig getippt hat
function renderScorebar() {
  const list = lobbyList(), code = Lobby.code, bar = $('#scorebar');
  bar.classList.toggle('hidden', !code || !list.length);
  const done = p => round && p.guess?.n === round.id && p.guess.t;
  bar.innerHTML = code ? list.map(p => {
    const wins = state.match?.wins?.[p.id];
    return `<span class="sc ${p.bingo ? 'won' : ''} ${p.on === false && p.id !== Lobby.uid ? 'off' : ''}">${p.bingo ? '🎉' : ''} ${esc(p.name)}${wins ? ` 🏆${wins}` : ''}${done(p) ? ' <b>✓</b>' : ''}</span>`;
  }).join('') : '';
}
