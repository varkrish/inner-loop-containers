# Containerfile Samples — Red Hat OpenShift (OCP) Best Practices

Two annotated, runnable `Containerfile` examples built exclusively on **Red Hat UBI 9** (`registry.access.redhat.com/ubi9/*`) and hardened for **OpenShift Container Platform (`restricted-v2` SCC)**:

- [`Containerfile.sample`](./Containerfile.sample) — Single-stage UBI 9 Node.js 20 service with full OCP best-practice annotations.
- [`Containerfile.multistage`](./Containerfile.multistage) — Multi-stage build (`ubi9/nodejs-20` `AS builder` → `ubi9/nginx-124` `AS runtime`) keeping build tooling out of the final production image.
- [`.containerignore`](./.containerignore) — Keeps `.git`, docs, and local secrets out of build contexts.

## Key OpenShift (`restricted-v2` SCC) Principles Demonstrated

1. **Trusted Red Hat UBI 9 base images** (`registry.access.redhat.com/ubi9/*`).
2. **Arbitrary UID + GID `0` compatibility** (`--chown=1001:0` and `chmod -R g=u`).
3. **Numeric non-root `USER 1001`** (required by OCP `runAsNonRoot: true` admission check).
4. **Unprivileged port `8080`** (ports `< 1024` are blocked because `NET_BIND_SERVICE` is dropped).
5. **Multi-stage builds** (`AS builder` → `AS runtime`) to reduce image size and CVE surface for Red Hat Quay / ACS.
6. **Exec-form `CMD [...]`** for graceful `SIGTERM` handling during OCP rolling deployments, plus `/healthz` for OCP `livenessProbe` / `readinessProbe`.

---

## Live Demo Commands

Run from `00-containerfiles/`:

### 1. Single-Stage Sample (`Containerfile.sample`)

```bash
podman build -f Containerfile.sample --build-arg APP_VERSION=1.0.0 -t localhost/ocp-sample:1.0 .

# Simulate OpenShift's restricted-v2 SCC by running with an arbitrary UID (not in /etc/passwd) and GID 0!
podman run -d --name ocp-sample --user 12345:0 -p 8086:8080 localhost/ocp-sample:1.0

curl -s http://localhost:8086/
curl -s http://localhost:8086/healthz

podman rm -f ocp-sample
```

Notice the JSON output reports `"uid": 12345, "gid": 0` — proving the image runs cleanly under an arbitrary non-root UID + GID `0` just like OpenShift's `restricted-v2` SCC (using a UID within rootless Podman's default 65,536 `subuid` range).

### 2. Multi-Stage Build (`Containerfile.multistage`)

```bash
podman build -f Containerfile.multistage --build-arg APP_VERSION=2.0.0 -t localhost/ocp-multistage:2.0 .

# Compare single-stage Node.js image vs lean multi-stage NGINX runtime image
podman images localhost/ocp-*

# Run with an OpenShift-style arbitrary UID and GID 0
podman run -d --name ocp-multistage --user 12345:0 -p 8087:8080 localhost/ocp-multistage:2.0

curl -s http://localhost:8087/
curl -s http://localhost:8087/build-info.json
curl -s http://localhost:8087/healthz

# Prove Node.js build tooling is NOT present in the final runtime image:
podman exec ocp-multistage sh -c 'which node || echo "No Node.js in production image!"'

podman rm -f ocp-multistage
```

### 3. Clean Up Demo Images

```bash
podman rmi localhost/ocp-sample:1.0 localhost/ocp-multistage:2.0
```
