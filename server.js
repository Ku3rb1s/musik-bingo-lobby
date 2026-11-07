// Mini-Server zum lokalen Testen: node server.js  →  http://127.0.0.1:8888/
// (wie in den anderen Jukebox-Spielen; start.bat / server.ps1 gehen weiterhin)
// Wichtig: http://127.0.0.1:8888/ öffnen, nicht localhost – Firebase (Lobby) ist nur für 127.0.0.1 freigegeben.
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname, port = +process.env.PORT || 8888;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  const f0 = path.join(root, p);
  if (!f0.startsWith(root)) { res.writeHead(403); return res.end(); }
  // Ordner ohne Schrägstrich (z. B. /join) wie bei GitHub Pages umleiten
  if (!p.endsWith('/') && fs.existsSync(f0) && fs.statSync(f0).isDirectory()) { res.writeHead(301, { Location: p + '/' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '') }); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Nicht gefunden'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Musik-Bingo läuft auf http://127.0.0.1:${port}/`));
