#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"

log() {
  echo -e "\033[1;34m[tests]\033[0m $1"
}

# Ensure docker is available for backend Testcontainers
ensure_docker() {
  if command -v docker >/dev/null 2>&1; then
    if ! docker info >/dev/null 2>&1; then
      log "Docker daemon not running. Backend tests may fail."
    fi
  else
    log "Docker not found. Skipping backend tests that require Testcontainers."
    SKIP_BACKEND=1
  fi
}

run_backend_tests() {
  if [[ "${SKIP_BACKEND:-0}" == "1" ]]; then
    log "Skipping backend tests."
    return 0
  fi
  log "Running backend Go tests (apps/backend)"
  pushd "$ROOT_DIR/apps/backend" >/dev/null
  # Run tests specifically in internal/testing directories, only if non-empty
  if [ -d "./internal/testing/unit" ]; then
    if [ -n "$(find ./internal/testing/unit -type f -name '*_test.go' -print -quit 2>/dev/null)" ]; then
      log "Running unit tests (internal/testing/unit)"
      go test ./internal/testing/unit -v
    else
      log "Unit tests folder has no *_test.go files; skipping."
    fi
  else
    log "Unit tests folder not found; skipping."
  fi
  popd >/dev/null
}

run_contracts_tests() {
  if ! command -v forge >/dev/null 2>&1; then
    log "Foundry (forge) not installed. Skipping contracts tests."
    return 0
  fi
  log "Running smart contracts tests (contracts)"
  pushd "$ROOT_DIR/contracts" >/dev/null
  forge test -vvv
  popd >/dev/null
}

main() {
  ensure_docker
  run_backend_tests
#   run_contracts_tests
  log "All requested test suites completed."
}

main "$@"
