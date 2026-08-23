# resume.md — 현재 인수인계

## 현재 상태

- 기준일: 2026-08-23
- 작업 브랜치: `main` (로컬/원격 모두 `9961579`).
- `digitie/parking-radar` PR #2~#10 모두 **MERGED** 상태다. 이 세션에서 다룬 마지막
  PR은 [#10](https://github.com/digitie/parking-radar/pull/10)(`T-029`)이다.
- `docs/tasks.md`의 진행 중 백로그가 비어 있다 — `T-029`/`T-031`을 포함해 이 세션에서
  파악한 항목은 모두 완료·머지·live 검증까지 끝났다.
- PR #3(`T-030`) 검증 중 발견한 두 버그(krairport의 KAC HTTPS 스킴 버그,
  `parse_kac_fee`의 SCREAMING_SNAKE_CASE 필드명 버그)는 모두 수정·머지 완료.
  `docs/adr/004-*.md` "후속" 참고.
- PR #4(`T-032`)로 PostgreSQL이 `docker-compose.db.yml` 별도 스택으로 분리됐고, n150
  운영 데이터도 기존 named volume을 재사용해 실제로 마이그레이션 완료했다(백업 확보 후
  무손실 전환, `parking_snapshots` 56,039건 확인).
- PR #5(ADR-005)로 `/health`를 제외한 모든 백엔드 라우트가 `/v1` prefix로 이동했다
  (무-호환 clean-cut). RFC7807 에러 포맷 통일, `scripts/export_openapi.py` →
  `docs/openapi.json` 기계 정본 추가. hostile review(Popper)에서 발견한
  `RequestValidationError` RFC7807 미적용, `scripts/verify_cutover.py`의 target(n150)
  호출 버저닝 누락도 같은 PR에서 수정했다. `{data, meta}` envelope는 명시적으로 범위
  밖(ADR-005 "후속"). n150 배포·live 검증 완료(`release_sha=03bd6f3`).
- PR #7(ADR-006)로 공휴일 수집을 `python-kasi-api`(`kasi`)로 옮겼다. hostile review
  P0/P1 없음. n150 배포·live 검증 완료(`release_sha=986d64e`,
  `GET /v1/holidays/summary` 실 KASI 데이터 확인).
- PR #9(`T-031`)로 `test_cutover_guards.py`가 Docker 컨테이너 안에서
  `ModuleNotFoundError`로 깨지던 사전 버그를 고쳤다(`sys.path` 계산이 로컬 repo-root
  깊이를 하드코딩한 것이 원인). WSL/Docker 양쪽 `82 passed`.
- PR #10(`T-029`)으로 ADR-004의 마지막 범위(비행편)를 완료했다. KAC ODCloud
  (`FlightStatusListDTL`)는 krairport에 없던 endpoint라, 형제 저장소
  `python-krairport-api`에 `KacClient.flight_status_detail_raw_items()`를 새로
  추가했다(별도 PR [python-krairport-api#7](https://github.com/digitie/python-krairport-api/pull/7),
  커밋 `cbe4d13`). IIAC는 krairport의 기존 `iiac_raw_items`가 endpoint와 정확히
  일치해 라이브러리 수정 없이 전환했다. hostile review(Popper)가 지적한 rate-limit
  backoff 비대칭(비행편은 페이지 조회마다 즉시 호출되므로 5분 주기 수집보다 위험도가
  높음)을 반영해 `KrairportRateLimitError`를 `status: "rate_limited"`로 구분하고
  `upstream_rate_limit_backoff_seconds` 동안 캐시하도록 고쳤다. n150 배포·live 검증
  완료(`release_sha=9961579`, KAC(`GMP`)/IIAC(`ICN`) 양쪽 `/v1/flights/status`가 실
  서비스 키로 `status=success` 반환).
- 운영 원본(레거시, 재배포 금지): `digitie@192.168.1.13:/home/digitie/apps/parking-radar`
  — 여전히 구 unversioned API를 서비스한다. `scripts/odroid-status.ps1`은 의도적으로
  버저닝하지 않았다.
- 운영 대상: `digitie@192.168.1.14`
- n150 공개 포트 (T-032 이후): API `14001`, web `14002`, DB `14000`(loopback 전용, 별도
  컨테이너). live E2E 기준 URL: `https://pr.digitie.mywire.org`
- n150 외부 API URL: `https://pr-api.digitie.mywire.org`
- Windows 로컬 체크아웃은 `core.autocrlf`로 CRLF 변환되므로, WSL bash에서 셸 스크립트를
  직접 실행하면(`bash scripts/foo.sh`) shebang 파싱이 깨질 수 있다 — 이 세션에서는
  `sed 's/\r$//'`로 LF 정규화한 임시 사본을 실행해 우회했다
  (`scripts/deploy-server14.sh` 배포 시 매번 재현됨, 스크립트 자체는 git상 LF로 정상
  저장돼 있음).

## 다음 한 작업

`docs/tasks.md`에 등록된 진행 중 task가 없다. 다음 작업은 사용자 지시를 기다린다.

## 확인된 사실

- 13번의 현재 서비스는 프론트 `:3000`, 백엔드 `:8000`에서 응답한다.
- 13번은 Docker를 조작하지 않고 `http://192.168.1.13:3000/api/backend` HTTP GET만 사용했다.
- 13번 수집기는 10분 주기, n150 scheduler는 configured 300초/effective 180초로 운영 중이며
  최신 strict 검증에서는 run `86`, `2026-08-22T07:21:03Z` 관측까지 성공했다.
- n150 PostgreSQL은 Alembic `0003_legacy_source_identity (head)`이고 n150은 Docker Compose로
  API `14000`, web `14001`을 제공한다. configured scheduler는 300초, effective tick은
  180초 tick과 120초 safety buffer다.
- HTTP fallback migration은 snapshots 38,946건/lot 44개 관측, reference lot 53개/legacy ID
  53개 상태로 운영되고, duplicate legacy ID는 0개다.
- 현재 n150 runtime은 배포 Git full SHA와 `/health`의 release SHA가 일치하며 API/web 포트 계약
  (`14000`/`14001`)을 지킨다. 마지막 기능 코드 candidate `aefaf8c5bc2efc4604135529f85c51b2c8236839`와
  docs-only release에서 exact live E2E는 5개 테스트 모두 통과했다.

## 남은 운영 확인

- exact SQLite dump는 사용하지 않았으므로 raw response와 기존 collection run ID 보존이 필요하면
  별도 운영 export를 제공한다.
- 백업/복원은 별도 app auth가 없으므로 `pr.digitie.mywire.org` gateway/private ACL의 외부
  노출 제한을 유지한다.
- scheduler 실행 중 restore는 `409` 유지보수 창 응답으로 제한하고, n150 scheduler는
  `300/180/120` 계약으로 운영한다. 마지막 기능 release의 strict gate는 `7/7` 통과했다.
