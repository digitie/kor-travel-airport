# tasks-done.md — 완료 작업 아카이브

완료한 task의 식별자, 핵심 변경, 검증 명령과 시각을 역시간순으로 보관한다.

## 2026-09-06 (T-033)

### `T-033` — shadcn/ui 기반 도입

- shadcn/ui 전환 + 과거 자료 조회 + Hallmark 재감사/재설계 initiative의 첫 단계
  (계획 `C:\Users\digit\.claude\plans\iridescent-finding-parasol.md`, 하위 task
  T-034~T-038은 `docs/tasks.md` 진행 중).
- `npx skills add shadcn/ui`로 스킬 설치 후 `npx shadcn@latest init --defaults`
  (Tailwind v4 + Base UI, nova style)로 `frontend/`를 초기화했다. 컴포넌트 JSX는
  전혀 바꾸지 않았다 — 순수 빌드 도구 배선.
- shadcn init이 자동으로 저지른 세 가지를 감지·수정: (1) 프로젝트가 이미 쓰던
  `--muted`/`--accent`/`--radius`를 자체 기본값으로 덮어쓴 것을 소스 토큰으로
  재배선, (2) `next/font/google` Geist 주입으로 Pretendard 한글 폰트 스택이
  깨질 뻔한 것을 되돌림, (3) Next.js 16이 자동 생성한 `frontend/AGENTS.md`/
  `CLAUDE.md`를 `agentRules: false`로 차단(저장소는 루트에만 이 파일들을 둠).
  Tailwind v4 CSS 값은 `frontend/src/app/tokens.css`의 기존 oklch 값에서 파생했다.
- hostile review(James/Popper): James의 P0(Tailwind Preflight가 h1~h6
  font-weight/size를 inherit로 리셋해 헤딩 굵기·크기 소실 — 브라우저 재현 확인)를
  h1 bold/h2 1.5em·700/h3 1.17em·700 명시 복원으로 수정. Popper의 P1(Tailwind v4
  네이티브 바이너리의 n150 Alpine/musl 호환성 미검증)은 WSL Docker로
  `frontend/Dockerfile` 직접 빌드 성공으로 해소.
