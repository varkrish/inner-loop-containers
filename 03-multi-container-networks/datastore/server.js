'use strict';

const http = require('node:http');
const os = require('node:os');

const HOST = '0.0.0.0';
const PORT = 4000;

let count = 0;

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (pathname === '/items') {
    const payload = {
      source: 'datastore',
      host: os.hostname(),
      visits: ++count,
      stack: ['RHEL 9 UBI', 'Podman', 'Podman Compose', 'OpenShift'],
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload, null, 2) + '\n');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found', path: pathname }) + '\n');
});

server.listen(PORT, HOST, () => {
  console.log(`datastore listening on http://${HOST}:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
