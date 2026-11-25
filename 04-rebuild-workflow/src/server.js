'use strict';

const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = path.join(__dirname, '..');

function readJson(filename, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT_DIR, filename), 'utf8'));
  } catch {
    return fallback;
  }
}

const pkg = readJson('package.json', { name: 'ubi-rebuild-demo', version: '0.0.0' });
const buildInfo = readJson('build-info.json', { appVersion: 'unbuilt', builtAt: 'local' });

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (pathname === '/' || pathname === '/version') {
    const payload = {
      app: pkg.name,
      packageVersion: pkg.version,
      buildVersion: buildInfo.appVersion,
      builtAt: buildInfo.builtAt,
      host: os.hostname(),
    };

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(`${JSON.stringify({ error: 'Not Found', endpoints: ['/', '/version'] }, null, 2)}\n`);
});

server.listen(PORT, HOST, () => {
  console.log(
    `${pkg.name} v${pkg.version} (build ${buildInfo.appVersion}) listening on http://${HOST}:${PORT}`
  );
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
