const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, 'server.js');
let child = null;

function start() {
  if (child) {
    console.log('[live-reload] Change detected in server.js — restarting...');
    child.kill('SIGTERM');
  }
  child = spawn(process.execPath, [TARGET], { stdio: 'inherit' });
}

// Stat-based watchFile works reliably across Linux native mounts AND macOS Podman virtiofs
fs.watchFile(TARGET, { interval: 300 }, (curr, prev) => {
  if (curr.mtimeMs !== prev.mtimeMs) {
    start();
  }
});

process.on('SIGTERM', () => {
  fs.unwatchFile(TARGET);
  if (child) child.kill('SIGTERM');
  process.exit(0);
});

start();
