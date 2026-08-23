# resume.md — 현재 인수인계

## 현재 상태

- 기준일: 2026-08-23
- 작업 브랜치: `codex/krairport-parking-migration` (origin/main 기준, PR 미생성)
- `digitie/parking-radar` PR [#1](https://github.com/digitie/parking-radar/pull/1)
  (postgres/server14 마이그레이션), PR [#2](https://github.com/digitie/parking-radar/pull/2)
  (kor-travel-map 문서 구조 이식 + ADR-004) 모두 **MERGED** 상태다(`origin/main` = `1d78e1b`).
- `T-030`(주차 현황·주차요금 → `python-krairport-api`)을 이 브랜치에서 구현 완료했다:
  `backend/pyproject.toml`/`Dockerfile` 의존성 배선, `collection.py`의
  `KrairportPublicDataClient`, `parsers.py` 입력 형태 확장, sample 데이터 단순화. WSL 1차
  `72 passed`, Docker 2차 `69 passed`(`test_cutover_guards.py` 3개는 무관한 사전 버그로
  제외 — `T-031`), `alembic check` 통과, frontend Docker `48 passed`. **아직 커밋하지
  않았다** — working tree 변경 상태.
- 운영 원본: `digitie@192.168.1.13:/home/digitie/apps/parking-radar`
- 새 운영 대상: `digitie@192.168.1.14`
- 14번 공개 포트 (T-032 이후, 2026-08-23): API `14001`, web `14002`, DB `14000`(loopback
  전용, 별도 컨테이너). live E2E 기준 URL: `https://pr.digitie.mywire.org`
- 14번 외부 API URL: `https://pr-api.digitie.mywire.org`

## 다음 한 작업

`codex/krairport-parking-migration`의 변경사항을 커밋 → push → Draft PR → hostile review
(James/Popper) → 머지한다. 머지 후 다음은 `T-029`(KAC ODCloud 비행편 지원을
`python-krairport-api`에 먼저 추가한 뒤 `flight_status.py` 전환)와 `T-031`
(`test_cutover_guards.py` Docker 경로 버그) 중 하나를 고른다.

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
- 현재 14번 runtime은 배포 Git full SHA와 `/health`의 release SHA가 일치하며 API/web 포트 계약
  (`14000`/`14001`)을 지킨다. 마지막 기능 코드 candidate `aefaf8c5bc2efc4604135529f85c51b2c8236839`와
  docs-only release에서 exact live E2E는 5개 테스트 모두 통과했다.

## 남은 운영 확인

- exact SQLite dump는 사용하지 않았으므로 raw response와 기존 collection run ID 보존이 필요하면
  별도 운영 export를 제공한다.
- 백업/복원은 별도 app auth가 없으므로 `pr.digitie.mywire.org` gateway/private ACL의 외부
  노출 제한을 유지한다.
- scheduler 실행 중 restore는 `409` 유지보수 창 응답으로 제한하고, server14 scheduler는
  `300/180/120` 계약으로 운영한다. 마지막 기능 release의 strict gate는 `7/7` 통과했다.
