# journal.md — 작업 일지

## 2026-08-23

- GitHub remote가 `origin`(`airport-parking-radar`)과 `parking-radar` 2개로 갈라져 있던
  것을 발견했다. `git diff --name-only`로 두 `main` tip의 파일 내용이 완전히 동일함을
  확인한 뒤(한쪽이 다른 쪽을 squash merge한 결과), `origin`을 `parking-radar.git`로,
  구 remote를 `airport-parking-radar`로 재명명했다. 재발 방지 절차는
  `docs/runbooks/cross-repo-audit-checklist.md`에 남겼다.
- `parking-radar` main(`gh api .../branches/main/protection`)에 branch protection이
  전혀 설정되어 있지 않음을 확인했다(`404 Branch not protected`). 실제 설정값은
  `docs/runbooks/branch-protection.md`에 남겼고, 아직 GitHub 설정 자체는 적용하지 않았다 —
  다음에 레포 admin 권한으로 직접 적용해야 한다.
- `kor-travel-map`(`F:/dev/kor-travel-map`)의 문서 구조를 조사해 이 저장소에 없던
  구조/내용을 선별 이식했다(`T-028`, 상세는 `docs/tasks-done.md` 참고). 멀티패키지 모노레포
  전용 패턴(에이전트별 worktree/sandbox 브랜치, codegraph 게이트, sprint 문서군)은 단일
  서비스 구조에 맞지 않아 가져오지 않았다.
