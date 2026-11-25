const http = require('http');
const os = require('os');

// Edit this line to test live reload!
const VERSION = 'v1';
const GREETING = 'Hello from Red Hat UBI 100 + Podman Inner Loop!';
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const payload = {
    status: 'ok',
    version: VERSION,
    greeting: GREETING,
    host: os.hostname(),
    time: new Date().toISOString(),
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload, null, 2) + '\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[live-reload-demo] Listening on port ${PORT} (${VERSION})`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
