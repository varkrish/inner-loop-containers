# Stage 1: Simple HTTP Container (Rootless Red Hat UBI 9)

This stage demonstrates running a single, rootless **Red Hat Universal Base Image 9 (`ubi9/httpd-24`)** Apache HTTP Server container. Because UBI 9 `httpd-24` is built to run without root privileges, Apache listens on unprivileged port `8080` inside the container, which we map to `8080` on the host.

First we manage the container lifecycle imperatively with the `podman` CLI, then we run the exact same workload declaratively using `podman compose`.

---

## 1. Basic Podman CLI Lifecycle

Start the Apache HTTP container in detached mode:

```bash
podman run -d --name simple-http -p 8080:8080 registry.access.redhat.com/ubi9/httpd-24:latest
```

Verify the container is running:

```bash
podman ps
```

Check that Apache responds on port `8080`:

```bash
curl -I http://localhost:8080
```

View the container logs:

```bash
podman logs simple-http
```

Stop and start the container:

```bash
podman stop simple-http
podman start simple-http
```

Clean up the container before moving to Section 2 (so host port `8080` is free):

```bash
# Option A: Graceful stop followed by remove
podman stop simple-http
podman rm simple-http

# Option B: Force-remove a running container in one step
podman rm -f simple-http
```

Confirm the container has been removed (including stopped containers):

```bash
podman ps -a
```

---

## 2. Declarative Lifecycle with Podman Compose

[`compose.yml`](./compose.yml) defines the exact same `registry.access.redhat.com/ubi9/httpd-24:latest` service (`web`, container name `demo-simple-http`, port mapping `8080:8080`) in a repeatable, version-controlled file.

From the `01-simple-http` directory:

```bash
cd 01-simple-http
```

Start the stack in detached mode:

```bash
podman compose up -d
```

Check service status:

```bash
podman compose ps
```

Verify the HTTP server responds on port `8080`:

```bash
curl -I http://localhost:8080
```

Inspect service logs:

```bash
podman compose logs
```

Stop and start the service without removing it:

```bash
podman compose stop
podman compose start
```

Stop and remove all containers and networks created by Compose:

```bash
podman compose down
```
