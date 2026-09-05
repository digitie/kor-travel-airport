#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-192.168.1.14}"
REMOTE_USER="${REMOTE_USER:-digitie}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/home/digitie/apps/kor-travel-airport}"
REMOTE_ENV_FILE="${REMOTE_ENV_FILE:-.env.server14}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-kor-travel-airport}"
CANDIDATE_SHA="$(git rev-parse HEAD)"

if [[ ! "${CANDIDATE_SHA}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Refusing deployment: unable to resolve a full git candidate SHA." >&2
  exit 2
fi

if [[ "${REMOTE_HOST}" != "192.168.1.14" ]]; then
  echo "Refusing deployment: this script may run Docker only on 192.168.1.14 (got ${REMOTE_HOST})." >&2
  exit 2
fi
if [[ "${REMOTE_APP_DIR}" != "/home/digitie/apps/kor-travel-airport" ]]; then
  echo "Refusing deployment: only /home/digitie/apps/kor-travel-airport is an approved server14 app directory." >&2
  exit 2
fi
if [[ "${REMOTE_ENV_FILE}" != ".env.server14" ]]; then
  echo "Refusing deployment: only .env.server14 is an approved server14 environment file." >&2
  exit 2
fi
if [[ "${COMPOSE_PROJECT_NAME}" != "kor-travel-airport" ]]; then
  echo "Refusing deployment: this script may update only the kor-travel-airport Compose project." >&2
  exit 2
fi

ARCHIVE_PATH="$(mktemp -p /tmp kor-travel-airport-server14.XXXXXX.tgz)"
REMOTE_ARCHIVE="/tmp/$(basename "${ARCHIVE_PATH}")"

cleanup() {
  rm -f "${ARCHIVE_PATH}"
}
trap cleanup EXIT

git archive --format=tar.gz --output="${ARCHIVE_PATH}" HEAD

ssh "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p '${REMOTE_APP_DIR}'"
scp "${ARCHIVE_PATH}" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_ARCHIVE}"
ssh "${REMOTE_USER}@${REMOTE_HOST}" \
  "REMOTE_APP_DIR='${REMOTE_APP_DIR}' REMOTE_ARCHIVE='${REMOTE_ARCHIVE}' REMOTE_ENV_FILE='${REMOTE_ENV_FILE}' COMPOSE_PROJECT_NAME='${COMPOSE_PROJECT_NAME}' CANDIDATE_SHA='${CANDIDATE_SHA}' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail
if ! command -v rsync >/dev/null 2>&1; then
  echo "Refusing deployment: rsync is required to remove stale candidate files safely." >&2
  exit 2
fi
if [[ ! -f "${REMOTE_APP_DIR}/${REMOTE_ENV_FILE}" ]]; then
  echo "Missing ${REMOTE_APP_DIR}/${REMOTE_ENV_FILE}; copy .env.server14.example and add the existing operations values." >&2
  exit 2
fi

REMOTE_STAGE="$(mktemp -d /tmp/kor-travel-airport-release.XXXXXX)"
cleanup_remote() {
  rm -rf -- "${REMOTE_STAGE}" "${REMOTE_ARCHIVE}"
}
trap cleanup_remote EXIT
tar -xzf "${REMOTE_ARCHIVE}" -C "${REMOTE_STAGE}"
rsync -a --delete \
  --exclude="${REMOTE_ENV_FILE}" \
  --exclude="backups/" \
  "${REMOTE_STAGE}/" "${REMOTE_APP_DIR}/"
cd "${REMOTE_APP_DIR}"
set -a
source "${REMOTE_ENV_FILE}"
set +a

require_exact() {
  local name="$1"
  local expected="$2"
  local actual="${!name-}"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "Refusing server14 deployment: ${name}=${actual@Q}, expected ${expected@Q}." >&2
    exit 2
  fi
}

if [[ "${POSTGRES_BIND_HOST:-127.0.0.1}" != "127.0.0.1" ]]; then
  echo "Refusing server14 deployment: PostgreSQL must bind to loopback only." >&2
  exit 2
fi
require_exact POSTGRES_HOST_PORT 14000
require_exact PUBLIC_API_PORT 14001
require_exact PUBLIC_WEB_PORT 14002
require_exact ENABLE_SCHEDULER true
require_exact ENABLE_MANUAL_COLLECT false
require_exact RUN_DB_MIGRATIONS true
require_exact SEED_SAMPLE_DATA false
require_exact USE_SAMPLE_CLIENT_WHEN_NO_KEY false
require_exact COLLECT_INTERVAL_SECONDS 300
if [[ "${SCHEDULER_SAFETY_BUFFER_SECONDS:-}" != "120" ]]; then
	echo "Refusing server14 deployment: SCHEDULER_SAFETY_BUFFER_SECONDS must be explicitly set to 120." >&2
  exit 2
fi
require_exact MANUAL_COLLECT_MIN_INTERVAL_SECONDS 300
require_exact BACKEND_INTERNAL_URL http://backend:8000
require_exact BACKUP_DIR /app/backups
if [[ -n "${NEXT_PUBLIC_API_BASE_URL:-}" ]]; then
  echo "Refusing server14 deployment: NEXT_PUBLIC_API_BASE_URL must be empty for same-origin proxying." >&2
  exit 2
fi
if [[ ! "${DATABASE_URL:-}" =~ ^postgresql\+asyncpg://[^@]+@postgres:5432/parking_radar$ ]]; then
  echo "Refusing server14 deployment: DATABASE_URL must target the Compose PostgreSQL service." >&2
  exit 2
fi
# DB stack has its own lifecycle (T-032) and is not touched on every app deploy.
# Bring it up only if it is not already running -- this must never recreate an
# existing postgres container, since that would attach a fresh empty volume if
# the named-volume reference in docker-compose.db.yml is ever wrong.
if ! docker compose --project-name "${COMPOSE_PROJECT_NAME}-db" --env-file "${REMOTE_ENV_FILE}" -f docker-compose.db.yml ps --status running --format '{{.Name}}' 2>/dev/null | grep -q postgres; then
  docker compose --project-name "${COMPOSE_PROJECT_NAME}-db" --env-file "${REMOTE_ENV_FILE}" -f docker-compose.db.yml up -d
fi
export RELEASE_SHA="${CANDIDATE_SHA}"
docker compose --project-name "${COMPOSE_PROJECT_NAME}" --env-file "${REMOTE_ENV_FILE}" -f docker-compose.yml up -d --build
docker compose --project-name "${COMPOSE_PROJECT_NAME}" --env-file "${REMOTE_ENV_FILE}" -f docker-compose.yml ps
health_payload=""
for attempt in $(seq 1 30); do
  if health_payload="$(curl -fsS "http://127.0.0.1:${PUBLIC_API_PORT:-14001}/health" 2>/dev/null)"; then
    break
  fi
  if [[ "${attempt}" == "30" ]]; then
    echo "backend did not become ready within 60 seconds" >&2
    exit 1
  fi
  sleep 2
done
if ! grep -Fq "\"release_sha\":\"${CANDIDATE_SHA}\"" <<<"${health_payload}"; then
  echo "deployed health release_sha does not match candidate ${CANDIDATE_SHA}: ${health_payload}" >&2
  exit 1
fi
for attempt in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PUBLIC_WEB_PORT:-14002}/" >/dev/null; then
    break
  fi
  if [[ "${attempt}" == "30" ]]; then
    echo "frontend did not become ready within 60 seconds" >&2
    exit 1
  fi
  sleep 2
done
REMOTE_SCRIPT

echo "192.168.1.14 deployment completed; existing compose projects were not stopped."
