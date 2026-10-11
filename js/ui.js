// Musik-Bingo – Oberfläche: Anzeigen, Klicks/Tasten, Einstellungen, Start
'use strict';

/* ---------------- Rendering ---------------- */
function render() {
  const ph = round?.phase || 'idle';
  $('#roundNo').textContent = round ? tx('Runde {n}', { n: round.n }) : tx('Runde –');
  const left = state.tracks.filter(t => !state.played.includes(t.id)).length;
  // Hat ein Mitspieler gebuzzert, steht sein Name statt „Songs übrig“ oben (bis zur nächsten Runde)
  $('#buzzBy').textContent = round?.bz ? '🔔 ' + round.bz : '';
  $('#buzzBy').classList.toggle('hidden', !round?.bz);
  $('#remaining').classList.toggle('hidden', !!round?.bz);
  $('#remaining').textContent = state.tracks.length ? tx('{a} / {b} Songs übrig', { a: left, b: state.tracks.length }) : tx('Keine Songs');
  $('#catLabel').textContent = round ? tx('Kategorie dieser Runde') : 'Musik-Bingo';
  $('#cat').classList.toggle('idle', !round);
  if (!spinning) {
    if (round) showCat(round.cat);
    else {
      $('#catIcon').innerHTML = '<img src="icon-192.png?v=5" alt="">';
      document.documentElement.style.setProperty('--cat', '#ffa03c');
      $('#catName').textContent = !state.tracks.length ? tx('Füge eine Playlist hinzu')
        : state.history.length ? tx(state.history.length === 1 ? '{n} Runde gespielt' : '{n} Runden gespielt', { n: state.history.length }) : tx('Alles bereit – los geht’s!').replace(/ (\S+)$/, '\u00a0$1');   // letztes Wort nicht allein umbrechen
    }
  }
  // Bei der Auflösung dreht sich die Platte um und zeigt das Cover
  const dw = $('#discWrap');
  dw.classList.toggle('flipped', ph === 'revealed');
  $('.stage').classList.toggle('revealed', ph === 'revealed');
  dw.classList.toggle('idle', !round);
  dw.classList.toggle('counting', ph === 'countdown');
  if (ph !== 'countdown') { dw.classList.remove('urgent'); $('#timerNum').textContent = ph === 'playing' ? '?' : ''; }
  $('#reveal').classList.toggle('hidden', ph !== 'revealed');
  if (ph === 'revealed') renderReveal();

  renderHints();
  // Unten: ein Hauptknopf (plus „Auflösen“ ohne Countdown). Musik-Steuerung = auf die Platte tippen.
  const c = {
    idle: !state.tracks.length
      ? `<button class="big" data-act="lib">${ic('plus')} ${tx('Playlist hinzufügen')}</button>`
      : state.history.length
        ? `<button class="ghost" data-act="newgame">${ic('restart')}<span>${tx('Neu')}</span></button><button class="big" data-act="next">${ic('play')} ${tx('Weiterspielen')}</button>`
        : `<button class="big" data-act="start">${ic('play')} ${tx('Spiel starten')}</button>`,
    playing: `<button class="ghost" data-act="reveal">${ic('eye')}<span>${tx('Auflösen')}</span></button>
              <button class="big" data-act="countdown">${ic('timer')} Countdown · ${state.settings.seconds} s</button>`,
    countdown: `<button class="big pink" data-act="reveal">${ic('eye')} ${tx('Jetzt auflösen')}</button>`,
    revealed: `<button class="big" data-act="next">${ic('skip')} ${tx('Nächster Song')}</button>`,
  }[ph];
  $('#controls').innerHTML = c;
  // Unter der Platte: kleine, beschriftete Zusatzknöpfe passend zur Phase
  const acts = [];
  if (round && ph !== 'revealed') {
    if (state.settings.hints) {
      const left = hintsFor(round.cat, round.track).length - (round.hints || 0);
      acts.push(`<button class="pill-btn" data-act="hint" ${left > 0 ? '' : 'disabled'}>${ic('bulb')}${tx('Tipp')}${left > 0 ? ` · ${left}` : ''}</button>`);
    }
    acts.push(`<button class="pill-btn" data-act="next">${ic('skip')}${tx('Überspringen')}</button>`);
  }
  if (ph === 'revealed') acts.push(`<button class="pill-btn" data-act="fixYear">${ic('pen')}${tx('Jahr korrigieren')}</button>`);
  $('#actionRow').innerHTML = acts.join('');
  renderPlayState(); renderScorebar();
  updHostMark();   // eigene Karte: Felder hervorheben, die man gerade markieren darf
}
function renderPlayState() {
  const dw = $('#discWrap');
  dw.classList.toggle('playing', Player.playing && !!round);
  // Symbol auf der Platte: Play wenn pausiert, „nochmal“ wenn der Ausschnitt vorbei ist
  const replay = !!(round?.snippetDone && round.phase !== 'revealed');
  const paused = !!round && (!Player.playing || replay);   // immer true/false – toggle() mit undefined würde umschalten
  // Auf dem Cover (nach der Auflösung) das Pause-Symbol nur kurz zeigen, damit das Cover sichtbar bleibt
  if (paused && !dw.classList.contains('paused') && round.phase === 'revealed') {
    dw.classList.add('peek'); clearTimeout(peekT); peekT = setTimeout(() => dw.classList.remove('peek'), 1400);
  }
  dw.classList.toggle('paused', paused);
  dw.classList.toggle('tappable', !!round || state.tracks.length > 0);
  $('#discState').innerHTML = round ? ic(replay ? 'restart' : Player.playing ? 'pause' : 'play') : '';
}
let peekT;
// Platte antippen: Musik pausieren/fortsetzen bzw. Ausschnitt nochmal spielen
function discTap() {
  // Keine Runde aktiv (z. B. nach dem Neuladen): weiterspielen – nur ganz am Anfang ein frisches Spiel
  if (!round) { if (state.tracks.length) { if (!state.history.length) startGame(); else nextRound(); } return; }
  // Ausschnitt vorbei oder noch nie erfolgreich gestartet (z. B. Spotify schlief) → neu abspielen
  if ((round.snippetDone && round.phase !== 'revealed') || !Player.mode) playSnippet();
  else Player.toggle();
  const dw = $('#discWrap');
  dw.classList.remove('tapped'); void dw.offsetWidth; dw.classList.add('tapped');
  try { navigator.vibrate?.(10); } catch {}
}
// Tipps, die Mitspieler in der Lobby für diese Runde (round.id) abgegeben haben
const guessesFor = id => lobbyList().filter(p => p.guess?.n === id && p.guess.t);

