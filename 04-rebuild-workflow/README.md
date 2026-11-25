# Stage 4: Custom Image Builds & Rebuild Workflows

This stage demonstrates building a custom immutable application image on top of Red Hat UBI 9 (`registry.access.redhat.com/ubi9/nodejs-20:latest`) and triggering controlled or automated image rebuilds with `podman compose`.

Unlike bind-mounted live reload, this container bakes `package.json`, `src/server.js`, and a build-time `build-info.json` stamp directly into the image—so every change to build arguments, dependencies, or code produces a verifiable, reproducible container artifact.

## Rebuild vs. Live-Reload Bind Mounts

| Workflow | Best Used For | How Changes Take Effect |
| --- | --- | --- |
| **Live-reload bind mounts (Stage 2)** | Fast inner-loop authoring of static assets or interpreted source files | Host filesystem edits appear immediately inside the running container—no new image layer is created |
| **Image rebuild workflow (Stage 4)** | Dependency changes (`package.json`), `Containerfile` updates, build args (`APP_VERSION`), compiled artifacts, or pre-release parity testing | `podman compose` builds a new immutable image layer and recreates the container |

Use bind mounts for rapid editing, and switch to rebuilds whenever you change dependencies, build inputs, or want to validate the exact container image that will ship to CI/CD or Red Hat OpenShift.

## What's Inside

- `Containerfile` — Builds from `registry.access.redhat.com/ubi9/nodejs-20:latest`, copies `package.json` and `src/`, and writes build-time metadata (`appVersion` and UTC `builtAt`) to `/opt/app-root/src/build-info.json`.
- `compose.yml` — Defines the `app` service (`localhost/ubi-rebuild-demo:latest`) on port `8084:3000`, passes `APP_VERSION` as a build arg, and configures `develop.watch` with `action: rebuild` on `./package.json` and `./src`.
- `package.json` — Minimal zero-dependency Node.js manifest (`ubi-rebuild-demo`).
- `src/server.js` — Zero-dependency Node.js 20 HTTP server exposing `/` and `/version` with package metadata, baked-in build metadata, and container hostname.

## Demo Walkthrough

Run all commands from this directory (`04-rebuild-workflow/`):

### 1. Initial Build and Run

Build the UBI 9 Node.js image and start the container:

```bash
podman compose up -d --build
curl http://localhost:8084/version
```

Example output:

```json
{
  "app": "ubi-rebuild-demo",
  "packageVersion": "1.0.0",
  "buildVersion": "1.0.0",
  "builtAt": "2026-11-24T23:45:00Z",
  "host": "a1b2c3d4e5f6"
}
```

### 2. Explicit Rebuild with Updated Build Arg (or `package.json` Edit)

Pass a new `APP_VERSION` build argument (or edit `"version"` in `package.json`) and force a rebuild and container recreation:

```bash
APP_VERSION=2.0.0 podman compose up -d --build --force-recreate
curl http://localhost:8084/version
```

Notice that `buildVersion` updates to `"2.0.0"`, `builtAt` reflects the new build timestamp, and `host` changes to the newly recreated container ID.

### 3. Clean No-Cache Rebuild

Bypass the build layer cache completely to guarantee a clean rebuild from the base UBI image:

```bash
podman compose build --no-cache && podman compose up -d --force-recreate
curl http://localhost:8084/version
```

Even without changing source files or `APP_VERSION`, `builtAt` updates because every `Containerfile` step re-executes cleanly.

### 4. Watch-Driven Auto-Rebuild (`develop.watch`)

`compose.yml` declares `develop.watch` rules with `action: rebuild` for `./package.json` and `./src`. Start watch mode:

```bash
podman compose watch
```

In a second terminal, update `"version"` in `package.json` (for example from `"1.0.0"` to `"1.1.0"`) or edit `src/server.js`. `podman compose watch` detects the change, rebuilds `localhost/ubi-rebuild-demo:latest`, and recreates `demo-rebuild-app` automatically.

Verify the rebuilt container in the second terminal:

```bash
curl http://localhost:8084/version
```

Press `Ctrl+C` in the watch terminal when finished.

### 5. Cleanup

Stop the container and remove the locally built demo image:

```bash
podman compose down --rmi local
```
