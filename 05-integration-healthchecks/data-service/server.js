'use strict';

const http = require('node:http');
const os = require('node:os');

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 4000);
const READY_DELAY_MS = Number(process.env.READY_DELAY_MS || 3000);

let ready = READY_DELAY_MS <= 0;

if (!ready) {
  setTimeout(() => {
    ready = true;
    console.log(`[data-service] warm-up complete after ${READY_DELAY_MS}ms — status is now healthy`);
  }, READY_DELAY_MS);
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2) + '\n';
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url || '/', 'http://localhost');

  if (pathname === '/healthz') {
    if (!ready) {
      return sendJson(res, 503, { status: 'starting' });
    }
    return sendJson(res, 200, { status: 'healthy' });
  }

  if (pathname === '/data') {
    if (!ready) {
      return sendJson(res, 503, {
        service: 'data-service',
        ready: false,
        status: 'starting',
      });
    }
    return sendJson(res, 200, {
      service: 'data-service',
      ready: true,
      host: os.hostname(),
      records: [
        { id: 1, name: 'ubi9/nodejs-20' },
        { id: 2, name: 'ubi9/nginx-124' },
      ],
    });
  }

  return sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(
    `[data-service] listening on http://${HOST}:${PORT} (readyDelayMs=${READY_DELAY_MS})`
  );
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
