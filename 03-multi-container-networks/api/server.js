'use strict';

const http = require('node:http');
const os = require('node:os');

const HOST = '0.0.0.0';
const PORT = 3000;
const DATASTORE_URL = (process.env.DATASTORE_URL || 'http://datastore:4000').replace(/\/$/, '');

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (pathname === '/' || pathname === '/items') {
    try {
      const upstream = await fetch(`${DATASTORE_URL}/items`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!upstream.ok) {
        throw new Error(`Datastore returned HTTP ${upstream.status}`);
      }
      const data = await upstream.json();
      const payload = {
        service: 'api',
        apiHost: os.hostname(),
        datastore: data,
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload, null, 2) + '\n');
    } catch (err) {
      const payload = {
        service: 'api',
        apiHost: os.hostname(),
        error: 'Unable to reach datastore',
        details: err.message,
      };
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload, null, 2) + '\n');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found', path: pathname }) + '\n');
});

server.listen(PORT, HOST, () => {
  console.log(`api listening on http://${HOST}:${PORT} (datastore: ${DATASTORE_URL})`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