function renderGuessList() {
  const el = $('#guessHost'); if (!el || !round) return;
  const list = Lobby.code ? lobbyList() : [], got = guessesFor(round.id);
  el.classList.toggle('hidden', !list.length);
  el.innerHTML = `<div class="gl-h">${tx('Tipps der Mitspieler · {a} / {b}', { a: got.length, b: list.length })}</div>` +
    (got.map(p => `<div><b>${esc(p.name)}:</b> ${esc(p.guess.t)}</div>`).join('') || `<div class="muted">${tx('Niemand hat getippt')}</div>`);
}
function renderReveal() {
  const t = round.track, y = yearOf(t), cat = round.cat;
  const fixed = state.yearFix[t.id] != null;
  const fromMb = !fixed && mbYear(t) && t.year && mbYear(t) !== t.year;
  // Das Cover steht groß auf der Rückseite der Platte – hier nur Antwort und Song-Infos
  $('#discCover').innerHTML = t.cover ? `<img src="${esc(t.cover)}" alt="">` : '<span>♪</span>';
  $('#reveal').innerHTML = `
    <div class="rv-answer">
      <div class="rv-q">${esc(tx(cat.name))}</div>
      <div class="rv-a">${answerFor(cat, t)}</div>
    </div>
    <div class="rv-song">
      <div class="rv-title">${esc(t.title)}</div>
      <div class="rv-artist">${esc(t.artists)} <span class="rv-year">· ${y ?? '?'}</span></div>
      <div class="rv-meta">${[t.album, t.date].filter(Boolean).map(esc).join(' · ')}</div>
      ${fixed ? `<div class="rv-meta">${tx('Jahr von dir korrigiert.')}</div>` : ''}
      ${fromMb ? `<div class="rv-meta">${tx('Spotify nennt {y} (Album/Remaster) – Originaljahr laut MusicBrainz.', { y: t.year })}</div>` : ''}
    </div>
    <div id="guessHost" class="guess-list hidden"></div>`;
  renderGuessList();
  loadCover(t);
}
function renderHist() {
  const byId = new Map(state.tracks.map(t => [t.id, t]));
  $('#hist').innerHTML = state.history.map(h => {
    const cover = byId.get(h.id)?.cover;
    return `<li><b>#${h.n}</b>${cover ? `<img src="${esc(cover)}" alt="" loading="lazy">` : '<span class="ph"></span>'}
      <span><span class="muted small">${esc(tx(h.cat))}</span><br>${esc(h.artists)} – ${esc(h.title)} <span class="muted">(${h.year ?? '?'})</span></span></li>`;
  }).join('') || `<li class="muted">${tx('Noch keine Runden gespielt')}</li>`;
}
function renderStatus() {
  $('#accSub').textContent = state.tok ? (state.me?.name ? tx('Verbunden als {n}', { n: state.me.name }) : tx('Verbunden')) : tx('Nicht verbunden – hier einrichten');
  const s = state.settings;
  $('#modeInfo').textContent =
    Player.mode === 'sdk' ? tx('Spielt gerade direkt in diesem Browser.')
    : Player.mode === 'connect' ? tx('Spielt über Spotify auf „{d}“. Achtung: Die Spotify-App zeigt den Titel an.', { d: Player.connectDev?.name || tx('deinem Gerät') })
    : Player.mode === 'embed' ? tx('Spielt nur kurze Vorschau-Ausschnitte. Für ganze Songs „Spotify-App / Box“ wählen.')
    : s.mode === 'connect' ? tx('Spotify-App öffnen, kurz etwas abspielen, dann das Gerät hier auswählen. Ganze Songs, braucht Premium.')
    : s.mode === 'sdk' ? tx('Spielt im Browser – klappt am PC in Chrome/Edge mit Premium, nicht am iPhone oder iPad.')
    : s.mode === 'embed' ? tx('Nur 30-Sekunden-Vorschau, funktioniert ohne Premium.')
    : tx('Am PC spielt der Browser selbst, am iPhone und iPad wird automatisch die Spotify-App (oder eine Box) gesteuert.');
  renderVolume();
}
function renderVolume() {
  const v = state.settings.volume;
  const off = Player.mode === 'embed' || (Player.mode === 'connect' && Player.connectDev && !Player.connectDev.supports_volume);
  const r = $('#vol'); r.value = v; fillRange(r); $('#volVal').textContent = v;
  $('#volMute').innerHTML = ic(v === 0 ? 'mute' : 'vol');
  $('#volBox').classList.toggle('off', off);
  r.disabled = off; $('#volMute').disabled = off;
  $('#volBox').title = off ? tx('Lautstärke lässt sich hier nicht steuern – bitte die Lautstärke am Gerät nutzen.') : '';
}
let lastVol = 80;
function setVolume(v) {
  v = Math.max(0, Math.min(100, Math.round(v)));
  if (v > 0) lastVol = v;
  state.settings.volume = v; LS.set('settings', state.settings);
  Player.setVolume(v); renderVolume();
}
const plCover = (url, fallback = '♪') => url ? `<img class="pl-cover" src="${esc(url)}" alt="" loading="lazy">` : `<span class="pl-cover">${fallback}</span>`;
function renderLib() {
  const n = state.tracks.length;
  const years = state.tracks.map(yearOf).filter(Boolean);
  $('#libCount').textContent = n;
  $('#libSub').textContent = n
    ? tx('Songs im Spiel · {n} gespielt', { n: state.played.length }) + (years.length ? ` · ${Math.min(...years)}–${Math.max(...years)}` : '')
    : tx('Noch keine Songs – füge eine Playlist hinzu');
  const counts = new Map(); let legacy = 0;
  for (const t of state.tracks) {
    if (!t.srcs?.length) legacy++;
    else for (const s of t.srcs) counts.set(s, (counts.get(s) || 0) + 1);
  }
  const rows = state.sources.filter(s => counts.get(s.id)).map(s => `
    <div class="cell">${plCover(s.cover)}<span class="grow">${esc(s.name)}<span class="sub">${tx('{n} Songs', { n: counts.get(s.id) })}</span></span>
      <button class="icon-btn del" data-src-del="${esc(s.id)}" aria-label="${tx('Entfernen')}">${ic('trash')}</button></div>`);
  if (legacy) rows.push(`<div class="cell">${plCover('', '♫')}<span class="grow">${tx('Frühere Importe')}<span class="sub">${tx('{n} Songs', { n: legacy })}</span></span>
      <button class="icon-btn del" data-src-del="_legacy" aria-label="${tx('Entfernen')}">${ic('trash')}</button></div>`);
  $('#srcList').innerHTML = rows.join('') || `<div class="cell muted">${tx('Noch keine Playlists im Spiel')}</div>`;
}
function renderAdd() {
  $('#addNeedLogin').classList.toggle('hidden', !!state.tok);
  $('#myPlBox').classList.toggle('hidden', !state.tok);
}
function renderMyPlaylists() {
  const el = $('#myPl');
  if (!state.tok) { el.innerHTML = ''; return; }
  if (myPlLoading && !myPlaylists) { el.innerHTML = `<div class="cell muted"><span class="loader"></span>${tx('Lade deine Playlists …')}</div>`; return; }
  if (!myPlaylists?.length) { el.innerHTML = `<div class="cell muted">${tx('Keine Playlists gefunden')}</div>`; return; }
  const have = new Set(state.sources.map(s => s.id));
  el.innerHTML = myPlaylists.map(p => {
    const trail = loadingPl.has(p.id) ? '<span class="loader"></span>' : have.has(p.id) ? ic('check') : ic('plus');
    return `<button class="cell tap" data-add-pl="${esc(p.id)}">${plCover(p.cover)}
      <span class="grow">${esc(p.name)}<span class="sub">${p.total != null ? tx('{n} Songs', { n: p.total }) : ''}${have.has(p.id) ? tx(' · im Spiel – tippen zum Aktualisieren') : ''}</span></span>
      <span class="trail ${have.has(p.id) ? 'ok' : ''}">${trail}</span></button>`;
  }).join('');
}
function renderSettings() {
  const s = state.settings;
  const r = $('#setSec'); r.value = s.seconds; fillRange(r); $('#secVal').textContent = s.seconds + ' s';
  $('#setStart').value = s.start; $('#setMode').value = s.mode;
  $('#setBeep').checked = s.beep; $('#setBuzzSound').checked = s.buzzSound !== false; $('#setAuto').checked = s.autoReveal; $('#setPause').checked = s.pauseOnReveal;
  $('#setLimit').value = String(s.limit || 0); $('#setHints').checked = s.hints; $('#setMb').checked = s.mb;
  renderThemes();
  $('#appVersion').textContent = `Musik-Bingo · Version ${APP_VERSION} · ${APP_DATE}`;
  const showDev = s.mode === 'connect' || Player.mode === 'connect';
  $('#devRow').classList.toggle('hidden', !showDev);
  if (showDev) renderDevices();
  const on = state.cats.filter(c => c.enabled).length;
  $('#catSub').textContent = tx('{a} von {b} aktiv', { a: on, b: state.cats.length });
  renderLang();
  renderStatus();
}
function renderCats() {
  $('#catBingoNote').classList.toggle('hidden', !state.bingo);
  $('#catList').innerHTML = state.cats.map((c, i) => `
    <label class="cell">
      <span class="cell-ic" style="background:${catStyle(c)[1]}">${catStyle(c)[0]}</span>
      <span class="grow">${esc(tx(c.name))}<span class="sub">${tx('Auflösung: {a}', { a: tx(ANSWER_TYPES[c.answer]) })}${c.answer === 'range' ? tx(' (± {n} Jahre)', { n: c.tol }) : ''}</span></span>
      ${c.builtin ? '' : `<button class="icon-btn del" data-cat-del="${i}" aria-label="${tx('Löschen')}">${ic('trash')}</button>`}
      <span class="switch"><input type="checkbox" data-cat-toggle="${i}" ${c.enabled ? 'checked' : ''}><span></span></span>
    </label>`).join('');
}
function renderAccount() {
  const inn = !!state.tok;
  $('#accIn').classList.toggle('hidden', !inn);
  $('#accOut').classList.toggle('hidden', inn);
  document.querySelectorAll('.redir').forEach(el => el.textContent = REDIRECT.startsWith('http') ? REDIRECT : 'http://127.0.0.1:8888/');
  const own = state.clientId !== DEFAULT_CLIENT_ID;
  $('#clientId').value = own ? state.clientId : '';
  $('#cidShort').textContent = own ? tx('Eigene App: {id}…', { id: state.clientId.slice(0, 8) }) : tx('Musik-Bingo (Standard)');
  if (inn) {
    const me = state.me;
    $('#meName').textContent = me?.name || tx('Spotify-Konto');
    $('#meAvatar').innerHTML = me?.img ? `<img class="avatar" src="${esc(me.img)}" alt="">` : esc((me?.name || '?').slice(0, 1).toUpperCase());
    const prem = me?.product === 'premium';
    $('#meProd').textContent = !me ? tx('Verbunden') : prem ? '✓ Spotify Premium' : tx('Spotify Free – ganze Songs brauchen Premium');
    $('#meProd').classList.toggle('free', !!me && !prem);
  }
}
const DEV_ICON = { Smartphone: '📱', Computer: '💻', Speaker: '🔊', TV: '📺', Tablet: '📱', CastAudio: '🔊', CastVideo: '📺', AVR: '🔊', GameConsole: '🎮' };
async function renderDevices() {
  const sel = $('#setDevice');
  if (!state.tok) { sel.innerHTML = `<option value="">${tx('Erst verbinden')}</option>`; return; }
  sel.innerHTML = `<option value="">${tx('Suche …')}</option>`;
  try {
    const devs = await getDevices();
    if (!devs.length) {
      sel.innerHTML = `<option value="">${tx('Keins gefunden')}</option>`;
      $('#modeInfo').textContent = tx('Kein Spotify-Gerät gefunden: Öffne die Spotify-App (oder schalte die Box ein), spiel kurz etwas ab und tippe dann auf ↻.');
      return;
    }
    sel.innerHTML = devs.map(d => `<option value="${esc(d.id)}">${DEV_ICON[d.type] || '🎧'} ${esc(d.name)}</option>`).join('');
    const cur = devs.find(d => d.id === state.settings.device) || devs.find(d => d.is_active) || devs[0];
    sel.value = cur.id;
  } catch (e) { sel.innerHTML = `<option value="">${tx('Fehler')}</option>`; toast(e.message); }
}
function renderAll() { render(); renderHist(); renderStatus(); renderLib(); renderVolume(); renderLobby(); renderMyCardBtn(); }

