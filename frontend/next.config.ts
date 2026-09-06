import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const NO_STORE_HEADERS = [
  { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
  ...SECURITY_HEADERS,
];

// T-035: /backup은 별도 인증 없이 제공되는 운영 도구다(docs/adr/003-*.md). 라우트
// 분리로 이전보다 발견하기 쉬운 고정 링크가 됐으니, 최소한 검색엔진/크롤러 색인만은
// 명시적으로 막는다 - 이것이 network ACL을 대신하지는 않는다(ADR-003 참고).
const BACKUP_HEADERS = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, ...NO_STORE_HEADERS];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 저장소는 루트의 CLAUDE.md/AGENTS.md만 AI agent entry로 둔다(drift 회피 정책,
  // CLAUDE.md §1). Next.js 16이 자동 생성하는 frontend/AGENTS.md·CLAUDE.md는 끈다.
  agentRules: false,
  async headers() {
    return [
      {
        source: "/",
        headers: NO_STORE_HEADERS,
      },
      {
        // T-035: 라우트 기반 앱 셸 도입 이후 모든 페이지가 실시간 대시보드 화면이다 -
        // "/" 하나에만 걸려 있던 no-store 규칙을 신규 라우트에도 적용한다.
        source: "/:page(analytics|history|fees)",
        headers: NO_STORE_HEADERS,
      },
      {
        source: "/backup",
        headers: BACKUP_HEADERS,
      },
      {
        source: "/api/backend/:path*",
        headers: NO_STORE_HEADERS,
      },
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
