# resume.md — 현재 인수인계

## 현재 상태

- 기준일: 2026-08-22
- 작업 브랜치: `codex/parking-radar-postgres-migration`
- 현재 단계: 구현·데이터 이전·14번 배포·5분 연속성 검증 완료; 두 reviewer 재리뷰 후
  `digitie/parking-radar` PR #1 최종 merge 대기
- 운영 원본: `digitie@192.168.1.13:/home/digitie/apps/parking-radar`
- 새 운영 대상: `digitie@192.168.1.14`
- 14번 공개 포트: API `14000`, web `14001`; live E2E 기준 URL:
  `https://pr.digitie.mywire.org`
- 14번 외부 API URL: `https://pr-api.digitie.mywire.org`

## 다음 한 작업

PR [#1](https://github.com/digitie/parking-radar/pull/1)의 green CI와 exact live E2E
증적을 확인한 뒤 squash merge한다.

## 확인된 사실

- 13번의 현재 서비스는 프론트 `:3000`, 백엔드 `:8000`에서 응답한다.
- 13번은 Docker를 조작하지 않고 `http://192.168.1.13:3000/api/backend` HTTP GET만 사용했다.
- 13번 수집기는 10분 주기, 14번 scheduler는 configured 300초/effective 180초로 운영 중이며
  최신 strict 검증에서는 run `86`, `2026-08-22T07:21:03Z` 관측까지 성공했다.
- 14번 PostgreSQL은 Alembic `0003_legacy_source_identity (head)`이고 14번은 Docker Compose로
  API `14000`, web `14001`을 제공한다. configured scheduler는 300초, effective tick은
  180초 tick과 120초 safety buffer다.
- HTTP fallback migration은 snapshots 38,946건/lot 44개 관측, reference lot 53개/legacy ID
  53개 상태로 운영되고, duplicate legacy ID는 0개다.
- 현재 14번 runtime candidate는 `c06ee6d63d13e39d549003e1c37a4369d94bc381`; `/health`의 release SHA와 API/web 포트 계약
  (`14000`/`14001`)이 일치한다. exact live E2E는 5개 테스트 모두 통과했다.

## 남은 운영 확인

- exact SQLite dump는 사용하지 않았으므로 raw response와 기존 collection run ID 보존이 필요하면
  별도 운영 export를 제공한다.
- 백업/복원은 별도 app auth가 없으므로 `pr.digitie.mywire.org` gateway/private ACL의 외부
  노출 제한을 유지한다.