- PR [#18](https://github.com/digitie/kor-travel-airport/pull/18) squash-merge
  (`67e9199`), n150 배포·release_sha 일치·live E2E `5 passed`(320/375/414/768px
  무-오버플로 포함) 확인 완료.

## 2026-08-23 (T-029)

### `T-029` — `flight_status.py`를 `python-krairport-api`(krairport) client로 전환

- [ADR-004](</F:/dev/kor-travel-airport/docs/adr/004-krairport-provider-library.md>)의 마지막 남은
  범위(비행편)를 완료했다. `LiveFlightStatusClient`를 `KrairportFlightStatusClient`로
  교체했다.
- KAC ODCloud(`FlightStatusListDTL`)는 krairport의 다른 KAC 서비스(`openapi.airport.co.kr`)와
  다른 호스트(`api.odcloud.kr`)를 쓰는 별도 provider라 기존 `kac_raw_items`/
  `departures()`/`arrivals()`로는 닿지 않았다 — `python-krairport-api`에
  `KacClient.flight_status_detail_raw_items()`(sync/async)를 새로 추가하고
  `KrairportClient`/`AsyncKrairportClient` facade에
  `kac_flight_status_detail_raw_items()`로 노출했다(`python-krairport-api` PR
  [#7](https://github.com/digitie/python-krairport-api/pull/7), 커밋 `cbe4d13`). 이
  라이브러리 자체 테스트 91 passed(신규 3개 포함).
- IIAC 비행편은 krairport의 기존 `iiac_raw_items("StatusOfPassengerFlightsDeOdp",
  "getPassengerDeparturesDeOdp"/"getPassengerArrivalsDeOdp", ...)`가 endpoint와 정확히
  일치해 krairport 쪽 수정 없이 바로 전환했다.
- parking-radar 쪽: `parse_incheon_flight_status_json`에 krairport의 사전 추출된 raw item
  list를 받는 `_incheon_flight_section_items` 분기를 추가했다.
  `parse_kac_flight_detail_json`은 이미 `{"data": [...]}` 형태를 파싱하므로 변경이 필요
  없었다. 죽은 코드(한 번도 호출되지 않던 `_fetch_legacy_kac_status`, httpx 직접 호출
  전용이던 `_raise_for_upstream_status`/`MAX_UPSTREAM_ERROR_BODY_LENGTH`)도 함께 제거했다.
- `/v1/flights/status` 응답 스키마는 변경하지 않았다 — 파서 함수의 출력 형태가 그대로다.
- WSL 1차 `pytest 86 passed`(신규 4개 포함).

## 2026-08-23 (T-031)

### `T-031` — Docker 컨테이너에서 `test_cutover_guards.py` import 경로가 깨지는 사전 존재 버그 수정

- `T-030`(krairport 주차 마이그레이션) 검증 중 `docker compose run --rm --no-deps backend
  pytest -q`에서 발견한 뒤 `--ignore`로 우회하고 넘어갔던 버그를 실제로 고쳤다.
- 원인: `sys.path.insert(0, str(Path(__file__).parents[2] / "scripts"))`가 로컬 디렉터리
  깊이(`parking-radar/backend/tests/...` → `parents[2]` = 레포 루트)를 하드코딩하고
  있었다. Docker 이미지 안에서는 `Dockerfile`의 `COPY backend /app`으로 `backend/`가
  통째로 `/app`으로 flatten돼 `tests/`가 한 단계만 아래(`/app/tests/`)에 있어,
  `parents[2]`가 `/`(파일시스템 루트)를 가리키게 되고 `/scripts`(존재하지 않음)를
  찾다가 `ModuleNotFoundError: No module named 'observe_cutover'`로 깨졌다.
- 고친 방법: `parents[1]`(Docker)과 `parents[2]`(로컬) 둘 다 시도해 실제로 존재하는
  `scripts/` 디렉터리를 찾는 `_scripts_dir()` helper로 교체했다 — 디렉터리 깊이를
  하드코딩하지 않는다.
- CI의 `backend` job(`uv run pytest tests -q`, `.github/workflows/ci.yml`)은 레포 루트
  체크아웃 구조를 그대로 쓰기 때문에 `parents[2]`가 우연히 맞아떨어져 이 버그가 CI에서는
  전혀 드러나지 않았다 — Docker 2차 게이트(`docker compose run --rm --no-deps backend
  pytest`)에서만 재현됐다.
- WSL 1차 `pytest 82 passed`, Docker 2차(재빌드 후) `pytest 82 passed`(제외 없이 전부
  통과, 이전까지 `--ignore`로 제외하던 3개 포함).

## 2026-08-23 (ADR-006)

### 공휴일 수집을 `python-kasi-api`로 전환

- [ADR-006](</F:/dev/kor-travel-airport/docs/adr/006-kasi-provider-library.md>) 참고. 사용자
  요청으로 한국천문연구원(KASI) 특일 정보(`15012690`) 조회를 krairport(T-030, ADR-004)와
  동일한 provider 라이브러리 패턴으로 형제 라이브러리 `python-kasi-api`(`kasi`)로
  옮겼다. `KasiHolidayClient`가 `AsyncKasiClient.holidays()`를 호출하고, 반환된 각
  item의 `raw` mapping을 JSON 직렬화해 기존 `parse_holiday_response`에 그대로 넘긴다
  (`_parse_holiday_raw_items` 신규 분기). `FixtureHolidayClient`(sample 모드)는 변경
  없음.
- krairport 마이그레이션과 달리 이번에는 필드명/endpoint 불일치 같은 새 버그를 발견하지
  못했다 — 순수 provider 교체였다.
- hostile review(James/Popper) 모두 P0/P1 없음. Popper가 지적한 P2(공휴일은
  `CollectionService`처럼 별도 rate-limit backoff 스케줄링이 없다는 점)는 호출 빈도가
  훨씬 낮아(1일 캐시) 의도적 범위 선택으로 판단, ADR에 근거를 남겼다.
- WSL 1차 `pytest 82 passed`(신규 kasi 테스트 3개), Docker 2차 `pytest 79 passed`
  (`test_cutover_guards.py` 3개 제외, `T-031` 무관 사전 버그). GitHub PR
  [#7](https://github.com/digitie/parking-radar/pull/7) merge. 14번에 배포해 live
  검증 완료: `release_sha=986d64e`, `GET /v1/holidays/summary`가 실제 서비스 키로
  `source=kasi_holiday_info`, 광복절/대체공휴일 데이터를 정상 반환했다.

## 2026-08-23 (ADR-005)

### 백엔드 API를 `/v1` 버저닝 + RFC7807 에러로 정식 계약화

- [ADR-005](</F:/dev/kor-travel-airport/docs/adr/005-versioned-rest-api-contract.md>) 참고.
  `kor-travel-map` 패턴을 참조해 `/health`를 제외한 모든 라우트를 `APIRouter(prefix="/v1")`로
  이동(무-호환 clean-cut)하고, 모든 에러 응답을 RFC7807 `application/problem+json`으로
  통일했다. `scripts/export_openapi.py`로 `docs/openapi.json`을 기계 정본으로 커밋한다.
- frontend `lib/api.ts`(19개 endpoint 경로), `api/backend/[...path]/route.ts`(allowlist가
  `v1/` prefix를 요구하도록 변경), 관련 테스트 전부를 같은 PR에서 갱신했다.
- `{data, meta}` 응답 envelope, cursor pagination, 인증은 명시적으로 범위 밖으로 미뤘다
  — 23개 라우트 반환 타입 전체를 바꿔야 하는 별도 규모 작업으로 판단.
- hostile review(James=frontend, Popper=backend/ops) 2건 지적을 반영: (1) FastAPI
  `RequestValidationError`(422)가 `HTTPException` 전용 handler를 우회해 RFC7807 포맷을
  따르지 않던 것을 전용 handler 추가로 수정, (2) `scripts/verify_cutover.py`의 target(14번)
  호출이 `/v1` 없이 여전히 구 경로를 쓰고 있어 이 PR 머지 후 release-gate 스크립트가
  깨질 상황이었던 것을 target 호출에만 `/v1` prefix를 적용해 수정(source=13번은 레거시
  미버저닝 API이므로 그대로 유지). `scripts/odroid-status.ps1`은 13번 대상이라 의도적으로
  변경하지 않았다.
- WSL 1차 `pytest 79 passed`, `vitest 48 passed`, 로컬 Docker 2-stack 검증(`/v1/airports`,
  `/health`, 프록시 passthrough, RFC7807 에러 포맷) 통과. GitHub PR
  [#5](https://github.com/digitie/parking-radar/pull/5) merge, `live-e2e`는 14번 미배포로
  예상대로 실패(기존 패턴과 동일), `backend`/`frontend` CI는 통과.

## 2026-08-23 (T-032)

### `T-032` — PostgreSQL을 별도 compose 스택으로 분리 + 포트 재구성

- `kor-travel-docker-manager`의 "DB는 앱과 분리된 컨테이너/lifecycle로 운영한다" 패턴을
  단일 프로젝트 규모로 축소 적용했다. 여러 프로젝트를 한 곳에서 관리하는 중앙
  오케스트레이터 구조(network_mode: host, 프로젝트별 secret file 등)는 가져오지 않고,
  "DB는 앱 재배포와 무관한 별도 compose 파일"이라는 핵심만 가져왔다.
- `docker-compose.db.yml`(신규) — postgres 전용, 기존 named volume
  `parking-radar_parking_radar_postgres_data`를 그대로 재사용(볼륨명 고정, 새로 만들지
  않음). `docker-compose.yml`에서는 postgres 서비스를 제거하고 외부 네트워크
  `parking-radar-net`으로 통신하도록 바꿨다.
- 포트 재배치: DB `14000`(loopback 전용, 기존 `5432`에서 이동), API `14001`(기존
  `14000`), web `14002`(기존 `14001`). `scripts/deploy-server14.sh`의 `require_exact`
  값과 DB 스택 조건부 기동 로직(이미 떠 있으면 재생성하지 않음)을 갱신했다.
- 로컬에서 분리된 두 스택을 실제로 올려 backend↔postgres 통신, API(`14001`)/web(`14002`)
  응답을 확인했다.
- 운영 전환(server14): (1) `pg_dump`로 사전 백업(`/tmp/parking-radar-backup/pre-t032-migration.dump`,
  로컬 보관), (2) 기존 `docker compose stop postgres`(볼륨 유지, 컨테이너만 중지),
  (3) `.env.server14`의 포트 값 갱신, (4) 신/구 컨테이너 상태를 재확인하며 진행.
- 외부 reverse proxy(`pr.digitie.mywire.org`→web, `pr-api.digitie.mywire.org`→API)는
  사용자가 직접 갱신하기로 했다 — 새 포트(API `14001`, web `14002`)를 안내해야 한다.

### `T-030` — 주차 현황·주차요금 수집을 `python-krairport-api`로 전환

- [ADR-004](</F:/dev/kor-travel-airport/docs/adr/004-krairport-provider-library.md>) 범위를
  비행편에서 주차 현황/요금까지 확장하고, KAC/IIAC 주차현황(`15056803`/`15095047`)과 KAC
  주차요금(`15038474`)이 krairport의 기존 raw-item escape hatch로 정확히 대체됨을 소스
  코드 대조(`krairport/providers/{kac,iiac}.py`)로 확인했다. IIAC 주차요금(`15095053`)은
  krairport에 typed 지원이 없지만 같은 `iiac_raw_items` 범용 경로로 도달 가능해 krairport
  자체 수정 없이 4개 fetch 모두 전환했다.
- `backend/pyproject.toml`에 `python-krairport-api @ git+https://github.com/digitie/python-krairport-api@b8854137f26be4ae14c1693b83b425ee37c60655`
  PEP 508 direct reference로 의존성을 추가했다. 처음엔 `[tool.uv.sources]` git mapping으로
  시도했으나 Docker 빌드가 plain `pip install -e ".[dev]"`를 써서 인식하지 못해(`uv` 전용
  테이블) 실패했고, PEP 508 direct reference로 바꿔 pip/uv 양쪽에서 동작하게 고쳤다.
  `backend/Dockerfile`에 `git` 패키지를 추가했다(pip의 git+https 설치 요구사항).
- `backend/app/services/collection.py`에 `KrairportPublicDataClient`를 추가해
  `LivePublicDataClient`(직접 `httpx`)를 대체했다. krairport의 typed `ParkingFee` model은
  휴일 요금·분당 추가요금 필드가 없어서, typed model 대신 `kac_raw_items`/`iiac_raw_items`
  범용 escape hatch로 원본에 가까운 item dict를 받고 parking-radar 자체 `parsers.py` 로직은
  그대로 유지했다 — 파싱/필드 매핑 회귀 위험을 없앴다.
- `parsers.py`의 `parse_kac_parking`/`parse_kac_fee`/`parse_incheon_parking`/`parse_incheon_fee`가
  이제 문자열(XML/JSON envelope) 또는 사전 추출된 item list 양쪽을 받는다(하위 호환 유지,
  기존 파서 유닛 테스트 무변경). `FixturePublicDataClient`의 sample 데이터도 XML/JSON
  envelope 생성 대신 flat item list를 직접 JSON 직렬화하도록 단순화했다(`_build_kac_parking_xml`/
  `_build_kac_fee_xml`/`SAMPLE_INCHEON_JSON`/`SAMPLE_INCHEON_FEE_JSON` 삭제).
  `validate_source_response_body`는 krairport가 이미 검증한 JSON-array body를 만나면
  스킵하도록 갱신했다.
- **부작용**: `RawApiResponse.body_text`가 이제 업스트림 원문이 아니라 krairport가 파싱한
  item 목록의 JSON 직렬화다(krairport가 raw HTTP 텍스트를 공개 API로 안 내려줌). ADR-004에
  명시했다.
- **live smoke test로 발견·수정한 pre-existing 버그 2건** (사용자가 로컬 실제
  `DATA_GO_KR_SERVICE_KEY` 존재를 알려줘서 fixture가 아닌 실 upstream으로 검증):
  1. krairport가 KAC 전체를 `https://openapi.airport.co.kr`로 호출하고 있었는데, 이
     게이트웨이는 `http://`만 정상 동작한다(https는 요청과 무관하게 전부
     `NO OPENAPI SERVICE ERROR.`) — `python-krairport-api`
     [PR #6](https://github.com/digitie/python-krairport-api/pull/6)로 수정,
     `88d47ca`로 머지 후 parking-radar pin을 그 커밋으로 갱신했다.
  2. `parse_kac_fee`/`_kac_fee_sample_items`/`tests/fixtures/kac_fee_gmp.xml`이
     `PARKING_BASIC_ACCOUNT`류 SCREAMING_SNAKE_CASE 필드명을 기대하고 있었는데 실제 API는
     `parkingBasicAccount`류 camelCase를 반환한다 — **krairport 도입 이전부터 있던 버그이며,
     실제로는 KAC 주차요금 live 수집이 계속 빈 배열만 반환했을 가능성이 높다.** 실제
     필드명으로 파서·sample·fixture를 모두 고쳤다.
  두 수정 후 `CollectionService.collect()`를 실제 서비스키로 end-to-end 실행해 확인:
  `status=success`, `raw_response_count=6`, `snapshot_count=30`, `fee_rule_count=56`,
  `errors=[]`.
- 검증: WSL 1차 `uv run pytest tests -q` `72 passed`(krairport 수정 반영 후 재실행 포함).
  Docker 2차 `docker compose run --rm --no-deps backend pytest -q
  --ignore=tests/test_cutover_guards.py` `69 passed`(제외한 3개는 이 마이그레이션과 무관한
  사전 존재 버그 — `T-031` 참고). `alembic -c alembic.ini check`
  `No new upgrade operations detected`. `docker compose build backend`/`frontend` 성공.
  frontend Docker 테스트 `48 passed`. 실제 upstream 대상 live smoke test와 end-to-end
  collect() 실행까지 통과.
- 이번 세션에서는 `T-031`(`test_cutover_guards.py` Docker 경로 버그)을 발견했지만
  krairport 마이그레이션과 무관해 고치지 않고 별도 task로 등록했다(Surgical Changes 원칙).
- KAC 비행편(ODCloud `15113771`)은 krairport가 아직 지원하지 않아 이번 범위에서 제외했다 —
  `T-029`로 남아 있다.

### `T-028` — GitHub 정본 레포 전환 + kor-travel-map 문서 구조 이식

- 두 GitHub remote(`digitie/airport-parking-radar`, `digitie/parking-radar`) 상태를
  확인해 `digitie/parking-radar`가 정본(이미 열려 있던 Draft PR #1과 일치)임을 확인하고,
  `origin`을 `parking-radar.git`로, 구 remote를 `airport-parking-radar`로 재명명했다.
  두 레포의 `main` 히스토리가 갈라져 보였지만 `git diff --name-only`로 파일 내용이 완전히
  동일함을 확인해 별도 병합 없이 로컬 `main`을 새 `origin/main`으로 전환했다.
- `kor-travel-map`(`F:/dev/kor-travel-map`)의 문서 구조를 조사해 이 저장소에 없던 항목을
  선별 이식했다: ADR을 파일당 1개(`docs/adr/001~003-*.md`)로 분리하고 작성 규약을
  `docs/adr/README.md`에 명문화, `docs/runbooks/agent-failure-patterns.md`(반복 실수
  카탈로그), `docs/runbooks/branch-protection.md`(현재 `main`이 branch protection
  미설정임을 `gh api`로 확인 후 작성), `docs/runbooks/cross-repo-audit-checklist.md`(이번
  2-remote 상황을 재발 방지 절차로 문서화), `docs/dev-environment.md`(Windows/WSL 실행
  경계·포트 진단), `docs/test-strategy.md`(테스트 계층 책임 경계, 커버리지 미강제 현황
  명시)를 신규 작성했다. 사용자 확인 질문을 계기로, 이 저장소의 기존 적대적 리뷰 게이트
  (James/Popper, T-021)가 결과만 `journal.md`/`tasks-done.md`에 기록될 뿐 절차 문서가
  없다는 gap을 추가로 발견해 `docs/runbooks/hostile-review.md`도 T-021 실제 기록 기준으로
  작성했다. `CLAUDE.md`/`README.md`에 전부 링크를 추가했다.
- 멀티패키지 모노레포 전용 패턴(에이전트별 worktree/sandbox 브랜치, lint-imports 계층
  검사, sprint 문서군, integration-map)은 단일 서비스 구조인 이 저장소에 맞지 않아
  이식하지 않았다.
- 사용자 요청으로 `kor-travel-map`의 `CLAUDE.md`/`AGENTS.md` 본문(Codex/Antigravity
  entry 정책, 문서 언어 정책, 지시 우선순위, 행동 원칙 5종 — Think Before
  Coding/Simplicity First/Surgical Changes/Goal-Driven Execution/Practical Bias,
  작업 후 체크리스트)을 최대한 원문 그대로 `AGENTS.md`/`CLAUDE.md`에 이식했다. 식별자
  테이블·역할·외부 경계·Provider API 세부 원칙처럼 `kortravelmap` 패키지·PostGIS·
  멀티패키지 구조에 종속된 내용은 가져오지 않았다.
- `python-krairport-api`(`krairport`, `F:\dev\python-krairport-api`)를 비행편 데이터
  provider 라이브러리로 채택하기로 결정했다([ADR-004](</F:/dev/kor-travel-airport/docs/adr/004-krairport-provider-library.md>)).
  현재 `backend/app/services/flight_status.py`는 KAC/IIAC API를 `httpx`로 직접
  재구현하고 있어 이 결정과 어긋난다 — 실제 마이그레이션은 `docs/tasks.md`의 `T-029`로
  등록했고 아직 시작하지 않았다. `AGENTS.md`에 "Provider 라이브러리 사용 원칙" 절을
  추가하고 `SKILL.md` §4에 9번째 금지 항목으로 반영했다.

## 2026-08-22

### `T-027` — scheduler headroom 재조정 및 최종 검증

- `d312c98a9143e76e348295370dfd3348c5f5cef7`에서 fresh strict gate를 실행했으나 7회 중 한 샘플의
  target freshness가 `319.7s`가 되어 실패했다. 240초 tick과 외부 수집/commit 지연이 겹친 경계 문제로
  확인했다.
- 5분 threshold는 그대로 유지하고 server14 `SCHEDULER_SAFETY_BUFFER_SECONDS`를 `120`으로,
  effective tick을 `180초`로 조정했다. 배포 guard, verifier, live E2E 기대값, 운영 문서를 함께 갱신했다.
- `aefaf8c5bc2efc4604135529f85c51b2c8236839`을 14번에 배포하고 API `14000`, web `14001`,
  scheduler `300/180/120` 계약과 backup proxy `900000ms`를 확인했다.
- `EXERCISE_LIVE_BACKUP=true` exact live E2E는 실제 backup 생성 UI 포함 `5 passed (13.0s)`였고,
  fresh strict gate는 7회 모두 `failure_count=0`, `failed_samples=0`, `gate_duration_seconds=339.9`,
  `source_lots=53`, `target_lots_checked=53`으로 통과했다.
- 후속 기능 release에서는 Compose scheduler 기본값과 deploy guard를 모두 `120`으로 fail-closed 정렬하고,
  scheduler 실행 중 PostgreSQL restore를 `409`로 거부해 복원으로 5분 freshness가 깨지지 않게 했다.
  최종 기능 release strict gate는 `7/7`, `failed_samples=0`, `gate_duration_seconds=339.6`이었다.

### `T-026` — 최종 정합성·백업 안전성·라이브 검증

- runtime candidate `d312c98a9143e76e348295370dfd3348c5f5cef7`을 14번에 배포하고 API `14000`, web
  `14001`, `BACKUP_DIR=/app/backups`, 백업 proxy `900000ms`를 확인했다. 13번에는 Docker를 실행하지 않았다.
- HTTP migration과 live source가 겹친 migration 행 157건을 보호 백업 후 제거하고 analytics cache
  264건을 재계산 대상으로 비웠다. PostgreSQL lot·관측시각 중복은 `0`, history API 중복 timestamp도 `0`이다.
- backup dump password 전달, staged atomic upload, quota 사전 검사, symlink 차단, restore proxy timeout과
  migration/cache dedupe를 보완했다. 백엔드 targeted `15 passed`, 프론트 full `48 passed`, proxy `5 passed`다.
- `EXERCISE_LIVE_BACKUP=true E2E_BASE_URL=https://pr.digitie.mywire.org EXPECTED_RELEASE_SHA=d312c98...`
  로 실제 백업 생성 UI를 포함한 live E2E `5 passed`를 확인했다. fresh strict gate는 `7/7`,
- 당시 240초 scheduler의 fresh strict gate는 한 샘플에서 target freshness `319.7s`로 실패했다.
  threshold를 완화하지 않고 scheduler headroom을 T-027에서 조정한다.
- CI 기본 live E2E는 공유 server14를 변경하지 않으며, backup mutation은 명시적 환경 변수 실행으로 분리했다.

### `T-025` — Hallmark 후속 정리·리뷰 blocker 해소

- 중복 history KPI를 제거하고 요일 x 시간 히트맵 중심으로 화면을 단순화했다. 밝은 히트맵 셀과
  primary button의 명도 대비를 고정하고, 백업 파일 입력의 키보드 focus 및 목록 오류 상태를
  명시했다.
- 백업 생성은 temp dump의 파일 크기/quota를 최종 저장 전 검사하고, 복원 중 pre-restore
  backup을 pruning 보호 목록에 넣는다. verifier는 future-dated observation을 거부한다.
- server14 배포는 `14000`/`14001`, PostgreSQL loopback, live/scheduler/5분 계약을 검사하고
  rsync clean artifact로 stale 파일을 제거한다. legacy 13번 Docker 경로는 fail-closed다.
- `b7944ad`에서 backend `67 passed`, frontend `47 passed`, exact live E2E `5 passed`, strict
  gate `7/7` 및 `failed_samples=0`, GitHub Actions push/PR CI 전부 통과를 확인했다.

### `T-024` — Hallmark UI 구조 간결화

- 메인 헤더의 중복 브랜드 문구와 중복 KPI/동기화 시각을 제거하고, 공항·주차장 선택과 핵심 현재 현황을 한 흐름으로 정리했다.
- 요일/공휴일 분석에서 같은 데이터를 반복하던 상세 카드와 히트맵을 히트맵 중심으로 통합해 모바일 disclosure 수와 스크롤을 줄였다.
- 기존 분석·요금 계산·백업/복원 기능은 유지하고, frontend Vitest `47 passed`, TypeScript 검사와 production build를 통과했다.

### `T-023` — 192.168.1.14 배포·데이터 이전·운영 검증

- `192.168.1.14`에만 Docker Compose/PostgreSQL/backend/frontend를 배포했다.
- 포트는 API `14000`, web `14001`이며, PostgreSQL은 loopback `5432`로 제한했다. configured
  collection interval은 `300s`, effective scheduler tick은 `180s`(`120s` safety buffer)다.
- HTTP migration 결과: `imported_snapshots=36878`, `source_lots=53`, `failures=0`.
- delta import 후 현재 PostgreSQL `parking_snapshots=38946`, distinct snapshot lots `44`,
  parking lots `53`, legacy IDs `53`, duplicate legacy IDs `0`이며 Alembic head는
  `0003_legacy_source_identity`다.
- 7회 × 50초(총 300초) strict cutover observation: 각 `failure_count=0`, 최종 `failed_samples=0`.
- 13번에는 Docker 명령을 실행하지 않고 HTTP GET만 수행했다.

### `T-022` — exact live E2E·운영 smoke

- `E2E_BASE_URL=https://pr.digitie.mywire.org npm run test:e2e`: 5 passed.
- 14번 직접 origin `http://192.168.1.14:14001`에서도 5 passed.
- `https://pr-api.digitie.mywire.org/health`, web same-origin `/api/backend/health`, 14번 API
  health가 모두 `{"status":"ok","database":"ready","seeded":true}`를 반환했다.
- 외부 live E2E는 최종 수정 후 `5 passed (9.4s)`, 14번 직접 origin은 `5 passed (5.9s)`였다.
- 320/375/414/768px overflow와 backup/restore controls를 브라우저에서 확인했다.

### `T-021` — 적대적 전문 리뷰 에이전트 2명

- James(frontend/live UI)와 Popper(backend/PostgreSQL/ops)를 각각 독립 read-only reviewer로
  운용했다.
- Alembic lineage, source lag verifier, proxy timeout, backup pre-restore receipt, accessibility,
  stable legacy lot identity, explicit reconciliation mapping, PostgreSQL tests, 13번 Docker 금지
  guard 등 P0/P1 지적을 반영했다.
- 인증 없는 admin backup/restore는 사용자의 명시 요구라 유지하되, UI·runbook에 외부 공개 금지와
  gateway/private ACL 필요성을 명시했다.

### `T-020` — 단계별 원격 커밋·Draft PR·CI

- 원격 branch: `codex/parking-radar-postgres-migration`.
- Draft PR: [#1](https://github.com/digitie/parking-radar/pull/1).
- 주요 원격 커밋: `2b33a26`, `6b7ac89`, `2a88c09`, `c5e5b03`, `8d8a45a`, `f367db9`, `4980485`,
  `a690628`, `8f9af56`, `146573d`, `27e7b76`, `49e4a3e`.
- workflow run `32551945257`의 backend(PostgreSQL + `alembic check`), frontend, live-e2e job이
  모두 통과했다.

### `T-014` — 인증 없는 내부망용 백업/복원 UI와 API

- PostgreSQL `.dump` 생성·목록·다운로드·복원 API와 responsive UI를 구현했다.
- 복원 전 자동 backup을 응답에 포함하고, UI에 destructive operation 경고를 제공한다.
- 별도 app auth는 추가하지 않고 gateway/private network 보호를 문서화했다.

### `T-013` — 의존 라이브러리 최신화

- Python/Node lockfile과 Docker runtime을 갱신하고 CI에서 locked install, PostgreSQL Alembic,
  frontend build를 통과시켰다.

### `T-012` — 쿠키 기반 설정 기억

- 공항/주차장 선택을 `parking-radar-selection` cookie와 localStorage fallback으로 기억하고
  브라우저 테스트로 복원·변경을 검증했다.

### `T-011` — 초기 로딩·분석 API·쿼리 성능 개선

- `/dashboard/bootstrap` 단일 초기 요청, analytics viewport 지연 로딩, N+1 제거, response
  cache-control과 backend proxy connect/body timeout을 적용했다.

### `T-010` — Hallmark audit/redesign

- Hallmark 기준 audit/redesign을 반영해 dashboard hierarchy, responsive disclosure, status
  cards, charts, backup panel과 접근성 상태를 정리했다.
- live E2E에서 320/375/414/768px overflow 및 주요 control을 확인했다.

### `T-003` — 데이터 이전·5분 무손실 컷오버

- 7일 HTTP prewarm과 1일 delta import를 모두 실패 시 rollback하는 방식으로 수행했다.
- target scheduler는 configured `300s`와 effective `180s` safety-buffer tick으로, source는
  read-only 유지 상태에서 strict 5분 연속성 gate를 통과했다.
- source/target lot은 stable legacy ID로 대조하고, 양쪽 무관측 lot은 명시 allowlist 없이는
  통과하지 않는다. lot freshness, source lag, successful run gap 모두 `300s` 한도로 검사한다.

### `T-002` — Docker Compose + PostgreSQL + Alembic

- PostgreSQL 16 Compose, async SQLAlchemy, Alembic `0001_initial` → `0002_integrity_and_freshness`
  → `0003_legacy_source_identity` lineage, Postgres schema-head guard와 model/schema drift CI를
  구현했다.
- clean PostgreSQL `alembic upgrade head`, GitHub PostgreSQL CI, 14번 runtime health를 통과했다.

### `T-001` — kor-travel-map식 저장소·문서·AI 작업 구조

- `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, `.claude/agents`, `.claude/skills`, `.codex/agents`,
  `.agents/skills`를 kor-travel-map 방식으로 이식했다.
- architecture/runbooks/reports와 tasks/resume/journal 구조를 정리하고 운영 IP·도메인·포트
  규칙을 문서화했다.
