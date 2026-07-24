#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
set -a
source "$project_dir/.env"
set +a
if [[ "${NODE_ENV:-}" == "test" && -n "${RUNTIME_PROJECT_SOURCE:-}" && -d "${RUNTIME_PROJECT_SOURCE:-}" ]]; then
  project_dir="$(cd "$RUNTIME_PROJECT_SOURCE" && pwd)"
fi
: "${BACKEND_PORT:?BACKEND_PORT is required}"
: "${FRONTEND_PORT:?FRONTEND_PORT is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
[[ "$BACKEND_PORT" =~ ^[0-9]+$ ]] || { echo "BACKEND_PORT must be an integer" >&2; exit 1; }
[[ "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || { echo "FRONTEND_PORT must be an integer" >&2; exit 1; }
[[ ${#JWT_SECRET} -ge 32 ]] || { echo "JWT_SECRET must be at least 32 characters" >&2; exit 1; }
if [[ "${NODE_ENV:-}" == "test" ]]; then
  export ALLOWED_ORIGINS="http://127.0.0.1:$FRONTEND_PORT"
  export CORS_ORIGINS="$ALLOWED_ORIGINS"
else
  allowed_origins="${ALLOWED_ORIGINS:-${CORS_ORIGINS:-}}"
  : "${allowed_origins:?ALLOWED_ORIGINS or CORS_ORIGINS is required outside test mode}"
  export ALLOWED_ORIGINS="$allowed_origins" CORS_ORIGINS="$allowed_origins"
fi
for dependency_dir in "$project_dir/backend/node_modules" "$project_dir/frontend/node_modules"; do
  [[ -d "$dependency_dir" ]] || { echo "Missing $dependency_dir; install dependencies explicitly before starting." >&2; exit 1; }
done
for assigned_port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -nP -iTCP:"$assigned_port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Assigned port $assigned_port is already occupied" >&2
    exit 1
  fi
done

(cd "$project_dir/backend" && exec env BACKEND_PORT="$BACKEND_PORT" ALLOWED_ORIGINS="$ALLOWED_ORIGINS" CORS_ORIGINS="$CORS_ORIGINS" npm start) &
backend_pid=$!
(cd "$project_dir/frontend" && exec env PORT="$FRONTEND_PORT" REACT_APP_API_URL="http://127.0.0.1:$BACKEND_PORT/api" BROWSER=none npm start) &
frontend_pid=$!

cleanup() {
  trap - EXIT INT TERM
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
  wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
wait "$backend_pid" "$frontend_pid"