/* ---------------- Events ---------------- */
const saveSettings = () => { LS.set('settings', state.settings); render(); };
const saveCats = () => { LS.set('cats', state.cats); renderCats(); renderSettings(); };

document.addEventListener('click', async e => {
  const t = e.target;
  const a = t.closest('[data-act]')?.dataset.act;
  if (t.closest('#discWrap')) discTap();
  if (a === 'newgame') askNewGame();
  else if (a === 'start') startGame();
  else if (a === 'next') nextRound();
  else if (a === 'countdown') startCountdown();
  else if (a === 'reveal') reveal();
  else if (a === 'hint') giveHint();
  else if (a === 'lib') needSongs();
  else if (a === 'fixYear') fixYear();

  const go = t.closest('[data-go]');
  if (go) goPage(go.closest('dialog'), go.dataset.go);
  if (t.closest('[data-back]')) goPage(t.closest('dialog'), 'main', true);
  if (t.closest('[data-close]')) t.closest('dialog').close();
  const open = t.closest('[data-open]');
  if (open) { const [id, page] = open.dataset.open.split(':'); openSheet(id, page); }

  const bc = t.closest('[data-bcat]');
  if (bc) { const c = state.cats[+bc.dataset.bcat]; if (c) { c.enabled = !c.enabled; saveCats(); renderBingo(); } }
  const cw = t.closest('[data-check-who]');
  if (cw) {
    checkPlayer = cw.dataset.checkWho === checkPlayer ? null : cw.dataset.checkWho || null;
    document.querySelectorAll('[data-check-who]').forEach(x => x.classList.toggle('on', (x.dataset.checkWho || null) === checkPlayer));
    if (checkPlayer) $('#checkNo').value = whoById(checkPlayer)?.num ?? '';
    if ($('#checkNo').value) checkCard();
  }
  const force = t.closest('[data-confirm-force]');
  if (force) {
    const who = whoById(force.dataset.confirmForce);
    const why = force.closest('.check-block')?.querySelector('.check-res')?.textContent || '';
    if (who && await ask(tx('Bingo für {n} wirklich bestätigen?\n\nDie Prüfung meldet: {w}\n\nDer Sieg wird trotzdem gezählt.', { n: who.name, w: why }), { ok: tx('Bestätigen'), danger: true })) {
      force.dataset.confirm = force.dataset.confirmForce;
      delete force.dataset.confirmForce;
    } else return;
  }
  const conf = force || t.closest('[data-confirm]');
  if (conf) {
    Lobby.confirm(conf.dataset.confirm);
    const m = state.match;
    const open = pendingCallers(conf.dataset.confirm).length;
    conf.outerHTML = `<span class="chip-btn on">${tx('✓ Bingo bestätigt')}</span>` +
      (!m || !Lobby.code ? '' : open ? `<div class="small" style="width:100%;text-align:center;margin-top:8px">${tx(open === 1 ? 'Noch 1 weiterer Bingo-Ruf offen' : 'Noch {n} weitere Bingo-Rufe offen', { n: open })}</div>`
        : m.over ? `<div class="mc-h" style="width:100%;text-align:center;margin-top:8px">${esc(matchWinner(m))}</div>` : `<button class="big" data-next-game style="width:100%;margin-top:8px">${tx('Nächste Partie starten')}</button>`);
  }
  if (t.closest('[data-next-game]')) { nextGame(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); }
  if (t.closest('[data-end-close]')) $('#endScreen').classList.add('hidden');
  if (t.closest('[data-end-stop]')) { $('#endScreen').classList.add('hidden'); $('#btnBingoOff').click(); }
  if (t.closest('[data-end-leave]')) { if (leaveLobby) leaveLobby(); else location.replace(location.pathname + '?join'); }
  if (t.closest('[data-new-match]') && await ask(tx('Nochmal spielen?\nAlle Siege werden auf 0 gesetzt, es geht mit Partie 1 los. Jeder kann seine Karte behalten oder eine neue wählen.'), { ok: tx('Nochmal spielen') })) {
    newMatch(state.match?.total); state.match.game = 0; state.match.over = false; nextGame();
    $('#endScreen').classList.add('hidden'); document.querySelectorAll('dialog[open]').forEach(d => d.close());
  }
  const gs = t.closest('[data-goto-set]');
  if (gs) {   // Regeln & Karten → passende Zeile in den Einstellungen, kurz hervorgehoben
    openSheet('sheetSettings');
    const row = $('#' + gs.dataset.gotoSet);
    setTimeout(() => { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); }, 350);
  }
  if (t.closest('[data-host-join]')) {   // Spielleiter steigt nachträglich ein → gleich zur Kartenwahl
    state.settings.hostPlays = true; LS.set('settings', state.settings);
    renderMyCardBtn(); renderBingo(); goPage($('#sheetGame'), 'mycard');
  }
  const pDel = t.closest('[data-player-del]');
  if (pDel) {
    const id = pDel.dataset.playerDel, p = Lobby.players[id];
    if (p && await ask(tx('„{n}“ aus der Lobby entfernen?', { n: p.name }), { ok: tx('Entfernen'), danger: true })) Lobby.kick(id);
  } else {
    const lc = t.closest('[data-lobby-check]');
    if (lc) checkLobbyPlayer(lc.dataset.lobbyCheck);
  }

  const addPl = t.closest('[data-add-pl]');
  if (addPl) loadPlaylist(addPl.dataset.addPl);
  const srcDel = t.closest('[data-src-del]');
  if (srcDel) {
    const id = srcDel.dataset.srcDel;
    const name = id === '_legacy' ? tx('Frühere Importe') : state.sources.find(s => s.id === id)?.name || 'Playlist';
    if (await ask(tx('„{n}“ aus dem Spiel entfernen?', { n: name }), { ok: tx('Entfernen'), danger: true })) removeSource(id);
  }
  const catDel = t.closest('[data-cat-del]');
  if (catDel) {
    e.preventDefault();
    const i = +catDel.dataset.catDel;
    if (await ask(tx('Kategorie „{n}“ löschen?', { n: state.cats[i].name }), { ok: tx('Löschen'), danger: true })) { state.cats.splice(i, 1); saveCats(); }
  }
});
// Mitspieler-Leiste: bei vielen Namen zur Seite scrollbar – auf dem Handy wischen, am PC mit Mausrad oder Ziehen.
// Ein weicher Rand links/rechts zeigt, dass dort noch Namen kommen.
(() => {
  const bar = $('#scorebar');
  let drag = null, moved = false;
  const edges = () => {
    const max = bar.scrollWidth - bar.clientWidth;
    bar.classList.toggle('fade-l', max > 2 && bar.scrollLeft > 2);
    bar.classList.toggle('fade-r', max > 2 && bar.scrollLeft < max - 2);
  };
  bar.addEventListener('scroll', edges, { passive: true });
  new ResizeObserver(edges).observe(bar);
  new MutationObserver(edges).observe(bar, { childList: true });
  bar.addEventListener('wheel', e => {
    if (bar.scrollWidth <= bar.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault(); bar.scrollLeft += e.deltaY;
  }, { passive: false });
  bar.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || bar.scrollWidth <= bar.clientWidth) return;
    drag = { x: e.clientX, l: bar.scrollLeft }; moved = false;
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.x) > 5) moved = true;
    if (moved) bar.scrollLeft = drag.l - (e.clientX - drag.x);
  });
  // „moved“ nur für den Klick direkt nach dem Ziehen – endet das Ziehen außerhalb der Leiste, sonst bliebe der nächste Klick hängen
  addEventListener('pointerup', () => { if (drag) setTimeout(() => { moved = false; }, 0); drag = null; });
  // Nach dem Ziehen keinen Namen „anklicken“
  bar.addEventListener('click', e => { if (moved) { e.stopPropagation(); moved = false; } }, true);
})();
document.addEventListener('change', e => {
  const tg = e.target.closest('[data-cat-toggle]');
  if (tg) { state.cats[+tg.dataset.catToggle].enabled = tg.checked; saveCats(); }
});
document.addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]') || !$('#endScreen').classList.contains('hidden') || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
    e.preventDefault(); setVolume(state.settings.volume + (e.code === 'ArrowUp' ? 5 : -5)); return;
  }
  if (e.code === 'KeyP' && round) { e.preventDefault(); discTap(); return; }
  if (e.code !== 'Space' || e.target.tagName === 'BUTTON') return;
  e.preventDefault();
  const ph = round?.phase || 'idle';
  if (ph === 'playing') startCountdown();
  else if (ph === 'countdown') reveal();
  else if (!round && !state.history.length) startGame();
  else nextRound();
});

