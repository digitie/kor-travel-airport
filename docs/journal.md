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
