# tasks.md — parking-radar 백로그

진행 중/예정(`[ ]`) task만 두는 백로그다. 완료 항목은
[`docs/tasks-done.md`](tasks-done.md)에 이동하고, 현재 진척과 다음 작업은
[`docs/resume.md`](resume.md)에 기록한다. 작성 규칙은 [`docs/tasks-rule.md`](tasks-rule.md)를
따른다. 2026-09-06에 사용자 요청으로 shadcn/ui 전환 + 과거 자료 조회 + Hallmark
재감사/재설계 initiative(T-033~T-038)가 추가됐고, 2026-09-07 `T-038`(마지막 phase)
완료로 이 initiative 전체가 끝났다. 계획 전체는
`C:\Users\digit\.claude\plans\iridescent-finding-parasol.md`에 있다.

## 진행 중인 작업 인덱스

- [ ] `T-039` — UI 밀도 개선(컴팩트화)

`T-033`~`T-038`(shadcn/ui 전환 + 과거 자료 조회 + Hallmark 재감사/재설계
initiative) 전체가 완료돼 `docs/tasks-done.md`로 이동했다.

### `T-039` — UI 밀도 개선(컴팩트화)

2026-09-07 사용자 요청: 전체적으로 UI를 더 컴팩트하게 — 공항/주차장 선택 +
새로고침을 모바일에서도 한 줄로, 분석 페이지의 비효율적인 칼럼 크기 등.

- 헤더 `.control-band`(공항 선택 + 세부 주차장 + 새로고침)가 모바일에서 3행으로
  붕괴되던 것을 한 줄로 유지하도록 변경. `<select>` 레이블은 `sr-only
  lg:not-sr-only`로 모바일에서만 시각적으로 숨기고, 새로고침 버튼은 모바일에서
  아이콘 전용으로 압축한다.
- 조사 중 실제 운영 버그를 하나 발견: `current-status-view.tsx`의
  `.lot-card-grid lg:hidden`이 데스크톱에서도 전혀 숨겨지지 않고 있었다(라이브
  사이트에서 컴퓨티드 스타일로 확인) — `.lot-card-grid`가 `@import "tailwindcss"`
  뒤에 이어붙인 순수 커스텀 클래스(unlayered CSS)라 `display:grid`가 항상
  Tailwind의 `@layer utilities` 안에 있는 `lg:hidden`을 이긴다(CSS Cascade
  Layers 스펙상 unlayered가 항상 이김, specificity/순서 무관). 데스크톱에서
  모바일 카드 목록이 테이블 아래 그대로 렌더링되고 있었다 — `.lot-card-grid`
  자체에 `@media (min-width: 64rem)` 규칙을 추가해 고쳤다.
- 분석 `/analytics` → 임계치 탭의 2열 그리드(`.analytics-threshold-panels`)가
  기본 `align-items: stretch`라 왼쪽 패널(요일별, 데이터 2행)이 오른쪽 패널
  (날짜별, 스크롤 가능한 긴 목록) 높이에 맞춰 늘어나 아래쪽에 큰 빈 공간이
  생기던 것을 `align-items: start`로 고쳐 각 패널이 자기 콘텐츠 높이만큼만
  차지하도록 했다.
- hostile review(James/Popper, 서브에이전트 2개 독립 실행)에서 실제 데이터
  기준 P1을 찾아 재현·수정했다: 공항명(최대 6자)과 달리 세부 주차장명은 실제
  운영 데이터에서 최대 13자이고 구분자가 뒤쪽에 있다(`T1 장기 P1/P2/P3/P4
  주차타워`, `국내선 제1/제2주차장` 등, `GET /v1/airports` 실 데이터로 확인).
  두 `<select>`를 정확히 반씩 나눈 최초 구현은 320px에서 이 구분자를 통째로
  잘라 서로 다른 주차장이 같은 텍스트("국내선 제1주차장"/"국내선
  제2주차장"이 둘 다 "국내선 ㅈ"로)로 보이는 걸 실제 스크린샷으로 확인했다 —
  `grid-template-columns`을 0.8fr/1.2fr로 재배분하고 select 자체 padding·
  font-size를 더 압축해 고쳤다(재검증 스크린샷: 최장 실데이터 "T1 장기 P1
  주차타워"도 320px에서 구분자까지 보임). 추가로, `current-status-view.tsx`가
  쓰는 `.action-stack`의 860px 이하 2열 그리드 규칙(원래 그쪽의 수동 수집
  버튼+힌트 쌍을 위한 것)을 헤더의 새로고침 버튼도 같은 클래스로 감싸는 바람에
  381-1023px 구간에서 그대로 상속받아, 빈 두 번째 칸이 실측 44px→98px로
  부풀며 select 폭을 추가로 빼앗고 있었다 — 헤더 쪽은 `.action-stack`으로 감싸지
  않고 버튼을 `.control-band`의 그리드 자식으로 직접 둬서 분리했다. e2e에는
  데스크톱 폭에서 `.lot-card-grid`가 실제로 숨는지(둘 다 보이면 실패하도록)
  회귀 테스트를 추가했다(`e2e/live-dashboard.spec.ts`, 원래 `.first()` 단언은
  이 버그를 놓쳤을 것이다).
- 완료 조건: 전체 테스트 재통과 + 320/375/414/768/1024px 재검증(라이브 백엔드에
  붙인 로컬 dev 서버에서 Playwright 스크린샷으로 확인) + hostile review 통과 +
  n150 배포 + live E2E.

`T-034`에서는 `<select>`/`ResponsiveSection`의 `<details>`/
daily-flight-overlay-chart의 토글·체크박스는 테스트 호환성 위험 때문에 의도적으로
native 구현을 유지했다 — `T-035`에서 라우트 구조가 바뀌었지만 이 판단은 그대로
유효하다(재검토 결과 변경 없음). `T-035`가 남긴 후속 미해결 항목(`docs/tasks-done.md`
T-035 참고): 분석 뷰의 브레이크포인트가 860px→1024px(Tailwind 기본값)로 바뀐 것은
의도적이나 별도 공지·테스트는 없음, 라우트 전환 시 analytics 데이터가 캐시되지 않아
`/analytics`↔`/history` 왕복마다 재요청됨, 백업 생성/복원 진행 중 다른 라우트로
이동하면 진행 상태가 사라짐(백엔드 `operation_lock`이 데이터 손상은 막지만 사용자
피드백은 소실). `T-036`이 남긴 후속 미해결 항목(`docs/tasks-done.md` T-036 참고):
라우트 간 analytics 데이터가 캐시되지 않는 문제가 `/history`에도 동일하게 있음(같은
근본 원인, T-035와 동일), 날짜범위 선택 팝오버가 선택 완료 후 자동으로 안 닫힘(수동
닫기만 가능). `T-038`이 남긴 후속 미해결 항목(`docs/tasks-done.md` T-038 참고):
dark-mode 차트/톤 팔레트 미토큰화, `globals.css` 전반의 desktop-first 미디어 쿼리
구조, stock shadcn 프리미티브 3곳의 `transition-all`, 980–1024px 브레이크포인트
경계 전용 회귀 테스트 없음, `/backup`이 여전히 클릭 1번으로 열림(의도적 유지 —
아래 참고).

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
