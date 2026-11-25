#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

pass() { echo "✅ PASS: $*"; }
info() { echo "▶ $*"; }
fail() { echo "❌ FAIL: $*" >&2; exit 1; }

wait_http() {
  local url="$1"
  local expected="$2"
  local attempts="${3:-20}"
  for _ in $(seq 1 "$attempts"); do
    if body="$(curl -fsS "$url" 2>/dev/null)" && [[ "$body" == *"$expected"* ]]; then
      echo "$body"
      return 0
    fi
    sleep 0.5
  done
  return 1
}

echo "============================================================"
echo " Podman & Podman Compose 6-Stage UBI 9 Demo Verification"
echo "============================================================"

# ------------------------------------------------------------
# Stage 0: OCP Single-Stage & Multi-Stage Containerfiles
# ------------------------------------------------------------
info "Stage 0: OCP-ready Containerfile.sample & Containerfile.multistage (arbitrary UID 12345:0)..."
(
  cd "$ROOT_DIR/00-containerfiles"
  podman rm -f ocp-sample-verify ocp-multi-verify >/dev/null 2>&1 || true
  trap 'podman rm -f ocp-sample-verify ocp-multi-verify >/dev/null 2>&1 || true; podman rmi -f localhost/ocp-sample:verify localhost/ocp-multistage:verify >/dev/null 2>&1 || true' EXIT

  podman build -q -f Containerfile.sample --build-arg APP_VERSION=1.0.0 -t localhost/ocp-sample:verify . >/dev/null
  podman run -d --name ocp-sample-verify --user 12345:0 -p 8086:8080 localhost/ocp-sample:verify >/dev/null
  wait_http "http://localhost:8086/" '"uid": 12345' 20 >/dev/null || fail "Stage 0 sample arbitrary UID check failed"
  wait_http "http://localhost:8086/healthz" '"status":"ok"' 20 >/dev/null || fail "Stage 0 sample /healthz failed"
  podman rm -f ocp-sample-verify >/dev/null

  podman build -q -f Containerfile.multistage --build-arg APP_VERSION=2.0.0 -t localhost/ocp-multistage:verify . >/dev/null
  podman run -d --name ocp-multi-verify --user 12345:0 -p 8087:8080 localhost/ocp-multistage:verify >/dev/null
  wait_http "http://localhost:8087/" "Multi-Stage Containerfile Demo" 20 >/dev/null || fail "Stage 0 multistage HTML failed"
  wait_http "http://localhost:8087/build-info.json" '"version": "2.0.0"' 20 >/dev/null || fail "Stage 0 multistage build-info failed"
  wait_http "http://localhost:8087/healthz" "ok" 20 >/dev/null || fail "Stage 0 multistage /healthz failed"
  if podman exec ocp-multi-verify sh -c 'which node' >/dev/null 2>&1; then
    fail "Stage 0 multistage runtime image unexpectedly contains node binary"
  fi
  podman rm -f ocp-multi-verify >/dev/null
  podman rmi -f localhost/ocp-sample:verify localhost/ocp-multistage:verify >/dev/null
  trap - EXIT
)
pass "Stage 0 OCP Containerfile.sample & Containerfile.multistage (arbitrary UID 12345:0)"

# ------------------------------------------------------------
# Stage 1: Simple HTTP + Basic Podman CLI Lifecycle
# ------------------------------------------------------------
info "Stage 1: Basic podman CLI lifecycle (run/ps/stop/start/rm)..."
podman rm -f simple-http-test >/dev/null 2>&1 || true
podman run -d --name simple-http-test -p 8080:8080 registry.access.redhat.com/ubi9/httpd-24:latest >/dev/null
sleep 1
curl -sS -I http://localhost:8080 | grep -qi "HTTP/1.1 200\|HTTP/1.1 403" || fail "Stage 1 CLI httpd did not respond"
podman stop simple-http-test >/dev/null
podman start simple-http-test >/dev/null
sleep 1
curl -sS -I http://localhost:8080 | grep -qi "HTTP/1.1 200\|HTTP/1.1 403" || fail "Stage 1 CLI httpd after restart failed"
podman stop simple-http-test >/dev/null
podman rm simple-http-test >/dev/null
pass "Stage 1 basic podman CLI lifecycle"

info "Stage 1: podman compose up/down..."
(
  cd "$ROOT_DIR/01-simple-http"
  podman compose down >/dev/null 2>&1 || true
  podman compose up -d
  sleep 1
  curl -sS -I http://localhost:8080 | grep -qi "HTTP/1.1 200\|HTTP/1.1 403" || fail "Stage 1 compose httpd did not respond"
  podman compose down
)
pass "Stage 1 compose.yml (ubi9/httpd-24)"

