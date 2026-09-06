# resume.md — 현재 인수인계

## 현재 상태

- 기준일: 2026-09-06
- 작업 브랜치: `main` (로컬/원격 모두 `b9bdf1a`).
- `digitie/kor-travel-airport`(구 `digitie/parking-radar`) PR #2~#24 모두 **MERGED**
  상태다. 이 세션에서 다룬 마지막 코드/운영 PR은
  [#24](https://github.com/digitie/kor-travel-airport/pull/24)(과거 자료 조회 기능,
  T-036)이다.
- **진행 중인 initiative**: shadcn/ui 전환 + 과거 자료 조회 기능 + Hallmark
  재감사/재설계(`docs/tasks.md` T-037~T-038, 계획
  `C:\Users\digit\.claude\plans\iridescent-finding-parasol.md`). T-033(shadcn 기반
  도입)·T-034(button/card/table/alert/confirm-dialog 치환)·T-035(라우트 기반 앱
  셸)·T-036(과거 자료 조회 기능)까지 완료·배포·live E2E 검증 끝났다. 다음은
  T-037(Hallmark audit)이다.
  - **T-036에서 새로 배운 것**: (1) 계획서에 적힌 API 대상(`/v1/parking/history`)이
    실제로 프론트에서 전혀 안 쓰이는 걸 조사로 발견했다 — task를 시작하기 전에 항상
    "이 endpoint를 실제로 누가 호출하는지" 먼저 확인할 것, 계획 문서가 최신이라고
    가정하지 말 것. (2) hostile review 지적을 무조건 수용하지 말고 재현해서 검증할
    것 — Popper의 P0(`build_time_series` 앵커 버그)는 직접 재현해 실제 버그로
    확인했지만, James가 같이 지적한 `toDateKey()` 자체의 타임존 버그 주장은 5개
    타임존으로 직접 재현 시도한 결과 사실이 아님을 확인하고 그 부분은 고치지
    않았다(반대로 James가 지적한 `disabled` 범위 비교 쪽 타임존 버그는 진짜였다 —
    같은 리뷰 안에서도 finding별로 따로 검증해야 한다). (3) 상대(`days`) 조회용으로
    설계된 시계열 버킷 함수(`build_time_series`)를 명시적 날짜범위 조회에 재사용할
    때는 "버킷 배치 기준점"이 암묵적으로 "최신 관측 시각"에 고정돼 있는지부터
    확인할 것 — 수집 공백이 있으면 조용히 잘못된 기간의 데이터를 반환할 수 있다.
    (4) react-day-picker(mode="range")는 클릭 1번으로 `{from, to}`를 모두 채운다
    (같은 날짜로) — "선택 완료 시 자동 닫기" 같은 로직을 짤 때 `from !== to`까지
    확인하지 않으면 첫 클릭만으로 팝오버가 닫혀버린다(실제로 이 버그를 만들었다가
    되돌렸다). 또한 react-day-picker는 선택이 바뀔 때마다 day-grid DOM 노드를
    리마운트하므로, 첫 클릭 전에 캡처해둔 두 번째 버튼 참조는 첫 클릭 후 detached된다
    — 테스트에서 두 번째 요소는 항상 재조회해야 한다.
  - **T-034에서 `<select>`/`ResponsiveSection`의 `<details>`/daily-flight-overlay의
    토글·체크박스는 의도적으로 안 건드렸다** — 기존 테스트가 native DOM 구조
    (`getByDisplayValue`, `<summary>` 클릭+`open` 속성, `aria-pressed`)에 의존해서다.
    T-035에서 라우팅이 실제로 바뀌었고 `ResponsiveSection`/`mobile-disclosure`
    패턴 자체가 없어졌지만(각 라우트가 자기 콘텐츠만 보여주므로 접이식 섹션이 불필요),
    `<select>`는 여전히 native로 남아 있다(AppShell의 공항/주차장 선택) — 그대로 유효한
    판단이다.
  - **로컬 검증 시 반드시 `npx tsc -p tsconfig.test.json --noEmit`도 같이 돌릴 것**
    (기본 `tsc --noEmit`은 `tests/`를 제외해서 안 잡힘) — T-034에서 이걸 놓쳐 CI에서
    한 번 걸렸다(`frontend` job이 정확히 이 명령을 실행함).
  - shadcn CLI(`init`/`add`)가 `globals.css`/`layout.tsx`를 자동 편집할 수 있으니
    (T-033에서 겪음: 기존 `--muted`/`--accent`/`--radius` 덮어쓰기, Geist 폰트 주입,
    Tailwind Preflight의 헤딩 bold 제거) 새 컴포넌트 추가 때마다 diff를 재확인할 것.
  - **T-035에서 새로 배운 것**: (1) 데스크톱/모바일을 CSS-only 동시 렌더링(`hidden
    lg:block`/`lg:hidden`)으로 바꾸면 RTL 테스트의 singular 쿼리(`getByRole`/
    `findByText`)가 "여러 개 찾음"으로 깨진다 — `getAllBy*`/`findAllBy*`로 바꾸거나
    `within()`으로 특정 nav를 스코프해야 한다. (2) 이 저장소의 `live-e2e` CI job은
    PR별 preview가 아니라 **실제 n150 운영 배포**(`pr.digitie.mywire.org`)를 대상으로
    돈다 — 새 라우트를 추가하는 PR은 머지 전 CI에서 항상 404로 실패한다(PR #18/#20/#22
    전부 동일 패턴, backend/frontend만 통과하면 머지 진행). (3) live E2E의
    `collector-status.last_run.status`를 `"success"`로 단언하는 기존 테스트는 실제
    운영 스케줄러가 `success`/`partial_success`를 주기적으로 오가서 실패할 수 있다 —
    코드 문제가 아니라 실시간 외부 API(KAC/인천) 특성이다. 보통 다음 스케줄러 사이클
    (3분 이내)에 `success`로 돌아오지만, 2026-09-06 재검증 때는 13분·5사이클 연속
    `partial_success`가 관측된 적도 있다(`raw_response_count`는 3으로 정상 — 소스
    자체는 다 응답하지만 그 중 일부 lot이 간헐적으로 실패). 여러 번 재시도해도 계속
    실패하면 코드 회귀가 아니라 실시간 데이터 상태이니 이 단언을 느슨하게(예:
    `["success","partial_success"]`에 포함되는지) 바꾸는 걸 별도 task로 고려할 만하다
    — 지금은 손대지 않았다. (4) **hydration 타이밍 레이스**: 클라이언트 라우트 전환
    직후 곧바로 다른 요소를 클릭하면(예: 탭 전환 직후 "더보기" 클릭) 로컬의 빠른
    연결에서는 안 드러나다가 CI 러너처럼 지연이 큰 환경에서만 클릭이 조용히
    무시되는 경우가 있다 — Chrome DevTools Protocol
    (`context.newCDPSession(page)` + `Network.emulateNetworkConditions`)로 실제
    네트워크를 로컬에서 스로틀링해 재현할 수 있다. 이런 클릭은
    `expect(async () => { await el.click(); await expect(result).toBe(...); }).toPass()`
    로 감싸 "효과가 실제로 나타날 때까지 클릭 자체를 재시도"하게 만들어야 한다(단순
    `.click()` 뒤 단언만 재시도하는 것으로는 해결 안 됨 — 클릭 자체가 무효였으므로).
