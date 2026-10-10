// Prüft die Sprachdateien (js/lang/*.js): Was fehlt, was ist überflüssig, stimmen die Platzhalter?
// Aufruf im Projektordner:  node scripts/check-lang.js
// Maßstab ist js/lang/en.js (vollständig). Zusätzlich: tx('…')-Texte im Code, die in en.js noch fehlen.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const sandbox = { self: {} };
vm.createContext(sandbox);
const langDir = path.join(root, 'js', 'lang');
for (const f of fs.readdirSync(langDir).filter(f => f.endsWith('.js'))) vm.runInContext(fs.readFileSync(path.join(langDir, f), 'utf8'), sandbox, { filename: f });
const packs = sandbox.self.LANG_PACKS || {};
if (!packs.en) { console.error('js/lang/en.js fehlt'); process.exit(1); }
const master = Object.keys(packs.en.dict);
const vars = s => (s.match(/\{\w+\}/g) || []).sort().join(',');
let problems = 0;

// tx('…') mit festem Text im Code, der in en.js fehlt
const code = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js') && f !== 'i18n.js')
  .map(f => fs.readFileSync(path.join(root, 'js', f), 'utf8')).join('\n');
const used = new Set();
for (const m of code.matchAll(/\btx\(\s*'((?:\\.|[^'\\])*)'/g)) used.add(m[1].replace(/\\n/g, '\n').replace(/\\'/g, "'"));
const missingEn = [...used].filter(k => !Object.hasOwn(packs.en.dict, k));
if (missingEn.length) { problems += missingEn.length; console.log(`\nen: ${missingEn.length} Texte aus dem Code fehlen:`); missingEn.forEach(k => console.log('  - ' + JSON.stringify(k))); }

for (const [code2, p] of Object.entries(packs)) {
  if (code2 === 'en') continue;
  const keys = Object.keys(p.dict);
  const missing = master.filter(k => !Object.hasOwn(p.dict, k));
  const extra = keys.filter(k => !Object.hasOwn(packs.en.dict, k));
  const badVars = keys.filter(k => Object.hasOwn(packs.en.dict, k) && vars(p.dict[k]) !== vars(k));
  console.log(`\n${code2} (${p.flag} ${p.name}): ${keys.length - extra.length} von ${master.length} übersetzt`);
  if (missing.length) { console.log(`  fehlt (${missing.length}):`); missing.forEach(k => console.log('    - ' + JSON.stringify(k))); }
  if (extra.length) { console.log(`  überflüssig (${extra.length}):`); extra.forEach(k => console.log('    - ' + JSON.stringify(k))); }
  if (badVars.length) { console.log(`  Platzhalter passen nicht ({n} usw.):`); badVars.forEach(k => console.log('    - ' + JSON.stringify(k))); }
  problems += missing.length + badVars.length;
}
console.log(problems ? `\n${problems} Punkt(e) offen.` : `\nAlles vollständig (${Object.keys(packs).length + 1} Sprachen).`);
process.exit(problems ? 1 : 0);
