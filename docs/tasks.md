# tasks.md — parking-radar 백로그

진행 중/예정(`[ ]`) task만 두는 백로그다. 완료 항목은
[`docs/tasks-done.md`](tasks-done.md)에 이동하고, 현재 진척과 다음 작업은
[`docs/resume.md`](resume.md)에 기록한다. 작성 규칙은 [`docs/tasks-rule.md`](tasks-rule.md)를
따른다. 2026-09-06에 사용자 요청으로 shadcn/ui 전환 + 과거 자료 조회 + Hallmark
재감사/재설계 initiative(T-033~T-038)가 추가됐다. 계획 전체는
`C:\Users\digit\.claude\plans\iridescent-finding-parasol.md`에 있다.

## 진행 중인 작업 인덱스

- [ ] `T-035` — 라우트 기반 앱 셸(pinvi 스타일 모바일 하단 탭바)
- [ ] `T-036` — 과거 자료 조회 기능(백엔드 날짜범위 + 프론트 date picker)
- [ ] `T-037` — Hallmark audit (read-only 펀치리스트)
- [ ] `T-038` — Hallmark redesign (audit 지적 반영)

`T-033`(shadcn/ui 기반 도입), `T-034`(컴포넌트를 shadcn 프리미티브로 교체)는 완료돼
`docs/tasks-done.md`로 이동했다. `T-034`에서는 `<select>`/`ResponsiveSection`의
`<details>`/daily-flight-overlay-chart의 토글·체크박스는 테스트 호환성 위험 때문에
의도적으로 native 구현을 유지했다 — `T-035`에서 라우트 구조가 바뀌면 재검토한다.

### `T-035` — 라우트 기반 앱 셸

- `/`(현황)·`/analytics`(분석)·`/history`(과거조회)·`/fees`(요금계산)·`/backup`(백업)
  라우트 분리 + 공유 `AppShell`(데스크톱 상단 탭 / 모바일 하단 탭바 4+더보기, pinvi
  `AppShell.tsx` 패턴 참고, "더보기"는 shadcn `Popover`).
- 완료 조건: 320/375/414/768px 무-오버플로, 탭바 키보드 포커스/`aria-current`, 기존
  golden path E2E 통과.

### `T-036` — 과거 자료 조회 기능

- `GET /v1/parking/history`에 `start_date`/`end_date`(YYYY-MM-DD) 추가(기존 `days` 유지,
  `_parse_local_date_query`/`_load_snapshots_between_local_dates` 재사용, 최대 기간 캡).
- `/history` 라우트에 shadcn `Calendar` range picker + 결과 렌더링.
- 완료 조건: 신규 backend pytest(현재 0개) + frontend vitest 통과, 데이터 있음/없음/
  기간초과 케이스 브라우저 확인.

### `T-037` — Hallmark audit

- 전체 결과물에 `hallmark audit` 실행, critical/major/minor 펀치리스트 산출(read-only).

### `T-038` — Hallmark redesign

- T-037의 critical/major 반영, minor는 반영하거나 근거를 `docs/journal.md`에 기록.
- 완료 조건: 전체 테스트 재통과 + 320/375/414/768px 재검증 + Hallmark 58-gate.

## 완료 조건

이 백로그는 코드·문서·테스트·운영 검증이 모두 끝난 뒤 각 항목을 완료 처리한다.

- [x] PostgreSQL 컨테이너가 healthcheck를 통과하고 애플리케이션이 기동된다.
- [x] 기존 SQLite 테스트와 PostgreSQL Docker 테스트가 모두 통과한다.
- [x] 최근 주차 관측 구간과 마지막 수집 시각이 이전 시스템보다 늦지 않다.
- [x] n150에서 연속 수집이 시작되고 5분 간격의 관측 공백이 발생하지 않는다.
- [x] n150 공개 포트는 API `14000`, web `14001`이며 live E2E는
  `https://pr.digitie.mywire.org`에서 실행한다.
- [x] API 외부 주소는 `https://pr-api.digitie.mywire.org`로 smoke 검증한다.
- [x] 백업 생성·다운로드·복원 UI를 실제 브라우저에서 확인한다. 실제 운영 DB를 덮어쓰는 복원 실행은
  pre-restore backup 보호를 확인한 뒤 별도 운영 승인으로 남긴다.
- [x] 모바일 320/375/414px와 데스크톱 768px 이상에서 가로 스크롤·접근성 회귀가 없다.
- [x] 두 리뷰 에이전트의 critical/major 지적이 해소되거나 근거와 함께 기록된다.
- [x] Draft PR이 CI와 live E2E를 통과한 뒤에만 머지한다.

## 운영 제약 및 미해결 위험

- 192.168.1.13에서는 Docker를 조작하지 않는다. 원본은 `http://192.168.1.13:3000/api/backend`
  HTTP GET으로만 읽었고, 외부 원본 주소 `https://pr2.digitie.mywire.org`는 cutover 당시
  parking-radar가 아닌 Home Assistant 응답을 보여 원본 검증에 사용하지 않았다.
- HTTP fallback은 공항·주차장·관측 시계열을 보존했지만 raw response와 기존 collection run ID를
  복원하지 않는다. exact SQLite dump가 필요하면 운영자 권한으로 별도 파일을 제공해야 한다.
- 13번의 현재 수집기는 10분 주기로 동작 중이다. n150은 configured 5분 계약과 120초 safety
  buffer(실제 tick 180초)로 운영하며, 공공데이터 API rate limit과 실제 응답 시각은
  `docs/architecture/collection.md`에 기록한다.
- 백업/복원 API에는 별도 인증이 없다. 인터넷에 직접 노출하지 않고 내부망 또는 외부
  게이트웨이에서 접근을 제한해야 한다.
