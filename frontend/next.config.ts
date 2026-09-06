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
