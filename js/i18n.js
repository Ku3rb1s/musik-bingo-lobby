// Musik-Bingo – Sprachen
// Alle Texte stehen im Code auf Deutsch. tx('Text') liefert die Übersetzung der gewählten Sprache (fehlt sie, bleibt es deutsch).
// Platzhalter: tx('Runde {n}', { n: 3 }). Feste Texte in index.html übersetzt translatePage() beim Laden.
//
// Neue Sprache hinzufügen:
//   1. js/lang/en.js kopieren, z. B. nach js/lang/fr.js, oben Kürzel, Name und Flagge ändern, die rechten Texte übersetzen
//   2. in index.html vor js/i18n.js eintragen: <script src="js/lang/fr.js?v=…"></script>
//   3. prüfen, ob etwas fehlt: node scripts/check-lang.js
// Neue Texte im Code: mit tx('Deutscher Text') schreiben und in jeder Sprachdatei ergänzen (check-lang.js zeigt, wo).
'use strict';

// Sprachdateien (js/lang/*.js) tragen sich hier ein: LANG_PACKS.en = { name, flag, dict }
const LANG_PACKS = self.LANG_PACKS || {};
const LANGS = { de: { name: 'Deutsch', flag: '🇩🇪' }, ...Object.fromEntries(Object.entries(LANG_PACKS).map(([k, p]) => [k, { name: p.name, flag: p.flag }])) };

// Gewählte Sprache, sonst die des Geräts (falls vorhanden), sonst Englisch bzw. Deutsch
let LANG = (() => {
  try { const v = JSON.parse(localStorage.getItem('mb_lang')); if (LANGS[v]) return v; } catch {}
  // Norwegisch: Geräte melden „nb“, „no“ oder „nn“ – alle bekommen die Bokmål-Übersetzung
  for (const l of navigator.languages || [navigator.language || '']) { let k = String(l).slice(0, 2).toLowerCase(); if (k === 'no' || k === 'nn') k = 'nb'; if (LANGS[k]) return k; }
  return LANGS.en ? 'en' : 'de';
})();
document.documentElement.lang = LANG;
// Sprache wechseln: Beim Spielleiter ohne Neuladen (Runde und Musik laufen weiter, self.liveLang zeichnet alles neu),
// bei Mitspielern/Fernseher durch Neuladen (ihr Stand kommt ohnehin vom Server zurück)
function setLang(l) {
  try { localStorage.setItem('mb_lang', JSON.stringify(l)); } catch {}
  if (typeof self.liveLang !== 'function') return location.reload();
  LANG = curLang = l;
  document.documentElement.lang = l;
  translatePage();
  self.liveLang();
}

let curLang = LANG;
// Etwas in einer anderen Sprache erzeugen – z. B. Lösungen für die Handys immer auf Deutsch (jedes Handy übersetzt selbst)
function withLang(l, fn) { const p = curLang; curLang = l; try { return fn(); } finally { curLang = p; } }
const hasTx = s => curLang === 'de' || Object.hasOwn(LANG_PACKS[curLang]?.dict || {}, s);
function tx(s, vars) {
  const d = curLang !== 'de' && LANG_PACKS[curLang]?.dict;
  let r = d && Object.hasOwn(d, s) ? d[s] : s;
  if (vars) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return r;
}

// Auswahlliste der Sprachen (Einstellungen und Mitspieler-Knopf)
const langOptions = () => Object.entries(LANGS).map(([k, l]) => `<option value="${k}" ${k === LANG ? 'selected' : ''}>${l.flag} ${l.name}</option>`).join('');

// Feste Texte und Attribute der Seite übersetzen (Teilstücke mit <b> o. Ä. einzeln). Der deutsche Originaltext wird
// beim ersten Übersetzen am Element gemerkt (__de) – so geht ein späterer Wechsel in jede Sprache (auch zurück).
function translatePage(root = document.body) {
  const d = LANG_PACKS[LANG]?.dict || {};
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const de = n.__de ?? n.nodeValue, s = de.replace(/\s+/g, ' ').trim();
    if (!s) continue;
    const out = Object.hasOwn(d, s) ? de.match(/^\s*/)[0] + d[s] + de.match(/\s*$/)[0] : de;
    if (out !== n.nodeValue) { n.__de ??= de; n.nodeValue = out; }
  }
  for (const a of ['placeholder', 'aria-label', 'title', 'data-title']) {
    root.querySelectorAll('[' + a + ']').forEach(el => {
      el.__deAttr ??= {};
      const de = el.__deAttr[a] ?? el.getAttribute(a), out = Object.hasOwn(d, de) ? d[de] : de;
      if (out !== el.getAttribute(a)) { el.__deAttr[a] ??= de; el.setAttribute(a, out); }
    });
  }
}
translatePage();
