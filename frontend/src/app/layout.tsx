import type { Metadata } from "next";

import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { DashboardProvider } from "@/lib/dashboard-context";

export const metadata: Metadata = {
  title: "parking-radar",
  description: "국내 공항 주차 현황과 요금 계산을 위한 반응형 대시보드"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <DashboardProvider>
          <AppShell>{children}</AppShell>
        </DashboardProvider>
      </body>
    </html>
  );
}