- PR [#2](https://github.com/digitie/parking-radar/pull/2)(문서 전용)를 hostile
  review(James/Popper 서브에이전트, P1 3건·P2 2건 수정) 후 squash merge했다.
- `T-030`: 주차 현황·주차요금 수집을 `python-krairport-api`로 전환했다. 실제 소스를 대조한
  결과 KAC/IIAC 주차현황과 KAC 주차요금은 krairport의 raw-item escape hatch로 그대로
  대체됐고(엔드포인트 완전 일치 확인), IIAC 주차요금도 같은 범용 경로로 커버돼 krairport
  자체 수정은 필요 없었다. Docker 빌드가 `[tool.uv.sources]`를 인식하지 못해(plain pip
  사용) PEP 508 direct git reference로 바꾸고 `Dockerfile`에 `git`을 추가했다. WSL
  1차 `72 passed`, Docker 2차 `69 passed`(`test_cutover_guards.py` 제외, 무관한
  사전 존재 버그 — `T-031`로 등록). KAC 비행편(ODCloud)은 krairport 미지원이라
  `T-029`로 남겨뒀다.

## 2026-08-22

- 최종 runtime은 배포한 Git full SHA와 14번 `/health.release_sha`가 일치하는 상태다. 기능 코드
  candidate `aefaf8c5bc2efc4604135529f85c51b2c8236839`와 docs-only release에서도
  `https://pr-api.digitie.mywire.org`, `https://pr.digitie.mywire.org/api/backend/health`가
  `database=ready`를 반환했고, API/web 포트는 각각 `14000`/`14001`이다.
- 14번 PostgreSQL에서 보호 백업을 만든 뒤 `migration_http`와 live source가 같은 lot·관측시각을
  가진 157행을 제거하고 analytics cache 264행을 무효화했다. 이후 DB 중복과 history API 중복
  timestamp는 모두 `0`이었다.
- 백업 UI는 `EXERCISE_LIVE_BACKUP=true`를 지정한 exact live E2E에서 실제 dump 생성까지 수행해
  `5 passed`했다. 기본 CI는 공유 운영 DB를 변경하지 않도록 backup mutation을 실행하지 않는다.
- d312c98의 preflight strict gate에서 한 샘플이 `319.7s`가 된 원인을 확인한 뒤 5분 threshold는
  유지하고 server14 safety buffer를 120초로 늘려 effective tick을 180초로 조정했다.
- aefaf8c runtime의 exact live E2E는 실제 backup 생성 UI를 포함해 `5 passed (13.0s)`였고,
  fresh strict gate는 50초 간격 7회 모두 `failure_count=0`, `failed_samples=0`,
  `gate_duration_seconds=339.9`, `source_lots=53`, `target_lots_checked=53`으로 통과했다.
- frontend full `48 passed`, backend full `71 passed`, proxy `5 passed`와 production build를
  확인했다.
- 이후 scheduler safety 기본값/배포 guard를 fail-closed로 맞추고, scheduler 실행 중 restore를 `409`
  유지보수 창으로 제한했다. 해당 최종 기능 release의 fresh strict gate도 7회 모두 통과해
  `failed_samples=0`, `gate_duration_seconds=339.6`, `source_lots=53`, `target_lots_checked=53`이었다.

- 사용자 요청으로 SQLite 기반 운영 앱을 PostgreSQL/Docker 기반으로 전환하는 작업을 시작했다.
- `kor-travel-map`의 `docs/tasks.md`, `resume.md`, `tasks-done.md`, `tasks-rule.md` 방식과
  `AGENTS.md`/`CLAUDE.md`/`SKILL.md`/AI agent·skill 구조를 기준으로 삼았다.
- 192.168.1.13은 Docker 소켓이 `root:docker`이고 `digitie`가 해당 그룹에 없어 Docker
  조작을 하지 않기로 했다. 192.168.1.14는 Docker Compose와 Docker 접근이 가능하다.
- `kor-travel-map` 방식의 AI 작업 문서와 docs backlog 구조를 이식했다. `AGENTS.md`,
  `CLAUDE.md`, `SKILL.md`, `.claude`, `.codex`, `.agents` 경로를 포함한다.
- PostgreSQL 16/Alembic clean upgrade와 14번 runtime을 확인했다. remote status는
  Alembic `0003_legacy_source_identity (head)`, API `14000`, web `14001`, configured scheduler
  `300s`, effective scheduler `180s`, safety buffer `120s`다.
- HTTP migration은 7일 prewarm `imported_snapshots=36878`, 1일 delta
  `imported_snapshots=5192`, `source_lots=53`, `failures=0`으로 완료했고, reconciliation 후
  duplicate lot `0`을 확인했다. 2026-08-22 현재 DB query는 `parking_snapshots=38946`,
  distinct lots `44`, reference lots `53`, legacy IDs `53`이다.
- 14번 target collector run은 최종 검증 시 id `36`, observed `2026-08-22T04:13:03Z`,
  success, snapshot_count `44`였다. strict 7회 × 50초(총 300초) HTTP-only cutover
  observation은 각 `failure_count=0`, final `failed_samples=0`이었다. verifier는 stable
  legacy lot identity, reviewed empty-lot allowlist, freshness/source lag/run gap `300s`를
  epsilon 없이 검사한다.
- 로컬 WSL 검증은 backend `59 passed`, frontend `9 files / 43 tests passed`, TypeScript와
  production build 통과였다. GitHub Actions run `32547913806`에서도 backend, frontend,
  live-e2e가 모두 통과했다.
- exact live UI 검증은 `E2E_BASE_URL=https://pr.digitie.mywire.org npm run test:e2e`로
  5 passed였고, 14번 직접 origin에서도 5 passed였다. API `https://pr-api.digitie.mywire.org`
  health와 web same-origin backend health도 정상이다.
- 두 적대적 reviewer James(Frontend)와 Popper(Backend/Ops)의 P0/P1 지적을 반영했다.
  무인증 backup/restore는 사용자의 명시 요구라 유지하되 gateway/private network 보호를
  runbook에 남겼다.
- `digitie/parking-radar`의 Draft PR [#1](https://github.com/digitie/parking-radar/pull/1)은
  runtime candidate `b7944ad`와 일치한다. 새 레포 CI와 두 reviewer의 재검토가 끝나면
  merge한다. 이전 `airport-parking-radar` PR은 대상 레포가 아니며, 13번에는 Docker 명령을
  실행하지 않았다.
- Hallmark 최종 정리로 메인 화면에서 중복 KPI, 보조 브랜드 문구, 수집기 내부 동기화 시각을
  제거하고, 요일/공휴일의 중복 상세 카드를 히트맵 중심으로 통합했다. 핵심 분석·요금·백업/복원
  기능은 유지했으며 frontend 테스트 `47 passed`, TypeScript와 production build가 통과했다.
- 적대적 재리뷰에서 발견된 P1/P2를 반영한 runtime candidate는 `b7944ad`다. 히트맵/버튼
  대비, 백업 롤백 파일 보존과 quota 선검사, server14 clean artifact·정확한 포트/수집 계약,
  legacy ODROID fail-closed, future timestamp 차단, live collector readiness 검증을 추가했다.
- candidate `b7944ad`의 WSL 백엔드는 `67 passed`, 프론트는 `47 passed`와 TypeScript/build를
  통과했다. `E2E_BASE_URL=https://pr.digitie.mywire.org EXPECTED_RELEASE_SHA=<candidate>`로
  live E2E `5 passed (13.3s)`를 확인했고, strict cutover gate는 `samples=7`,
  `failed_samples=0`, `gate_duration_seconds=300`, `source_lots=53`, `target_lots_checked=53`이었다.
- GitHub Actions push run `32559078722`와 PR run `32559082014`는 live job 재실행을 포함해
  backend/frontend/live-e2e 모두 통과했다. 첫 live job은 배포 경합으로 구 SHA를 읽었고,
  재실행은 `b7944ad`를 읽어 통과했다.
- `T-030`(주차 현황·주차요금 → `python-krairport-api`)을 구현하고 PR
  [#3](https://github.com/digitie/parking-radar/pull/3)으로 머지했다. 실 서비스 키로 live
  검증하는 과정에서 krairport 자체의 KAC HTTPS 스킴 버그(모든 KAC 호출이 `https://`로 고정돼
  있었으나 실제로는 `http://`에서만 응답)와, parking-radar `parse_kac_fee`의 사전 존재하던
  필드명 버그(SCREAMING_SNAKE_CASE로 기대했으나 실제 응답은 camelCase — KAC 주차요금 수집이
  이전부터 항상 0건이었을 가능성)를 함께 발견했다. krairport 버그는 원칙대로
  `python-krairport-api` 자체(별도 PR [#6](https://github.com/digitie/python-krairport-api/pull/6))에서
  고쳤고, parsers.py 버그는 이 PR 안에서 고쳤다.
- `T-032`(PostgreSQL을 `docker-compose.db.yml` 별도 컨테이너로 분리, 포트 재배치: DB
  `14000`/API `14001`/web `14002`)를 구현하고 PR
  [#4](https://github.com/digitie/parking-radar/pull/4)로 머지했다. 14번 운영 데이터는
  `pg_dump` 사전 백업 후 기존 named volume을 재사용하는 방식으로 무손실 전환했고,
  `parking_snapshots` 56,039건을 전환 후 재확인했다. 외부 reverse proxy는 사용자가 직접
  새 포트로 갱신했다.
- ADR-005(백엔드 API `/v1` 버저닝 + RFC7807 에러 통일 + `docs/openapi.json` 기계 정본)를
  구현하고 PR [#5](https://github.com/digitie/parking-radar/pull/5)로 머지했다. hostile
  review(Popper)가 지적한 `RequestValidationError`의 RFC7807 미적용과
  `scripts/verify_cutover.py` target 호출의 버저닝 누락을 같은 PR에서 고쳤다. `{data, meta}`
  envelope는 범위 밖으로 명시적으로 미뤘다(ADR-005 "후속" 참고). `live-e2e`는 14번이 이
  candidate로 아직 배포되지 않아 예상대로 실패했다.
- PR #5(`/v1` API 버저닝)를 14번에 배포하고 live 검증까지 완료했다. `scripts/deploy-server14.sh`를
  WSL에서 SSH로 실행했다(Windows Git Bash에는 SSH 키 접근이 없어 실패, WSL은 성공 —
  스크립트 자체는 CRLF 문제로 WSL bash에서 shebang 파싱에 실패해 `sed`로 LF 정규화한
  임시 사본을 실행했다. 원본 스크립트 파일 자체는 git상 LF로 저장돼 있고, 로컬 체크아웃의
  Windows `core.autocrlf` 변환이 원인이었다). 배포는 서버14가 여러 다른 프로젝트
  (`kor-travel-map`, `pinvi` 등)의 동시 빌드로 혼잡해 예상보다 오래 걸렸을 뿐 실제로는
  정상 진행 중이었다 — 폴링 출력이 오래 멈춰 보일 때 별도 SSH 연결로 실제 프로세스 상태를
  재확인해 멈춘 게 아님을 확인했다. 배포 후 `release_sha=03bd6f3`로 `/health`,
  `/v1/airports`, `/v1/parking/current`, `/v1/admin/collector-status`가 모두 정상
  응답했고, hostile review에서 Popper가 지적한 `RequestValidationError`의 RFC7807
  누락 수정도 실제로 `422` + `application/problem+json`으로 확인했다. 외부 도메인
  (`pr-api.digitie.mywire.org`, `pr.digitie.mywire.org`)도 같은 SHA로 응답해 reverse
  proxy 추가 변경 없이 그대로 동작했다.
- 사용자 요청으로 공휴일(KASI 특일 정보) 조회도 krairport와 같은 패턴으로
  `python-kasi-api`(`kasi`)로 이관했다(`T-030`/ADR-004와 동일한 provider 라이브러리
  원칙). ADR-006 신규 작성, `codex/kasi-holiday-migration` 브랜치 PR
  [#7](https://github.com/digitie/parking-radar/pull/7)로 구현 완료. krairport 때와 달리
  이번에는 필드명/endpoint 불일치 같은 새 버그를 발견하지 못했다 — 순수 provider 교체였다.
- hostile review(James/Popper) 모두 P0/P1 없음을 확인했다. Popper가 지적한 P2(공휴일은
  `CollectionService`처럼 별도 rate-limit backoff 스케줄링이 없다는 점)는 의도적 범위
  선택으로 판단해 ADR-006에 근거를 남겼다. PR #7을 머지(`986d64e`)하고 14번에 배포해
  live 검증까지 완료했다: `release_sha=986d64e`, `GET /v1/holidays/summary`가 실제
  서비스 키로 `source=kasi_holiday_info`, 광복절/대체공휴일 데이터를 정상 반환했다.
- `T-031`(Docker 컨테이너에서 `test_cutover_guards.py`가 `ModuleNotFoundError`로 깨지던
  사전 버그)을 고쳤다. `sys.path` 계산이 로컬 repo-root 깊이(`parents[2]`)를 하드코딩해
  Docker 이미지(`backend/`가 `/app`으로 flatten됨)에서만 깨졌던 것을, `parents[1]`/
  `parents[2]` 둘 다 시도해 `observe_cutover.py`가 실제로 존재하는 디렉터리를 찾는
  `_scripts_dir()`로 교체했다. hostile review에서 `is_dir()`만으로는 우연히 존재하는
  다른 `scripts/`를 잘못 고를 수 있다는 지적을 받아 파일 존재까지 확인하도록
  강화했다. PR [#9](https://github.com/digitie/parking-radar/pull/9) 머지, WSL/Docker
  양쪽 `82 passed`(제외 없이 전부 통과).
- `T-029`(`flight_status.py` → `python-krairport-api`)를 완료해 ADR-004 전체 범위를
  마무리했다. KAC ODCloud(`FlightStatusListDTL`)는 krairport의 다른 KAC 서비스와 다른
  호스트(`api.odcloud.kr`)를 쓰는 별도 provider라, `python-krairport-api`에
  `KacClient.flight_status_detail_raw_items()`를 새로 추가하고(별도 저장소 PR
  [#7](https://github.com/digitie/python-krairport-api/pull/7), 커밋 `cbe4d13`) parking-radar의
  pin을 갱신했다. IIAC는 krairport의 기존 `iiac_raw_items`가 endpoint와 정확히 일치해
  라이브러리 수정 없이 전환했다. hostile review(James/Popper)에서 두 가지를 지적받아
  고쳤다: (1) IIAC 출발/도착 테스트가 공유 mock return value 때문에 두 호출을 구분하지
  못하던 것을 `side_effect`로 강화, (2) `KrairportRateLimitError`가 다른 upstream 오류와
  동일하게 처리돼 캐시되지 않던 것 — 비행편은 페이지 조회마다 즉시 호출되므로 rate limit
  창 동안 방문자마다 upstream을 재호출해 창을 계속 갱신하는 문제가 있어, `status:
  "rate_limited"`로 구분하고 `upstream_rate_limit_backoff_seconds` 동안 캐시하도록
  고쳤다. PR [#10](https://github.com/digitie/parking-radar/pull/10) 머지(`9961579`), 14번에
  배포해 live 검증 완료: `release_sha=9961579`, KAC(`GMP`)와 IIAC(`ICN`) 양쪽
  `/v1/flights/status`가 실제 서비스 키로 `status=success`와 실제 항공편 데이터를
  반환했다.

## 2026-08-24

- 사용자 요청으로 운영 호스트 `192.168.1.14`의 별칭을 "server14"/"14번"에서 "n150"으로
  통일했다(과거 기록 문서는 그대로 보존). `docs/journal.md`/`docs/tasks-done.md`/
  `docs/runbooks/migration.md`처럼 히스토리를 다루는 문서는 고치지 않았다.
- n150이 느리다는 신고를 받아 조사했다: CPU 4코어에 load average `30.57`(1분), swap
  `4.0Gi/4.0Gi`(거의 꽉 참), 컨테이너 42개가 동시에 떠 있었다(kor-travel-map,
  kor-travel-geo, pinvi, tvnm05 등 parking-radar 외 다른 프로젝트가 대부분). 원인은
  parking-radar 자체가 아니라 여러 프로젝트가 4코어 호스트를 공유하며 용량을 초과한
  것으로 판단했다. `tvnm05-current-*`/`tvnm05-live-*`가 동시에 떠 있어 중복처럼 보였지만
  생성 시각을 확인해 보니 candidate/live 두 환경이 의도적으로 공존하는 blue/green
  패턴이라 정리 대상이 아니라고 판단하고 손대지 않았다. `vm.swappiness`가 아무 파일에도
  설정돼 있지 않아(커널 기본값 60) `/etc/sysctl.d/99-parking-radar-swappiness.conf`에
  `vm.swappiness=10`을 등록해 적용했다(load average `30.57`→`25.01`로 소폭 개선). 이미
  swap에 올라간 4GiB를 강제로 비우는 `swapoff -a && swapon -a`는 당시 free 메모리가
  2.1GiB뿐이라 OOM 위험이 있어 실행하지 않았다.
- 사용자 요청으로 PostgreSQL dump를 3일마다 자동 생성하도록
  `scripts/n150-backup-cron.sh`를 추가했다(PR
  [#13](https://github.com/digitie/parking-radar/pull/13)). 앱 코드 변경 없이
  `POST /v1/admin/backups`를 `localhost:14001`로 호출만 하는 독립 스크립트이며, 오래된
  dump 정리는 기존 `BACKUP_RETENTION_COUNT`가 그대로 담당한다. n150의 crontab(다른
  프로젝트 백업 job과 공존, `CRON_TZ=UTC`)에 `0 18 */3 * *`(3일마다 03:00 KST)로
  등록하고 dry-run으로 실제 dump 생성을 확인했다. Windows 로컬 체크아웃의
  `core.autocrlf`가 `scp`로 옮긴 스크립트를 CRLF로 깨뜨려(`deploy-server14.sh`와 동일한
  문제) 원격에서 `sed -i 's/\r$//'`로 정규화해야 했다.

## 2026-09-06

- 사용자 요청으로 ADR-007(저장소/패키지/n150 운영 식별자를 `kor-travel-airport`로 개명,
  배포되는 웹앱 브랜드는 `parking-radar`로 분리 유지)을 PR
  [#15](https://github.com/digitie/kor-travel-airport/pull/15)로 구현·머지했다(`395717b`).
  이 세션에서 n150 live 상태를 직접 재확인했다: 외부 게이트웨이(`pr-api.digitie.mywire.org`,
  `pr.digitie.mywire.org`)와 n150 로컬 모두 `release_sha=395717b`로 응답했고, DB
  ready/seeded, scheduler 정상 수집(180초 effective tick, 연속 5회 success, rate-limit
  없음)까지 확인해 rename 자체가 이미 무중단으로 n150에 정착해 있음을 검증했다.
- rename 작업 중 발견한 사전 버그(두 배포 스크립트 `scripts/deploy-server14.sh`,
  `scripts/n150-backup-cron.sh`가 git에 100644로 추적돼 `git archive` 재배포 때마다 n150에서
  실행 권한이 초기화되는 문제, PR #13 활성화 당시 크론이 exit 126으로 실패해 수동
  chmod로 우회했던 것)를 PR
  [#16](https://github.com/digitie/kor-travel-airport/pull/16)로 100755로 고쳤다.
- 이 세션(Windows 로컬)에는 n150 SSH 공개키가 등록돼 있지 않아 처음엔 배포가 막혔다 —
  사용자가 WSL에는 이미 `digitie@192.168.1.14` SSH 접근이 되어 있음을 알려줘 이후
  모든 `scripts/deploy-server14.sh` 실행은 `wsl.exe -e bash -lc '... bash
  scripts/deploy-server14.sh'`로 진행했다(Windows Git Bash에는 여전히 키가 없다는 사실을
  `docs/dev-environment.md` 또는 이 파일에 남겨 다음 세션이 반복 조사하지 않도록 한다).
- hostile review(James/Popper)를 PR #16에 대해 실행했다. James는 P0/P1/P2 없음. Popper는
  P1(파일모드 fix가 git에만 있고 n150에 실제로 재배포·검증됐는지 diff/문서 어디에도 없다는
  점)과 P2 2건(향후 mode 회귀를 잡는 CI 가드 부재, `backend/Dockerfile`의 `COPY scripts`가
  mode-only 변경에도 이미지 캐시를 무효화하는 점)을 지적했다. P1은 실제로 HEAD(`605fa80`)를
  n150에 배포한 뒤 `stat -c '%a'`로 두 스크립트가 `775`인지 확인하고
  `n150-backup-cron.sh`를 직접 실행해 exit `0`과 실제 `parking-radar-*.dump` 생성까지
  재현·검증하는 것으로 해소했다(수정 코드는 필요 없었다 — 지적대로 "검증이 없었다"는
  공백 자체를 이 세션에서 메웠다). P2 두 건은 이번 PR 범위 밖으로 판단해 코드는 고치지
  않았다 — CI mode 가드는 별도 task로 남길 만하지만 지금 백로그에 넣지 않았고, Dockerfile
  캐시 무효화는 기능에 영향이 없는 빌드 시간 이슈라 그대로 뒀다.
- PR #16을 squash-merge(`b893d0b`)했다. squash 특성상 main의 최종 SHA가 배포에 썼던 브랜치
  팁(`605fa80`)과 달라져, `release_sha`를 main과 정확히 맞추기 위해 `b893d0b`를 다시
  n150에 배포했다(내용은 동일해 Docker 레이어 대부분 캐시 히트). 최종적으로 외부
  게이트웨이가 `release_sha=b893d0be8c534d5392ed08453b292ce3493db7e3`로 응답하고 web도
  200을 반환하는 것까지 확인했다.
- 사용자 요청으로 shadcn/ui 전환 + 과거 자료 조회 기능 + Hallmark 재감사/재설계
  initiative를 시작했다(`docs/tasks.md` T-033~T-038, 계획 파일
  `C:\Users\digit\.claude\plans\iridescent-finding-parasol.md`). 조사 결과 프론트엔드는
  Tailwind/컴포넌트 라이브러리 없이 순수 CSS(1844줄 `globals.css` + oklch `tokens.css`)로
  된 단일 페이지 앱이었고, 백엔드 history/analytics API는 전부 상대 `days` 조회만
  지원해 임의 과거 날짜 조회가 불가능했다. `F:\dev\pinvi`의 `AppShell.tsx`(데스크톱
  상단 탭 / 모바일 하단 탭바 4+더보기)를 IA 참고 패턴으로 확인했다.
- T-033(shadcn/ui 기반 도입, PR [#18](https://github.com/digitie/kor-travel-airport/pull/18))을
  구현했다. `npx skills add shadcn/ui`로 스킬을 저장소 루트 `.agents/skills`(관례에 맞춰
  `.claude/skills`는 심볼릭 링크가 아닌 실제 복사본으로 — 이 환경은 `core.symlinks=false`라
  심볼릭 링크를 커밋하면 세션 로컬 절대경로가 박힌 깨진 텍스트 파일이 된다)에 설치한 뒤
  `npx shadcn@latest init --defaults`(Tailwind v4 + Base UI, nova style)로 초기화했다.
  init이 자동으로 저지른 세 가지 사고를 감지·수정했다: (1) 이 프로젝트가 이미 쓰던
  `--muted`/`--accent`/`--radius`를 shadcn 자체 기본값으로 덮어써 기존 ~30곳의 규칙이
  깨질 뻔한 것을 소스 토큰(`--muted-foreground`/`--color-accent`/`--radius-card`)으로
  재배선, (2) `next/font/google`의 Geist를 주입해 한글 최적화 Pretendard 스택을 덮어쓴
  것을 되돌림, (3) Next.js 16이 `frontend/AGENTS.md`/`CLAUDE.md`를 자동 생성한 것을
  `agentRules: false`로 차단(저장소는 루트에만 CLAUDE.md/AGENTS.md를 둠, CLAUDE.md §1).
  hostile review(James/Popper)에서 James가 P0(Tailwind Preflight가 h1~h6의
  font-weight/font-size를 inherit로 리셋해 헤딩이 굵기·크기를 잃는 것, 브라우저에서
  `getComputedStyle`로 재현 확인 — h1 400/h2·h3 16px)를 지적해 원래 UA 기본값(h1 bold,
  h2 1.5em/700, h3 1.17em/700)을 명시적으로 복원했다. Popper가 지적한 P1(Tailwind v4
  네이티브 바이너리가 n150의 Alpine(musl) 이미지에서 실제로 빌드되는지 CI만으로는
  증명 못 한다는 점)은 WSL Docker로 `frontend/Dockerfile`을 직접 빌드해 성공을
  확인하는 것으로 해소했다. PR #18을 squash-merge(`67e9199`)하고 n150에 배포,
  release_sha 일치와 live E2E `5 passed`(320/375/414/768px 무-오버플로 포함)까지
  확인했다. 컴포넌트 JSX는 아직 바꾸지 않았다 — T-034(shadcn 프리미티브 치환)가 다음
  단계다.
- T-034(컴포넌트를 shadcn 프리미티브로 교체, PR
  [#20](https://github.com/digitie/kor-travel-airport/pull/20))를 구현했다.
  native button/table/`window.confirm()`/`.metric-card`/`.notice`를 shadcn
  Button/Card/Table/Alert/AlertDialog로 바꾸되 기존 className·`data-testid`를 전부
  보존해 Tailwind utility layer가 항상 unlayered legacy CSS에 밀린다는 걸 활용했다.
  `<select>`/`ResponsiveSection`의 `<details>`/daily-flight-overlay-chart의 토글·
  체크박스는 기존 테스트가 native DOM 구조(`getByDisplayValue`, `open` 속성,
  `aria-pressed`)에 의존해 이번엔 일부러 안 건드렸다 — 근거를 커밋 메시지와
  tasks-done.md에 남겼다. hostile review(James/Popper)가 이번엔 진짜 결함을 여럿
  찾았다: James가 성공 메시지까지 shadcn Alert(항상 `role="alert"`)로 감싸 매 수동
  수집 성공마다 assertive 알림이 뜨던 것(P1), 다운로드 버튼 `variant="link"`가 없던
  hover 밑줄을 추가한 것(P2, cascade layer는 "겹치는 속성"만 보호한다는 걸 이번에
  확인), AlertDialogCancel의 onClick+onOpenChange 중복 취소(P2)를 지적했다. Popper는
  더 무겁게 봤다 — 무인증 destructive 백업/복원 API(ADR-003)의 유일한 안전장치를
  바꾸면서 `AlertDialogAction`에 `disabled={busy}`가 빠진 것(P1)과 회귀 테스트가
  하나도 없는 것(P1)을 지적했다. 전부 수정하고 `backup-panel.test.tsx`에 4개 테스트를
  추가했는데, 그 중 하나(dialog 열린 동안 배경 버튼이 `inert` 처리되어 접근성 트리에서
  완전히 사라지는지)가 Popper 본인이 "jsdom은 검증 불가"라고 적었던 것과 달리 실제로
  jsdom에서 검증 가능함을 확인했다 — `disabled` 속성이 아니라 Base UI의 `inert`
  처리 자체를 `queryByRole`로 직접 증명했다. PR을 머지하고 CI에서 `tsconfig.test.json`
  기준 타입에러(`pre_restore_backup: null` vs 실제 타입 `| undefined`, 기본
  tsconfig는 tests/를 제외해서 로컬에서 못 잡았었다)를 한 번 더 고쳤다. n150 배포,
  release_sha `95ac97d` 일치, live E2E `5 passed`(백업 패널 노출 확인 포함) 확인했다.
