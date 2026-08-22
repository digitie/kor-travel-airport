#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-192.168.1.14}"
REMOTE_USER="${REMOTE_USER:-digitie}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/home/digitie/apps/parking-radar}"
REMOTE_ENV_FILE="${REMOTE_ENV_FILE:-.env.server14}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-parking-radar}"
CANDIDATE_SHA="$(git rev-parse HEAD)"

if [[ ! "${CANDIDATE_SHA}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Refusing deployment: unable to resolve a full git candidate SHA." >&2
  exit 2
fi

if [[ "${REMOTE_HOST}" != "192.168.1.14" ]]; then
  echo "Refusing deployment: this script may run Docker only on 192.168.1.14 (got ${REMOTE_HOST})." >&2
  exit 2
fi
if [[ "${REMOTE_APP_DIR}" != "/home/digitie/apps/parking-radar" ]]; then
  echo "Refusing deployment: only /home/digitie/apps/parking-radar is an approved server14 app directory." >&2
  exit 2
fi
if [[ "${REMOTE_ENV_FILE}" != ".env.server14" ]]; then
  echo "Refusing deployment: only .env.server14 is an approved server14 environment file." >&2
  exit 2
fi
if [[ "${COMPOSE_PROJECT_NAME}" != "parking-radar" ]]; then
  echo "Refusing deployment: this script may update only the parking-radar Compose project." >&2
  exit 2
fi

ARCHIVE_PATH="$(mktemp -p /tmp parking-radar-server14.XXXXXX.tgz)"
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
if [[ ! -f "${REMOTE_APP_DIR}/${REMOTE_ENV_FILE}" ]]; then
  echo "Missing ${REMOTE_APP_DIR}/${REMOTE_ENV_FILE}; copy .env.server14.example and add the existing operations values." >&2
  exit 2
fi
tar -xzf "${REMOTE_ARCHIVE}" -C "${REMOTE_APP_DIR}"
cd "${REMOTE_APP_DIR}"
set -a
source "${REMOTE_ENV_FILE}"
set +a
export RELEASE_SHA="${CANDIDATE_SHA}"
docker compose --project-name "${COMPOSE_PROJECT_NAME}" --env-file "${REMOTE_ENV_FILE}" -f docker-compose.yml up -d --build
docker compose --project-name "${COMPOSE_PROJECT_NAME}" --env-file "${REMOTE_ENV_FILE}" -f docker-compose.yml ps
health_payload=""
for attempt in $(seq 1 30); do
  if health_payload="$(curl -fsS "http://127.0.0.1:${PUBLIC_API_PORT:-14000}/health" 2>/dev/null)"; then
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
  if curl -fsS "http://127.0.0.1:${PUBLIC_WEB_PORT:-14001}/" >/dev/null; then
    break
  fi
  if [[ "${attempt}" == "30" ]]; then
    echo "frontend did not become ready within 60 seconds" >&2
    exit 1
  fi
  sleep 2
done
rm -f "${REMOTE_ARCHIVE}"
REMOTE_SCRIPT

echo "192.168.1.14 deployment completed; existing compose projects were not stopped."
