# ADR-004: 비행편 데이터는 `python-krairport-api`(krairport)를 provider 라이브러리로 사용한다

- **상태**: accepted (구현은 미완료 — "후속" 참고)
- **날짜**: 2026-08-23
- **결정자**: agent + human
- **컨텍스트**: `backend/app/services/flight_status.py`는 한국공항공사(KAC) `15113771`
  ODCloud API와 인천국제공항공사(IIAC) `15112968` API를 `httpx` + 수동 XML/JSON 파싱으로
  직접 재구현하고 있다. 같은 두 기관 API(KAC/IIAC 항공편 조회, `DATA_GO_KR_SERVICE_KEY`
  기준)를 하나의 타입 있는 client로 묶은 형제 라이브러리 `python-krairport-api`
  (Python 패키지명 `krairport`)가 `F:\dev\python-krairport-api`에 이미 존재하고, KAC/IIAC
  provider 경계 분리, XML/JSON 양쪽 파싱, `UnsupportedAirportError`, 동기/비동기 client,
  오프라인 fixture 기반 테스트를 갖추고 있다. `kor-travel-map` 생태계(`AGENTS.md` ADR-044)는
  이런 형제 `python-*-api` 라이브러리를 provider adapter 없이 직접 사용하고, 로컬 체크아웃을
  우선 조회하는 정책을 이미 채택하고 있다.
- **결정**: parking-radar의 비행편 조회는 `python-krairport-api`(`krairport`) client를
  사용한다. `flight_status.py`가 직접 구현한 HTTP 호출·XML/JSON 파싱은 이 라이브러리 호출로
  대체한다. `krairport`에 없는 endpoint나 버그가 필요하면, parking-radar 안에 우회
  wrapper/shim을 만들지 않고 `F:\dev\python-krairport-api`(로컬 체크아웃 우선, ADR-044와
  동일 원칙)를 직접 수정해 개선한 뒤 그 개선된 라이브러리를 parking-radar가 소비한다.
- **근거**: 이미 검증된 provider 파싱 로직(XML/JSON 양쪽, KAC/IIAC 경계, 서비스키 처리)을
  중복 구현하지 않는 것이 회귀 위험과 유지보수 비용을 줄인다. 데이터 정합성(필드 의미,
  provider별 응답 형태)의 1차 책임을 provider 라이브러리에 두면, 다른 프로젝트(`kor-travel-map`
  계열)와 동일한 수정이 한 곳에서 공유된다.
- **결과 (긍정)**: 비행편 관련 버그 수정·신규 endpoint 지원이 `krairport`에 쌓이고
  parking-radar는 이를 그대로 소비할 수 있다. offline fixture 기반 테스트를 `krairport` 쪽에서
  재사용할 수 있다.
- **결과 (부정)**: parking-radar가 외부(로컬) 라이브러리에 의존하게 되어, `krairport`의
  breaking change가 parking-radar에 영향을 줄 수 있다. 현재 `krairport`는 PyPI에 게시되지
  않은 로컬 라이브러리이므로, 운영 배포(Docker 이미지 빌드) 시 의존성 설치 방법(로컬 path
  dependency vs git dependency vs vendoring)을 별도로 정해야 한다.
- **후속**: 이 ADR은 방향 결정이며, 아직 코드 마이그레이션은 하지 않았다 — `flight_status.py`는
  여전히 `httpx` 직접 구현 상태다. 실제 전환은 별도 task로 `docs/tasks.md`에 등록하고,
  전환 시 (1) `backend/pyproject.toml`에 의존성 추가 방식 결정, (2) Docker 빌드에서 로컬
  경로 접근 가능 여부 확인, (3) 기존 `test_flight_status.py` fixture를 `krairport`
  fixture로 교체 또는 병행, (4) 전환 전후 `/flights/status` 응답 스키마 동일성 확인을
  포함한다.
