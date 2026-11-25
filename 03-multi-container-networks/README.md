# Stage 3: Multi-Container Architecture & Network Segmentation

This stage runs a 3-tier application built exclusively on **Red Hat UBI 9** images to demonstrate:

- **Multi-container orchestration** with `podman compose`
- **Automatic Podman DNS service discovery** (`web` resolves `api`, and `api` resolves `datastore` by service name)
- **Network segmentation** across two isolated bridge networks (`frontend-net` and an internal `backend-net`)

## Architecture

```text
                frontend-net                      backend-net (internal: true)
Host :8083 ──► [ web:8080 ] ──► http://api:3000 ──► [ api:3000 ] ──► http://datastore:4000 ──► [ datastore:4000 ]
               ubi9/nginx-124                      ubi9/nodejs-20                              ubi9/nodejs-20
```

- Only `web` publishes a host port (`8083:8080`).
- `api` and `datastore` expose **no host ports**.
- `api` bridges `frontend-net` and `backend-net`.
- `datastore` lives only on `backend-net` (`internal: true`), completely unreachable from `web` or the host.

## Demo Walkthrough

Run all commands from this directory (`03-multi-container-networks/`):

### 1. Start the 3-tier stack

```bash
podman compose up -d
```

### 2. Inspect the Podman networks created

```bash
podman network ls
```

You will see dedicated `frontend-net` and `backend-net` bridge networks scoped to this project.

### 3. Verify the frontend and full 3-tier request flow

Fetch the static page from NGINX (`web`):

```bash
curl http://localhost:8083/
```

Call `/api/items` (`web` → `api` → `datastore`):

```bash
curl http://localhost:8083/api/items
```

Run it a second time and observe `datastore.visits` increment with each request while returning the container hostnames of `api` and `datastore`.

### 4. Verify Podman DNS & service discovery on `frontend-net`

From inside `web`, resolve and call `api` directly by service name:

```bash
podman compose exec web curl -s http://api:3000/items
```

### 5. Prove network isolation (`web` cannot reach `datastore`)

Attempt to reach `datastore` directly from `web`:

```bash
podman compose exec web curl -m 2 http://datastore:4000/items
```

This fails (`Could not resolve host: datastore`) because `web` is attached only to `frontend-net`, while `datastore` is isolated on `backend-net`.

### 6. Tear down the stack and networks

```bash
podman compose down
```
