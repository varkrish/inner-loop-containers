# Podman, Podman Compose & Inner-Loop Development Demo

A progressive, 5-stage customer demo using **Red Hat Universal Base Images (UBI 9)** only (`registry.access.redhat.com/ubi9/*`) and rootless **Podman** + **Podman Compose**.

## Red Hat UBI 9 Stack Used

| Image | Role |
|---|---|
| `registry.access.redhat.com/ubi9/httpd-24:latest` | Rootless Apache HTTP Server (port `8080`) |
| `registry.access.redhat.com/ubi9/nodejs-20:latest` | Rootless Node.js 20 runtime (`node --watch`, built-in `fetch`, zero external deps) |
| `registry.access.redhat.com/ubi9/nginx-124:latest` | Rootless NGINX 1.24 reverse proxy & static web tier (port `8080`) |

## Demo Progression

| Stage | Folder | Host Port | Key Concepts Covered |
|---|---|---|---|
| **0** | [`00-containerfiles/`](./00-containerfiles/README.md) | `8086` / `8087` | OCP-ready single-stage (`Containerfile.sample`) & multi-stage (`Containerfile.multistage`) Containerfiles (`restricted-v2` arbitrary UID, GID `0`, numeric `USER 1001`, unprivileged port `8080`) |
| **1** | [`01-simple-http/`](./01-simple-http/README.md) | `8080` | Basic `podman` CLI lifecycle (`run`, `ps`, `logs`, `stop`, `start`, `rm`) & first `compose.yml` with `ubi9/httpd-24` |
| **2** | [`02-volumes-live-reload/`](./02-volumes-live-reload/README.md) | `8082` | Bind mounts (`:Z` SELinux label), port mappings, and instant inner-loop live reload via `src/watch.js` |
| **3** | [`03-multi-container-networks/`](./03-multi-container-networks/README.md) | `8083` | 3-tier multi-container app (`web` → `api` → `datastore`), Podman DNS discovery, and `frontend-net` / internal `backend-net` isolation |
| **4** | [`04-rebuild-workflow/`](./04-rebuild-workflow/README.md) | `8084` | Custom `Containerfile` builds, explicit rebuild commands (`--build`, `--no-cache`, `--force-recreate`), and `develop.watch` (`action: rebuild`) |
| **5** | [`05-integration-healthchecks/`](./05-integration-healthchecks/README.md) | `8085` | Full integration `compose.yml` with per-service `build.context`, `healthcheck`, and `depends_on` (`condition: service_healthy`) |

## Pre-Demo Check (Optional)

Pre-pull the three Red Hat UBI 9 base images before presenting so every stage runs in seconds:

```bash
podman pull registry.access.redhat.com/ubi9/httpd-24:latest
podman pull registry.access.redhat.com/ubi9/nodejs-20:latest
podman pull registry.access.redhat.com/ubi9/nginx-124:latest
```

## Run Full Automated Verification

To verify all 6 stages (`00` through `05`) end-to-end before a customer session:

```bash
./verify-demo.sh
```

## Quick Reference: Inner-Loop Commands

```bash
# Single container basics
podman run -d --name demo-http -p 8080:8080 registry.access.redhat.com/ubi9/httpd-24:latest
podman ps
podman logs demo-http
podman stop demo-http && podman start demo-http
podman stop demo-http && podman rm demo-http

# Podman Compose inner loop
podman compose up -d                                   # Start stack in background
podman compose logs -f                                 # Stream container logs
podman compose ps                                      # Inspect status & health
podman compose up -d --build --force-recreate          # Rebuild & recreate changed images
podman compose build --no-cache                        # Clean rebuild from scratch
podman compose watch                                   # Auto-rebuild on file changes (Stage 4)
podman compose down --rmi local                        # Stop and clean up containers, networks & local images
```
