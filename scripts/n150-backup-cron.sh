#!/usr/bin/env bash
# n150(192.168.1.14) crontab에서 3일마다 실행되는 PostgreSQL 백업 트리거.
#
# POST /v1/admin/backups는 pg_dump --format=custom을 실행하고 BACKUP_RETENTION_COUNT
# 개수만 보관한다(오래된 dump는 자동 삭제). 이 스크립트는 그 endpoint를 호출만 하고,
# 별도 보존/정리 로직은 두지 않는다.
#
# crontab 등록 예시 (3일마다 03:00 KST 실행):
#   0 18 */3 * * /home/digitie/apps/kor-travel-airport/scripts/n150-backup-cron.sh >> /home/digitie/apps/kor-travel-airport/backups/cron.log 2>&1
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:14001}"
LOG_PREFIX="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

response="$(curl -sS -o /dev/stdout -w '\nHTTP_STATUS:%{http_code}' -X POST "${API_BASE_URL}/v1/admin/backups")"
status="${response##*HTTP_STATUS:}"
body="${response%HTTP_STATUS:*}"

if [[ "${status}" != "201" ]]; then
  echo "${LOG_PREFIX} backup failed (HTTP ${status}): ${body}" >&2
  exit 1
fi

echo "${LOG_PREFIX} backup created: ${body}"