$('#vol').oninput = e => setVolume(+e.target.value);
$('#volMute').onclick = () => setVolume(state.settings.volume > 0 ? 0 : lastVol);
$('#btnLib').onclick = () => openSheet('sheetLib', state.tok && !state.tracks.length ? 'add' : 'main');
$('#btnSettings').onclick = () => openSheet('sheetSettings');
$('#btnLogin').onclick = () => login(DEFAULT_CLIENT_ID);
const ownLogin = () => {
  const cid = $('#clientId').value.trim();
  if (!/^[0-9a-f]{32}$/i.test(cid)) return toast(tx('Eine Client ID hat 32 Zeichen (0–9, a–f)'));
  login(cid);
};
$('#btnOwnLogin').onclick = ownLogin;
$('#clientId').onkeydown = e => { if (e.key === 'Enter') ownLogin(); };
$('#btnRelogin').onclick = () => login(state.clientId);
$('#btnLogout').onclick = logout;
$('#btnEditCid').onclick = async () => {
  const own = state.clientId !== DEFAULT_CLIENT_ID;
  const v = await ask(tx('Client ID einer eigenen Spotify-App.\nLeer lassen für die Standard-App von Musik-Bingo.'), { input: own ? state.clientId : '', ok: tx('Speichern') });
  if (v == null) return;
  const cid = v.trim() || DEFAULT_CLIENT_ID;
  if (cid !== DEFAULT_CLIENT_ID && !/^[0-9a-f]{32}$/i.test(cid)) return toast(tx('Eine Client ID hat 32 Zeichen (0–9, a–f)'));
  if (cid === state.clientId) return;
  state.clientId = cid;
  if (cid === DEFAULT_CLIENT_ID) LS.del('clientId'); else LS.set('clientId', cid);
  renderAccount();
  if (await ask(tx('Client ID gespeichert.\nJetzt mit der neuen App neu verbinden?'), { ok: tx('Verbinden') })) login(state.clientId);
};
$('#btnLoadPl').onclick = addFromLink;
$('#plUrl').onkeydown = e => { if (e.key === 'Enter') addFromLink(); };
$('#btnMyPlRefresh').onclick = () => loadMyPlaylists(true);
$('#csvFile').onchange = async e => { const f = e.target.files[0]; if (f) importCSV(await f.text(), f.name); e.target.value = ''; };
function resetGame() {
  $('#endScreen').classList.add('hidden');
  state.played = []; state.history = []; LS.set('played', []); LS.set('history', []); state.lastRev = null; LS.del('lastRev');
  state.partieFrom = 0; LS.set('partieFrom', 0);   // Verlauf beginnt neu → Bingo-Prüfung zählt wieder ab Runde 1
  round = null; stopTimer(); clearTimeout(snippetT); renderAll();
  Lobby.syncRound(); Lobby.clearMarks();
  if (state.match) { newMatch(state.match.total); saveMatch(); }
}
// „Spiel starten“: Ist noch kein Bingo eingerichtet, erst fragen – ohne Bingo einfach los, sonst zu „Bingo einrichten“
async function startGame() {
  if (needSongs()) return;   // ohne Songs zuerst Playlists – die Bingo-Frage kommt danach
  if (!state.bingo) {
    const c = await ask(tx('Ohne Bingo spielen?\nEs ist noch kein Bingo eingerichtet. Ihr könnt einfach so Songs raten oder zuerst Bingo-Karten für alle erstellen.'),
      { ok: tx('Ohne Bingo starten'), cancel: tx('Bingo einrichten'), choice: true });
    if (c === 'no') return openSheet('sheetGame', 'setup');
    if (c !== 'yes') return;   // Frage weggeklickt
  }
  resetGame(); nextRound();
}
async function askNewGame() {
  if (state.history.length && !await ask(tx('Neues Spiel starten?\nVerlauf und gespielte Songs werden zurückgesetzt.') + (state.bingo ? Lobby.code ? tx('\nDie Bingo-Karten bleiben gültig – die Markierungen in der Lobby werden gelöscht, Siege und Partien fangen wieder bei 0 an.') : tx('\nDie Bingo-Karten bleiben gültig – alle sollten ihre Markierungen löschen.') : ''), { ok: tx('Neues Spiel') })) return;
  resetGame(); Player.pause();
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  toast(tx('Neues Spiel – tipp auf „Spiel starten“ 🎉'));
}
$('#btnNewGame').onclick = askNewGame;
$('#btnGame').onclick = () => openSheet('sheetGame');
$('#btnBingoCreate').onclick = () => { createBingo(); if (state.bingo) goPage($('#sheetGame'), 'invite'); };
$('#bingoGamesSeg').onclick = e => {
  const b = e.target.closest('[data-games]'); if (!b) return;
  state.settings.games = +b.dataset.games; LS.set('settings', state.settings); renderBingo();
};
document.querySelectorAll('.set-host-plays').forEach(x => x.onchange = () => {
  state.settings.hostPlays = x.checked; LS.set('settings', state.settings);
  if (!x.checked) Lobby.leaveHost();
  renderBingo(); renderMyCardBtn(); renderCheckWho();
});
$('#bingoLobbySeg').onclick = e => {
  const b = e.target.closest('[data-lobby]'); if (!b) return;
  state.settings.lobby = b.dataset.lobby === '1'; LS.set('settings', state.settings); renderBingo();
};
$('#setJoker').onchange = e => { state.settings.joker = e.target.checked; LS.set('settings', state.settings); };
$('#setBuzz').onchange = e => { state.settings.buzz = e.target.checked; LS.set('settings', state.settings); };
$('#bingoSecSeg').onclick = e => {
  const b = e.target.closest('[data-sec]'); if (!b) return;
  state.settings.seconds = +b.dataset.sec; saveSettings(); renderBingo();
};
$('#bingoStartSeg').onclick = e => {
  const b = e.target.closest('[data-start]'); if (!b) return;
  state.settings.start = b.dataset.start; saveSettings(); renderBingo();
};
$('#bingoSizeSeg').onclick = e => {
  const b = e.target.closest('[data-size]'); if (!b) return;
  bingoSize = +b.dataset.size; renderBingo();
};
$('#btnBingoShare').onclick = copyBingoLink;
$('#btnCheck').onclick = checkCard;
$('#checkNo').onkeydown = e => { if (e.key === 'Enter') checkCard(); };
$('#btnBingoNew').onclick = async () => {
  if (!await ask(Lobby.code ? tx('Neue Karten erstellen?\nAlle in der Lobby bekommen automatisch eine neue Karte, die Markierungen werden gelöscht.')
    : tx('Neue Karten erstellen?\nDie alten Karten werden ungültig – alle müssen den neuen QR-Code scannen.'), { ok: tx('Neu erstellen'), danger: true })) return;
  bingoSize = state.bingo?.s || bingoSize; createBingo();
};
$('#btnBingoOff').onclick = async () => {
  if (!await ask(Lobby.code ? tx('Bingo beenden?\nDie Lobby wird geschlossen – alle Mitspieler kommen zurück zur Code-Eingabe.') : tx('Bingo beenden?'), { ok: tx('Beenden'), danger: true })) return;
  Lobby.close();
  state.bingo = null; LS.del('bingo'); renderBingo(); renderLobby(); renderMyCardBtn();
  goPage($('#sheetGame'), 'main', true);
};
$('#setLimit').onchange = e => { state.settings.limit = +e.target.value; saveSettings(); };
$('#setHints').onchange = e => { state.settings.hints = e.target.checked; saveSettings(); };
$('#setMb').onchange = e => { state.settings.mb = e.target.checked; saveSettings(); renderHist(); };
const THEMES = [['graphit', 'Graphit', '#3a4252', '#1f3a32'], ['ozean', 'Ozean', '#0b4f75', '#0d6e66'], ['wald', 'Wald', '#1d5a3a', '#4c5b1a'], ['abend', 'Abend', '#7a2e1c', '#7d1f4a'], ['lila', 'Lila', '#4a22a0', '#8a1458']];
function applyTheme() {
  const th = THEMES.find(x => x[0] === state.settings.theme) ? state.settings.theme : 'graphit';
  document.documentElement.dataset.theme = th;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
}
function renderThemes() {
  $('#themeRow').innerHTML = THEMES.map(([id, name, a, b]) => `<button class="theme-pick ${state.settings.theme === id ? 'on' : ''}" data-theme-pick="${id}"><i style="background:linear-gradient(135deg,${a},${b})"></i>${tx(name)}</button>`).join('');
}
$('#themeRow').onclick = e => {
  const b = e.target.closest('[data-theme-pick]'); if (!b) return;
  state.settings.theme = b.dataset.themePick; LS.set('settings', state.settings);
  applyTheme(); renderThemes();
};
applyTheme();
$('#btnClearLib').onclick = async () => {
  if (!await ask(tx('Alle Songs und Playlists aus dem Spiel entfernen?'), { ok: tx('Entfernen'), danger: true })) return;
  state.tracks = []; state.sources = []; state.played = []; saveLib();
  round = null; stopTimer(); Player.pause(); renderAll(); renderMyPlaylists(); Lobby.syncRound();
};

