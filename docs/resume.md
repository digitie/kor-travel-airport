# resume.md — 현재 인수인계

## 현재 상태

- 기준일: 2026-08-23
- 작업 브랜치: `main` (로컬/원격 모두 `d16b5b2`).
- `digitie/parking-radar` PR [#2](https://github.com/digitie/parking-radar/pull/2)
  (kor-travel-map 문서 구조 이식 + ADR-004), PR [#3](https://github.com/digitie/parking-radar/pull/3)
  (`T-030`: 주차 현황·주차요금 → `python-krairport-api`), PR
  [#4](https://github.com/digitie/parking-radar/pull/4) (`T-032`: PostgreSQL 별도 컨테이너
  분리 + 포트 재배치), PR [#5](https://github.com/digitie/parking-radar/pull/5) (ADR-005:
  `/v1` API 버저닝 + RFC7807 에러 + `docs/openapi.json`) 모두 **MERGED** 상태다.
- PR #3 검증 중 발견한 두 버그(krairport의 KAC HTTPS 스킴 버그, `parse_kac_fee`의
  SCREAMING_SNAKE_CASE 필드명 버그)는 모두 수정·머지 완료. `docs/adr/004-*.md` "후속" 참고.
- PR #4로 PostgreSQL이 `docker-compose.db.yml` 별도 스택으로 분리됐고, 14번 운영 데이터도
  기존 named volume을 재사용해 실제로 마이그레이션 완료했다(백업 확보 후 무손실 전환,
  `parking_snapshots` 56,039건 확인).
- PR #5로 `/health`를 제외한 모든 백엔드 라우트가 `/v1` prefix로 이동했다(무-호환
  clean-cut). RFC7807 에러 포맷 통일, `scripts/export_openapi.py` → `docs/openapi.json`
  기계 정본 추가. hostile review(Popper)에서 발견한 `RequestValidationError` RFC7807
  미적용, `scripts/verify_cutover.py`의 target(14번) 호출 버저닝 누락도 같은 PR에서
  수정했다. `{data, meta}` envelope는 명시적으로 범위 밖(ADR-005 "후속").
- 운영 원본(레거시, 재배포 금지): `digitie@192.168.1.13:/home/digitie/apps/parking-radar`
  — 여전히 구 unversioned API를 서비스한다. `scripts/odroid-status.ps1`은 의도적으로
  버저닝하지 않았다.
- 운영 대상: `digitie@192.168.1.14`
- 14번 공개 포트 (T-032 이후): API `14001`, web `14002`, DB `14000`(loopback 전용, 별도
  컨테이너). live E2E 기준 URL: `https://pr.digitie.mywire.org`
- 14번 외부 API URL: `https://pr-api.digitie.mywire.org`
- PR #5는 2026-08-23에 14번에 배포해 live 검증까지 완료했다(`release_sha`=`03bd6f3`).
  `/health`, `/v1/airports`, `/v1/parking/current`, `/v1/admin/collector-status` 모두
  정상 응답했고, `RequestValidationError`(422)가 `application/problem+json`으로
  내려오는 것도 실제로 확인했다(hostile review에서 Popper가 지적한 지점). 외부 도메인
  `pr-api.digitie.mywire.org`/`pr.digitie.mywire.org`도 같은 `release_sha`로 응답해
  reverse proxy 추가 변경은 필요 없었다.
- 공휴일 수집을 `python-kasi-api`(`kasi`)로 옮기는 작업(ADR-006)을 PR
  [#7](https://github.com/digitie/parking-radar/pull/7)로 머지했다(`origin/main` =
  `986d64e`). hostile review(James/Popper) 모두 P0/P1 없음, P2(rate-limit backoff 비대칭)만
  ADR에 기록. 14번에 배포해 live 검증 완료: `release_sha=986d64e`,
  `GET /v1/holidays/summary`가 실제 KASI 데이터(`source=kasi_holiday_info`, 광복절/대체공휴일)를
  정상 반환했다.

## 다음 한 작업

`T-029`(KAC ODCloud 비행편 지원을 `python-krairport-api`에 먼저 추가한 뒤
`flight_status.py` 전환)와 `T-031`(`test_cutover_guards.py` Docker 경로 버그) 중 하나를
고른다.

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