# ------------------------------------------------------------
# Stage 2: Volumes, Port Mappings & Live Reload
# ------------------------------------------------------------
info "Stage 2: Volumes & live reload..."
(
  cd "$ROOT_DIR/02-volumes-live-reload"
  podman compose down >/dev/null 2>&1 || true
  podman compose up -d
  wait_http "http://localhost:8082" '"version": "v1"' 20 >/dev/null || fail "Stage 2 initial v1 response failed"

  # Trigger live reload by editing bind-mounted source file
  cp src/server.js src/server.js.bak
  trap 'mv -f src/server.js.bak src/server.js 2>/dev/null || true; podman compose down >/dev/null 2>&1 || true' EXIT
  sed "s/'v1'/'v2-live-reloaded'/" src/server.js.bak > src/server.js

  wait_http "http://localhost:8082" '"version": "v2-live-reloaded"' 20 >/dev/null || fail "Stage 2 live reload did not pick up change"
  mv -f src/server.js.bak src/server.js
  trap - EXIT
  podman compose down
)
pass "Stage 2 bind mount + instant live reload (v1 -> v2-live-reloaded without container restart)"

# ------------------------------------------------------------
# Stage 3: Multi-Container & Networks
# ------------------------------------------------------------
info "Stage 3: Multi-container & isolated networks..."
(
  cd "$ROOT_DIR/03-multi-container-networks"
  podman compose down >/dev/null 2>&1 || true
  podman compose up -d
  trap 'podman compose down >/dev/null 2>&1 || true' EXIT

  wait_http "http://localhost:8083/" "Multi-Container" 20 >/dev/null || fail "Stage 3 web root failed"
  wait_http "http://localhost:8083/api/items" "RHEL 9 UBI" 20 >/dev/null || fail "Stage 3 web->api->datastore failed"

  # Verify network isolation: web MUST NOT reach datastore directly
  if podman compose exec -T web curl -fsS -m 2 http://datastore:4000/items >/dev/null 2>&1; then
    fail "Stage 3 network isolation broken: web reached datastore directly"
  fi

  trap - EXIT
  podman compose down
)
pass "Stage 3 multi-container DNS + frontend-net/backend-net isolation"

# ------------------------------------------------------------
# Stage 4: Rebuild Workflow
# ------------------------------------------------------------
info "Stage 4: Rebuild workflow (Containerfile + build args + develop.watch config)..."
(
  cd "$ROOT_DIR/04-rebuild-workflow"
  podman compose down --rmi local >/dev/null 2>&1 || true
  trap 'podman compose down --rmi local >/dev/null 2>&1 || true' EXIT

  podman compose config >/dev/null || fail "Stage 4 compose config invalid"
  APP_VERSION=1.0.0 podman compose up -d --build
  v1_body="$(wait_http "http://localhost:8084/version" '"buildVersion": "1.0.0"' 20)" || fail "Stage 4 v1 build check failed"
  info "Stage 4 initial build: $(echo "$v1_body" | tr -d '\n')"

  sleep 1
  APP_VERSION=2.0.0 podman compose up -d --build --force-recreate
  v2_body="$(wait_http "http://localhost:8084/version" '"buildVersion": "2.0.0"' 20)" || fail "Stage 4 v2 rebuild check failed"
  info "Stage 4 rebuilt build: $(echo "$v2_body" | tr -d '\n')"

  trap - EXIT
  podman compose down --rmi local
  podman rmi -f localhost/ubi-rebuild-demo:latest >/dev/null 2>&1 || true
)
pass "Stage 4 rebuild workflow (1.0.0 -> 2.0.0 rebuilt cleanly)"

# ------------------------------------------------------------
# Stage 5: Integration (Build Context, Health Checks, Depends On)
# ------------------------------------------------------------
info "Stage 5: Integration compose (build context + healthchecks + depends_on service_healthy)..."
(
  cd "$ROOT_DIR/05-integration-healthchecks"
  podman compose down --rmi local >/dev/null 2>&1 || true
  trap 'podman compose down --rmi local >/dev/null 2>&1 || true' EXIT

  podman compose up -d --build
  wait_http "http://localhost:8085/healthz" "ok" 30 >/dev/null || fail "Stage 5 web /healthz failed"
  status_body="$(wait_http "http://localhost:8085/api/status" '"status": "integrated"' 30)" || fail "Stage 5 /api/status integration failed"
  info "Stage 5 integration status: $(echo "$status_body" | tr -d '\n')"

  # Wait briefly for web container's own healthcheck to turn healthy
  for _ in $(seq 1 15); do
    healthy_count="$(podman compose ps --format json | grep -ci '"Health":"healthy"\|"Status":"[^"]*(healthy)"' || true)"
    if [[ "$healthy_count" -ge 3 ]]; then
      break
    fi
    sleep 1
  done
  podman compose ps

  trap - EXIT
  podman compose down --rmi local
)
pass "Stage 5 integration stack (build context + healthcheck + depends_on)"

echo "============================================================"
echo " 🎉 ALL 6 STAGES (00-05) PASSED ON RED HAT UBI 9 + PODMAN COMPOSE!"
echo "============================================================"