$('#setSec').oninput = e => { state.settings.seconds = +e.target.value; fillRange(e.target); $('#secVal').textContent = e.target.value + ' s'; saveSettings(); };
$('#setStart').onchange = e => { state.settings.start = e.target.value; saveSettings(); };
$('#setMode').onchange = async e => {
  const wasPlaying = Player.playing;
  state.settings.mode = e.target.value; saveSettings();
  await Player.reset(); renderSettings();
  // Läuft gerade ein Song, direkt mit der neuen Wiedergabe-Art weiterspielen
  if (round && round.phase !== 'revealed' && wasPlaying) playSnippet().then(renderSettings);
};
$('#setDevice').onchange = e => {
  if (!e.target.value) return;
  state.settings.device = e.target.value; saveSettings();
  Player.switchDevice(e.target.value).then(renderStatus);
};
$('#btnDevRefresh').onclick = e => { e.preventDefault(); renderDevices(); };
$('#setBeep').onchange = e => { state.settings.beep = e.target.checked; saveSettings(); };
$('#setBuzzSound').onchange = e => { state.settings.buzzSound = e.target.checked; saveSettings(); if (e.target.checked) buzzSound(); };   // zum Probehören
$('#setAuto').onchange = e => { state.settings.autoReveal = e.target.checked; saveSettings(); };
$('#setPause').onchange = e => { state.settings.pauseOnReveal = e.target.checked; saveSettings(); };

