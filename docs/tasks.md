# tasks.md — parking-radar 백로그

진행 중/예정(`[ ]`) task만 두는 백로그다. 완료 항목은
[`docs/tasks-done.md`](tasks-done.md)에 이동하고, 현재 진척과 다음 작업은
[`docs/resume.md`](resume.md)에 기록한다. 작성 규칙은 [`docs/tasks-rule.md`](tasks-rule.md)를
따른다. 2026-08-22 기준 기능·문서·검증 task는 모두 완료됐고, 2026-08-23에 문서화 task 1건이
추가됐다.

## 진행 중인 작업 인덱스

- [ ] `T-029` — `flight_status.py`를 `python-krairport-api`(krairport) client로 전환

## `T-029` — `flight_status.py`를 `python-krairport-api`(krairport) client로 전환

[ADR-004](</F:/dev/parking-radar/docs/adr/004-krairport-provider-library.md>)의 방향 결정에
따른 실제 코드 마이그레이션이다. 아직 시작하지 않았다.

완료 조건:

- [ ] `backend/pyproject.toml`에 `krairport` 의존성을 추가하는 방식(로컬 path dependency,
  git dependency, vendoring 중 택1)을 정하고 근거를 남긴다.
- [ ] Docker 이미지 빌드 컨텍스트에서 선택한 의존성 방식이 실제로 동작하는지 확인한다
  (로컬 path dependency라면 빌드 컨텍스트에 `F:\dev\python-krairport-api` 접근/복사 방법 필요).
- [ ] `backend/app/services/flight_status.py`의 KAC(`15113771`)/IIAC(`15112968`) 직접
  `httpx` 호출·XML/JSON 파싱을 `krairport`의 `departures()`/`arrivals()` 호출로 대체한다.
- [ ] 전환 전후 `/flights/status` 응답 스키마가 동일한지 확인한다(프론트 `daily-flight-overlay-chart.tsx`
  계약 변경 없음).
- [ ] `backend/tests/test_flight_status.py`를 `krairport`의 오프라인 fixture 방식과
  맞추거나 병행 유지한다.
- [ ] `krairport`에 없는 endpoint/버그를 발견하면 parking-radar 안에 우회 코드를 추가하지
  않고 `F:\dev\python-krairport-api`를 직접 수정한 뒤 그 결과를 소비한다.
- [ ] `docs/architecture/data-sources.md` §6/§7, `docs/architecture/architecture.md`의
  "전환 전" 문구를 제거하고 실제 전환 완료를 반영한다.

## 완료 조건

이 백로그는 코드·문서·테스트·운영 검증이 모두 끝난 뒤 각 항목을 완료 처리한다.

- [x] PostgreSQL 컨테이너가 healthcheck를 통과하고 애플리케이션이 기동된다.
- [x] 기존 SQLite 테스트와 PostgreSQL Docker 테스트가 모두 통과한다.
- [x] 최근 주차 관측 구간과 마지막 수집 시각이 이전 시스템보다 늦지 않다.
- [x] 14번에서 연속 수집이 시작되고 5분 간격의 관측 공백이 발생하지 않는다.
- [x] 14번 공개 포트는 API `14000`, web `14001`이며 live E2E는
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
- 13번의 현재 수집기는 10분 주기로 동작 중이다. 14번은 configured 5분 계약과 120초 safety
  buffer(실제 tick 180초)로 운영하며, 공공데이터 API rate limit과 실제 응답 시각은
  `docs/architecture/collection.md`에 기록한다.
- 백업/복원 API에는 별도 인증이 없다. 인터넷에 직접 노출하지 않고 내부망 또는 외부
  게이트웨이에서 접근을 제한해야 한다.
