# Stage 5: Integration Compose — Build Contexts, Health Checks & Ordered Startup

This stage brings everything together into a 3-service integration stack built exclusively on **Red Hat Universal Base Images (UBI 9)**:

- `registry.access.redhat.com/ubi9/nodejs-20:latest` (`data-service` and `api`)
- `registry.access.redhat.com/ubi9/nginx-124:latest` (`web`)

## What This Stage Demonstrates

1. **Per-Service `build.context` + `Containerfile`**
   Each service lives in its own subdirectory (`./data-service`, `./api`, `./web`) with an independent Red Hat `Containerfile` built automatically via `podman compose up -d --build`.
2. **Container `healthcheck` Definitions**
   Every service exposes a `/healthz` endpoint probed every 2 seconds with `curl -fsS`:
   - `data-service` simulates a 3-second startup warm-up (`READY_DELAY_MS=3000`), returning HTTP `503` until ready and HTTP `200` once initialized.
   - `api` verifies upstream connectivity to `http://data-service:4000/healthz` before reporting itself healthy.
   - `web` serves `/healthz` directly from NGINX on port `8080`.
3. **Ordered Startup with `depends_on` (`condition: service_healthy`)**
   Podman Compose enforces strict readiness ordering rather than starting everything at once:
   ```text
   data-service (3s warm-up -> healthy)
        │
        ▼  [depends_on: condition: service_healthy]
       api (verifies data-service -> healthy)
        │
        ▼  [depends_on: condition: service_healthy]
       web (NGINX reverse proxy on localhost:8085 -> healthy)
   ```
4. **Network Isolation (`frontend-net` & `backend-net`)**
   - `frontend-net` (`bridge`): shared by `web` and `api`.
   - `backend-net` (`bridge`, `internal: true`): shared only by `api` and `data-service`. `web` cannot reach `data-service` directly, and `data-service` has no host port or external egress.

## Directory Layout

```text
05-integration-healthchecks/
├── compose.yml
├── data-service/
│   ├── Containerfile
│   └── server.js
├── api/
│   ├── Containerfile
│   └── server.js
└── web/
    ├── Containerfile
    ├── app.conf
    └── index.html
```

## Live Demo Commands

Run all commands from inside `05-integration-healthchecks/`:

```bash
cd 05-integration-healthchecks
```

### 1. Build and start the stack in dependency order

Watch `data-service` finish its 3-second warm-up and turn healthy before `api` starts, and `api` turn healthy before `web` starts:

```bash
podman compose up -d --build
```

### 2. Inspect container status and health states

```bash
podman compose ps
```

### 3. Verify the web readiness probe and end-to-end API integration

```bash
curl http://localhost:8085/healthz
curl http://localhost:8085/api/status
```

You can also open `http://localhost:8085` in a browser to view the integration status page.

### 4. View aggregated startup and health logs

```bash
podman compose logs
```

### 5. Clean up containers, networks, and locally built images

```bash
podman compose down --rmi local
```
