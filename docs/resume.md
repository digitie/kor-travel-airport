# resume.md — 현재 인수인계

## 현재 상태

- 기준일: 2026-08-23
- 작업 브랜치: `codex/docs-krairport-provider` (origin/main 기준)
- `digitie/parking-radar` PR [#1](https://github.com/digitie/parking-radar/pull/1)
  (postgres/server14 마이그레이션)은 이미 **MERGED** 상태다(`481cb78`). "다음 한 작업"으로
  더 이상 남아있지 않다.
- 2026-08-23: `origin`을 `digitie/parking-radar`(정본)로 전환하고, 구 remote는
  `airport-parking-radar`로 재명명했다(`T-028`). `kor-travel-map` 문서 구조 이식(ADR 분리,
  agent-failure-patterns/branch-protection/cross-repo-audit-checklist/hostile-review,
  dev-environment.md, test-strategy.md)과 python-krairport-api 채택 ADR-004도 같은 작업에서
  완료해 커밋 `6601fa2`로 `codex/docs-krairport-provider` 브랜치에 반영했다. Draft PR
  [#2](https://github.com/digitie/parking-radar/pull/2)로 열려 있다.
- 운영 원본: `digitie@192.168.1.13:/home/digitie/apps/parking-radar`
- 새 운영 대상: `digitie@192.168.1.14`
- 14번 공개 포트: API `14000`, web `14001`; live E2E 기준 URL:
  `https://pr.digitie.mywire.org`
- 14번 외부 API URL: `https://pr-api.digitie.mywire.org`

## 다음 한 작업

`T-029`(`docs/tasks.md`) — `python-krairport-api`를 실제로 backend 의존성에 추가하고
비행편/주차현황/주차요금 수집을 그 client로 전환한다. 착수 전 조사 결과: KAC/IIAC 주차현황과
KAC 주차요금은 krairport의 기존 typed API로 그대로 대체 가능하고, IIAC 주차요금은
`iiac_raw_items()` 범용 escape hatch로 커버된다(krairport 자체 수정 불필요). 반면 KAC
비행편(`15113771`, ODCloud `FlightStatusListDTL`)은 krairport가 현재 지원하지 않는 별도
provider 도메인이라 krairport 쪽에 새 코드가 필요하다 — 이 부분은 별도 후속으로 분리한다.
krairport로 전환하면 `RawApiResponse.body_text`가 더 이상 업스트림 원문 그대로가 아니라
krairport가 파싱한 결과의 JSON 직렬화로 바뀐다는 점을 ADR-004/T-029에 명시해야 한다.

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
