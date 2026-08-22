# 백업·복원

## 계약

- `GET /admin/backups` — `/app/backups`의 PostgreSQL custom-format `.dump` 목록
- `POST /admin/backups` — `pg_dump --format=custom --no-owner --no-acl` 실행
- `GET /admin/backups/{filename}` — 안전한 파일명만 다운로드
- `POST /admin/backups/restore` — `.dump` 업로드 후 자동 사전 백업을 만든 다음 `pg_restore --clean --if-exists --exit-on-error` 실행

보존 개수는 `BACKUP_RETENTION_COUNT`로 제한한다. DB URL 비밀번호는 명령행에 직접 넘기지 않고 `PGPASSWORD` 환경으로만 PostgreSQL CLI에 전달한다.

복원 요청은 먼저 pre-restore dump를 만든 뒤 업로드와 `pg_restore`를 순서대로 실행한다. 운영 기본 제한은
명령별 `BACKUP_COMMAND_TIMEOUT_SECONDS=120`, 업로드 `BACKUP_UPLOAD_TIMEOUT_SECONDS=600`이며,
web의 `/admin/backups*` proxy는 `BACKUP_PROXY_TIMEOUT_MS=900000`으로 설정한다. 업로드는
시간 제한을 넘기면 임시 파일을 삭제하고 실패하며, 임시 파일은 다음 백업 목록/생성/업로드 시에도 정리한다.

수집 scheduler가 켜진 운영 profile에서는 복원을 `409`로 거부한다. 복원은 현재 PostgreSQL을 덮어쓰므로,
5분 freshness를 깨뜨리지 않도록 scheduler를 중지한 명시적 유지보수 창에서만 실행한다.

## 운영 주의

이 API에는 별도 인증이 없다. 사용자가 요청한 운영 범위에 맞춘 내부 도구이므로 14번 서버의 LAN/게이트웨이 접근 제어 뒤에서만 노출한다. 복원은 현재 데이터를 덮어쓰므로 UI 확인창과 자동 사전 백업을 둔다. 복원 후 backend를 재기동하거나 화면을 새로고침해 analytics cache와 현재 상태를 재확인한다.

## 수동 확인

```bash
docker compose --project-name parking-radar --env-file .env.server14 exec backend ls -lh /app/backups
docker compose --project-name parking-radar --env-file .env.server14 exec backend pg_dump --version
```

백업 파일은 Git에 넣지 않는다. `backups/`는 호스트 bind mount이며 `.gitignore`에서 제외한다.
