const http = require('http');
const os = require('os');
const pkg = require('../package.json');

const PORT = Number(process.env.PORT || 8080);
const APP_VERSION = process.env.APP_VERSION || pkg.version;

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }) + '\n');
    return;
  }

  const payload = {
    app: pkg.name,
    version: APP_VERSION,
    runtime: 'Red Hat UBI 9 Node.js 20',
    // Under OpenShift restricted-v2 SCC, UID is randomly assigned while GID is 0
    uid: typeof process.getuid === 'function' ? process.getuid() : null,
    gid: typeof process.getgid === 'function' ? process.getgid() : null,
    host: os.hostname(),
    time: new Date().toISOString(),
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload, null, 2) + '\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[ocp-sample] Listening on 0.0.0.0:${PORT} (uid=${process.getuid?.()}, gid=${process.getgid?.()})`);
});

// Handle SIGTERM cleanly so OpenShift rolling updates drain connections gracefully
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`[ocp-sample] Received ${sig}, shutting down gracefully...`);
    server.close(() => process.exit(0));
  });
}