- 저장소 식별자가 `parking-radar` → `kor-travel-airport`로 개명됐다(PR
  [#15](https://github.com/digitie/kor-travel-airport/pull/15), ADR-007). 배포되는
  웹앱 브랜드/백업 파일명/쿠키 키는 계속 `parking-radar`다 — `CLAUDE.md` §1 참고.
  n150 앱 디렉터리도 `/home/digitie/apps/kor-travel-airport`로 이미 이동 완료됐고,
  이 세션에서 n150 컨테이너 실사(`docker compose ps`)로 재확인했다.
- n150 SSH 접근: 이 저장소를 여는 Windows 로컬 세션(Git Bash)에는 n150용 SSH 키가
  등록돼 있지 않다. **WSL(`wsl.exe -e bash -lc '...'`)에는 `digitie@192.168.1.14`
  접근이 이미 되어 있으므로, `scripts/deploy-server14.sh`를 포함한 모든 n150 SSH
  작업은 WSL을 경유해서 실행한다.**
- `docs/tasks.md`의 진행 중 백로그: `T-037`~`T-038`(Hallmark audit → redesign, 위
  initiative 참고). `T-029`/`T-031` 등 이전 세션 항목은 모두 완료·머지·live 검증까지
  끝나 있다.
- 운영 호스트 `192.168.1.14`의 별칭을 "server14"/"14번"에서 "n150"으로 통일했다(PR
  [#12](https://github.com/digitie/parking-radar/pull/12)). IP·실제 파일명은 그대로다.
- n150에 `vm.swappiness=10`을 영구 적용했다(`/etc/sysctl.d/99-parking-radar-swappiness.conf`).
  4코어에 load average 30대, swap 거의 꽉 참, 컨테이너 42개(대부분 다른 프로젝트) 상태였고,
  parking-radar 자체 문제가 아니라 호스트 공유 용량 초과로 판단했다. 근본 해결(코어
  증설/다른 프로젝트와 용량 조정)은 여전히 미해결.
- `scripts/n150-backup-cron.sh`를 n150의 crontab에 등록해(3일마다 03:00 KST) PostgreSQL
  dump 자동 생성을 활성화했다. dry-run으로 실제 백업 생성 확인 완료.
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
- (해결됨, PR #15/#16) 예전에는 Windows 로컬 체크아웃의 `core.autocrlf`가 배포 스크립트를
  CRLF로 깨뜨려 매 배포마다 `sed 's/\r$//'`로 우회해야 했고, git이 두 스크립트를
  100644(non-executable)로 추적해 재배포 때마다 실행 권한이 초기화되는 문제도 있었다.
  PR #15가 `.gitattributes`(`*.sh eol=lf`)를, PR #16이 파일모드(100755)를 고쳐 지금은
  `scripts/deploy-server14.sh`/`scripts/n150-backup-cron.sh` 모두 추가 우회 없이
  그대로 실행된다 — 2026-09-06 세션에서 n150 재배포 후 `stat -c '%a'`로 `775` 확인,
  `n150-backup-cron.sh` 직접 실행으로 exit `0` + 실제 dump 생성까지 재검증했다.

## 다음 한 작업

`T-037` — Hallmark audit. `T-033`~`T-036`으로 완료된 전체 결과물(shadcn 기반 도입,
컴포넌트 치환, 라우트 기반 앱 셸, 과거 자료 조회 date picker)에 `hallmark audit`을
read-only로 실행해 critical/major/minor 펀치리스트를 만든다. 이 단계는 코드를 고치지
않는다 — 다음 `T-038`(redesign)이 critical/major를 반영하고, minor는 반영하거나
`docs/journal.md`에 근거를 남긴다. 완료 조건은 `docs/tasks.md` T-037/T-038 참고.

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
  (`14001`/`14002`)을 지킨다. 2026-09-06 기준 `release_sha=b9bdf1a9c6832217922934e1f8a0128a3bdf339f`
  (=`main` HEAD, PR #24 squash-merge 커밋, T-036)이고, 외부 게이트웨이(`pr-api`/`pr.digitie.mywire.org`)
  양쪽에서 이 값과 정상 응답을 재확인했다(live E2E 15개 중 14개 PASS, 나머지 1개는
  기존 `collector-status` 실시간 플레이크). 배포 직후 `pr-api`가 약 2분간 504/timeout을
  반환한 적이 있었는데 n150 로컬(`127.0.0.1:14001`/`14002`, SSH로 직접 확인)은 그 순간에도
  두 컨테이너 모두 `healthy`였다 — 배포 문제가 아니라 외부 게이트웨이 쪽 일시 장애였고
  자연 복구됐다. 외부 게이트웨이가 응답하지 않을 때는 항상 먼저 n150에 SSH로 직접
  접속해 로컬 포트(`14001`/`14002`)를 확인해 "배포가 실패했는지" vs "게이트웨이만
  문제인지"를 구분할 것.

## 남은 운영 확인

- exact SQLite dump는 사용하지 않았으므로 raw response와 기존 collection run ID 보존이 필요하면
  별도 운영 export를 제공한다.
- 백업/복원은 별도 app auth가 없으므로 `pr.digitie.mywire.org` gateway/private ACL의 외부
  노출 제한을 유지한다.
- scheduler 실행 중 restore는 `409` 유지보수 창 응답으로 제한하고, n150 scheduler는
  `300/180/120` 계약으로 운영한다. 마지막 기능 release의 strict gate는 `7/7` 통과했다.