// Eigene Kategorie anlegen – aus den Einstellungen und beim Bingo-Einrichten (gleiche Felder, andere IDs)
function addCategory(nameEl, typeEl, tolEl) {
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); toast(tx('Bitte eine Frage eingeben')); return false; }
  const answer = typeEl.value;
  const cat = assignStyle({ id: 'c' + Date.now(), name, answer, enabled: true, builtin: false }, state.cats);
  if (answer === 'range') cat.tol = Math.max(1, parseInt(tolEl.value) || 5);
  state.cats.push(cat); nameEl.value = ''; nameEl.blur(); saveCats();
  toast(tx('Kategorie „{n}“ hinzugefügt', { n: cat.icon + ' ' + cat.name }));
  return true;
}
// Auswahl „Auflösung zeigt“ (Einstellungen und Bingo-Einrichten) – auch nach einem Sprachwechsel neu befüllen
function fillAnswerTypes() {
  for (const type of ['#newCatType', '#bcType']) {
    const v = $(type).value || 'none';
    $(type).innerHTML = Object.entries(ANSWER_TYPES).map(([k, t]) => `<option value="${k}">${tx(t)}</option>`).join('');
    $(type).value = v;
  }
}
fillAnswerTypes();
for (const [type, tolRow] of [['#newCatType', '#tolRow'], ['#bcType', '#bcTolRow']]) {
  $(type).onchange = e => $(tolRow).classList.toggle('hidden', e.target.value !== 'range');
}
$('#btnBcAdd').onclick = () => { if (addCategory($('#bcName'), $('#bcType'), $('#bcTol'))) renderBingo(); };
$('#bcName').onkeydown = e => { if (e.key === 'Enter') $('#btnBcAdd').click(); };
$('#btnAddCat').onclick = () => addCategory($('#newCatName'), $('#newCatType'), $('#newCatTol'));
$('#btnResetCats').onclick = async () => {
  if (!await ask(tx('Kategorien auf Standard zurücksetzen?\nEigene Kategorien werden gelöscht.'), { ok: tx('Zurücksetzen'), danger: true })) return;
  state.cats = structuredClone(DEFAULT_CATS); saveCats();
};

