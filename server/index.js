// Минимальный REST-бэкенд синхронизации прогресса 3D-мира «Остров Эха».
// Без зависимостей (только встроенные модули Node) и без БД — состояние
// хранится в JSON-файле рядом. Запуск:  node server/index.js
//
// Контракт (совпадает с lib/worldSync.ts в приложении):
//   GET  /world-progress/:childId
//        -> 200 { childId, state, updatedAt }   (state — непрозрачная строка)
//        -> 404, если данных ещё нет
//   PUT  /world-progress/:childId
//        body { childId?, state, updatedAt? }
//        -> 200 { ok, childId, updatedAt }
//   DELETE /world-progress/:childId  -> 200 { ok }   (сброс прогресса)
//   GET  /health -> 200 { ok: true }
//
// CORS открыт (*) — чтобы веб-приложение с localhost:8081 могло обращаться.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'world-data.json');
const MAX_BODY = 2 * 1024 * 1024; // 2 МБ — с запасом на строку состояния

// ---- хранилище: { [childId]: { state, updatedAt } } ----
let store = {};
try {
  store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || {};
} catch {
  store = {};
}
let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), (err) => {
      if (err) console.error('Не удалось сохранить', DATA_FILE, err.message);
    });
  }, 200);
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function send(res, code, obj) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(obj === undefined ? '' : JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const parts = u.pathname.split('/').filter(Boolean); // ['world-progress', '<id>']

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && u.pathname === '/health') {
    send(res, 200, { ok: true, children: Object.keys(store).length });
    return;
  }

  if (parts[0] === 'world-progress' && parts[1]) {
    const childId = decodeURIComponent(parts[1]);

    if (req.method === 'GET') {
      const rec = store[childId];
      if (!rec) {
        send(res, 404, { error: 'not found' });
        return;
      }
      send(res, 200, { childId, state: rec.state, updatedAt: rec.updatedAt });
      return;
    }

    if (req.method === 'DELETE') {
      if (store[childId]) {
        delete store[childId];
        persist();
      }
      send(res, 200, { ok: true, childId });
      return;
    }

    if (req.method === 'PUT') {
      let body = '';
      let aborted = false;
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > MAX_BODY) {
          aborted = true;
          send(res, 413, { error: 'too large' });
          req.destroy();
        }
      });
      req.on('end', () => {
        if (aborted) return;
        let d;
        try {
          d = JSON.parse(body || '{}');
        } catch {
          send(res, 400, { error: 'bad json' });
          return;
        }
        if (typeof d.state !== 'string') {
          send(res, 400, { error: 'state (string) required' });
          return;
        }
        const updatedAt = Number(d.updatedAt) || Date.now();
        const cur = store[childId];
        // Принимаем только не более старое, чтобы запоздавший пуш не затирал свежее.
        if (!cur || updatedAt >= cur.updatedAt) {
          store[childId] = { state: d.state, updatedAt };
          persist();
        }
        send(res, 200, { ok: true, childId, updatedAt: store[childId].updatedAt });
      });
      return;
    }
  }

  send(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log('SpeechSteps world-sync backend');
  console.log(`  слушает:  http://localhost:${PORT}`);
  console.log('  GET  /world-progress/:childId');
  console.log('  PUT  /world-progress/:childId');
  console.log('  GET  /health');
  console.log(`  данные:   ${DATA_FILE}`);
});
