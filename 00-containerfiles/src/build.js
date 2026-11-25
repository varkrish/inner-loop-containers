// Simulates a compile/bundle step (e.g., webpack/vite/tsc) executed ONLY in
// the multi-stage "builder" image. This script and Node.js itself are NOT
// copied into the final NGINX runtime image deployed to OpenShift.
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const distDir = path.join(__dirname, '..', 'dist');
const appVersion = process.env.APP_VERSION || pkg.version;
const builtAt = new Date().toISOString();

fs.mkdirSync(distDir, { recursive: true });

const buildMeta = {
  app: pkg.name,
  version: appVersion,
  builtAt,
  builder: `node ${process.version} (UBI 9 builder stage)`,
  runtime: 'Red Hat UBI 9 NGINX 1.24 (multi-stage runtime)',
};

fs.writeFileSync(
  path.join(distDir, 'build-info.json'),
  JSON.stringify(buildMeta, null, 2) + '\n',
  'utf8'
);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OCP Multi-Stage UBI 9 Build Demo</title>
</head>
<body>
  <h1>Red Hat UBI 9 — Multi-Stage Containerfile Demo</h1>
  <p><strong>App:</strong> ${pkg.name} (${appVersion})</p>
  <p><strong>Built at:</strong> ${builtAt}</p>
  <p>Compiled in <code>ubi9/nodejs-20</code> builder stage, served from lean <code>ubi9/nginx-124</code> runtime image (no Node.js in production image).</p>
  <ul>
    <li><a href="/build-info.json">/build-info.json</a></li>
    <li><a href="/healthz">/healthz</a></li>
  </ul>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
console.log(`[builder] Generated production assets in ${distDir} (version=${appVersion})`);