// Sprache: Auswahl in den Einstellungen (Seite wird neu geladen, damit alle Texte passen)
function renderLang() { $('#langSel').innerHTML = langOptions(); $('#langCodeS').textContent = LANG.toUpperCase(); }
$('#langSel').onchange = e => setLang(e.target.value);

/* ---------------- Start ---------------- */
(async () => {
  const q = new URLSearchParams(location.search);
  if (q.get('tv')) return tvMode(q.get('tv'));
  if (q.get('l')) return lobbyMode(q.get('l'));
  if (q.has('join')) return codeMode();
  const cardParam = q.get('b');
  if (cardParam) return cardMode(cardParam);
  // Spielleiter: Sprache wechseln ohne Neuladen – alles in der neuen Sprache neu zeichnen, die Runde läuft weiter
  self.liveLang = () => {
    renderAll(); renderSettings(); renderAccount(); renderCats(); renderMyPlaylists(); renderAdd(); fillAnswerTypes();
    if ($('#guessShow').open) $('#guessShow').close();
    document.querySelectorAll('dialog.sheet[open]').forEach(d => {
      const p = d.querySelector('.page.active');
      if (p) d.querySelector('.nav-title').textContent = p.dataset.title;
      onPage(d.id, d.dataset.page);
    });
    if (!$('#endScreen').classList.contains('hidden') && state.match?.over) showEndHost();
    if (round?.phase === 'countdown') $('#timerNum').textContent = Math.max(0, Math.ceil((round.end - Date.now()) / 1000));
  };
  Lobby.watch();
  if (location.protocol === 'file:') $('#fileWarn').classList.remove('hidden');
  let justLoggedIn = false;
  try { justLoggedIn = await handleCallback(); } catch (e) { toast(tx('Login-Fehler: {e}', { e: e.message }), 6000); }
  renderAll();
  if (state.tok && !state.me) loadMe();
  if (!state.tok) openSheet('sheetSettings', 'account');
  else if (!state.tracks.length || justLoggedIn && !state.tracks.length) openSheet('sheetLib', 'add');
})();
