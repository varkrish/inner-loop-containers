# Stage 2: Volumes & Instant Live Reload (Inner Loop)

This stage demonstrates a fast local inner-loop workflow with **Podman Compose** and **Red Hat UBI 9 Node.js 20**. By bind-mounting local source code into the container and running a lightweight zero-dependency watcher (`src/watch.js`), code edits take effect immediately without rebuilding an image or restarting the container (working reliably on both Linux and macOS Podman Machine virtiofs).

## What's Inside

- `compose.yml` — Runs `registry.access.redhat.com/ubi9/nodejs-20:latest` with `./src` bind-mounted to `/opt/app-root/src:Z` (`:Z` applies the required SELinux label on RHEL/Fedora hosts) and `node watch.js`.
- `src/watch.js` — Lightweight zero-dependency stat-based watcher (`fs.watchFile`) that restarts `server.js` immediately whenever you save changes.
- `src/server.js` — Zero-dependency Node.js 20 HTTP server returning JSON with the current `version`, `greeting`, container `host`, and `time`.

## Live Demo Walkthrough

Run all commands from this directory (`02-volumes-live-reload/`):

### 1. Start the service

```bash
podman compose up -d
```

### 2. Follow the container logs (optional, in a second terminal)

```bash
podman compose logs -f
```

You should see:

```text
[live-reload-demo] Listening on port 3000 (v1)
```

### 3. Verify the running service

```bash
curl http://localhost:8082
```

Example response:

```json
{
  "status": "ok",
  "version": "v1",
  "greeting": "Hello from Podman Inner Loop!",
  "host": "a1b2c3d4e5f6",
  "time": "2026-01-01T12:00:00.000Z"
}
```

### 4. Edit code and watch instant live reload

Open `src/server.js` and change `VERSION` from `'v1'` to `'v2'`:

```js
// Edit this line to test live reload!
const VERSION = 'v2';
```

Save the file. In the logs terminal, Node 20 automatically detects the change and restarts the server:

```text
[live-reload] Change detected in server.js — restarting...
[live-reload-demo] Listening on port 3000 (v2)
```

### 5. Verify immediately — no rebuild or restart required

```bash
curl http://localhost:8082
```

The JSON response immediately shows `"version": "v2"`.

*(Tip: revert `VERSION` back to `'v1'` when finished so the repo stays clean for the next demo.)*

### 6. Clean up

```bash
podman compose down
```
