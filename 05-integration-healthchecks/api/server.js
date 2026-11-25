'use strict';

const http = require('node:http');
const os = require('node:os');

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const DATA_SERVICE_URL = (
  process.env.DATA_SERVICE_URL || 'http://data-service:4000'
).replace(/\/$/, '');

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2) + '\n';
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url || '/', 'http://localhost');

  if (pathname === '/healthz') {
    try {
      const upstream = await fetch(`${DATA_SERVICE_URL}/healthz`, {
        signal: AbortSignal.timeout(1500),
      });
      if (!upstream.ok) {
        return sendJson(res, 503, {
          status: 'unhealthy',
          upstream: `http ${upstream.status}`,
        });
      }
      return sendJson(res, 200, {
        status: 'healthy',
        upstream: 'healthy',
      });
    } catch {
      return sendJson(res, 503, {
        status: 'unhealthy',
        upstream: 'unavailable',
      });
    }
  }

  if (pathname === '/status' || pathname === '/') {
    try {
      const upstream = await fetch(`${DATA_SERVICE_URL}/data`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!upstream.ok) {
        return sendJson(res, 502, {
          status: 'error',
          apiHost: os.hostname(),
          error: `upstream returned HTTP ${upstream.status}`,
        });
      }
      const data = await upstream.json();
      return sendJson(res, 200, {
        status: 'integrated',
        apiHost: os.hostname(),
        upstream: data,
      });
    } catch {
      return sendJson(res, 503, {
        status: 'unavailable',
        apiHost: os.hostname(),
        error: 'upstream data-service unreachable',
      });
    }
  }

  return sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(
    `[api] listening on http://${HOST}:${PORT} (upstream=${DATA_SERVICE_URL})`
  );
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
