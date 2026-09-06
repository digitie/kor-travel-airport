"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calculator,
  DatabaseBackup,
  History,
  LayoutDashboard,
  MoreHorizontal,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDashboard } from "@/lib/dashboard-context";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "현황", icon: LayoutDashboard },
  { href: "/analytics", label: "분석", icon: BarChart3 },
  { href: "/history", label: "과거조회", icon: History },
  { href: "/fees", label: "요금계산", icon: Calculator },
  { href: "/backup", label: "백업", icon: DatabaseBackup },
];

// 데스크톱/모바일 분기는 Tailwind 기본 lg(1024px) 브레이크포인트를 쓴다 - 이전 JS
// useViewportMode()의 860px 기준에서 의도적으로 올렸다(shadcn/Tailwind 표준값을 그대로
// 따름). 860~1023px 구간은 이전엔 데스크톱 레이아웃이었지만 지금은 모바일 레이아웃이다.

// 모바일 하단 탭바 primary 4개 — 매일 쓰는 조회 화면. 백업(occasional/admin 성격,
// ADR-003 무인증 destructive API)은 "더보기"로 한 단계 뒤로 뺀다.
const MOBILE_PRIMARY_HREFS = ["/", "/analytics", "/history", "/fees"];
const MOBILE_PRIMARY = NAV_ITEMS.filter((item) => MOBILE_PRIMARY_HREFS.includes(item.href));
const MOBILE_SECONDARY = NAV_ITEMS.filter((item) => !MOBILE_PRIMARY_HREFS.includes(item.href));

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const desktopTabClass = (active: boolean) =>
  `inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm border-b-2 px-3 text-sm font-semibold transition-colors ${
    active
      ? "border-foreground text-foreground"
      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
  }`;

const tabbarLinkClass = (active: boolean) =>
  `flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-xs font-semibold ${
    active ? "text-foreground" : "text-muted-foreground"
  }`;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Base UI's Popover only auto-closes on outside-press/Escape, not on an internal <Link>
  // click that navigates away - close it explicitly whenever the route actually changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const {
    airports,
    selectedAirportCode,
    selectedParkingLotId,
    selectedAirportLots,
    onAirportChange,
    onParkingLotChange,
    onRefresh,
  } = useDashboard();
  const secondaryActive = MOBILE_SECONDARY.some((item) => isActivePath(pathname, item.href));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-background">
        <div className="page-shell">
          <div className="page-header">
            <h1>공항 주차 현황</h1>
          </div>

          <div className="control-band">
            <label className="field">
              <span>공항 선택</span>
              <select
                aria-label="공항 선택"
                className="input"
                value={selectedAirportCode}
                onChange={(event) => onAirportChange(event.target.value)}
              >
                {airports.map((airport) => (
                  <option key={airport.code} value={airport.code}>
                    {airport.name_ko}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>세부 주차장</span>
              <select
                aria-label="세부 주차장"
                className="input"
                value={selectedParkingLotId ?? "all"}
                onChange={(event) =>
                  onParkingLotChange(event.target.value === "all" ? null : Number(event.target.value))
                }
              >
                <option value="all">전체 주차장</option>
                {selectedAirportLots.map((parkingLot) => (
                  <option key={parkingLot.id} value={parkingLot.id}>
                    {parkingLot.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="action-stack">
              <Button className="button secondary" variant="secondary" type="button" onClick={onRefresh}>
                새로고침
              </Button>
            </div>
          </div>

          {/* 데스크톱: 상단 탭 전부 인라인 노출. 모바일에서는 하단 탭바가 대신하므로 숨긴다. */}
          <nav className="hidden gap-1 pb-3 lg:flex" aria-label="주요 메뉴">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={desktopTabClass(active)}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      {/* 모바일 하단 탭바 — 4 primary + 더보기. 데스크톱(lg)에서는 상단 탭이 대신한다. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background lg:hidden"
        aria-label="하단 메뉴"
      >
        <ul className="m-0 grid list-none grid-cols-5 p-0 pb-[env(safe-area-inset-bottom)]">
          {MOBILE_PRIMARY.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={tabbarLinkClass(active)}>
                  <Icon className="size-5" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <Popover open={moreOpen} onOpenChange={setMoreOpen}>
              <PopoverTrigger className={`${tabbarLinkClass(secondaryActive)} w-full`}>
                <MoreHorizontal className="size-5" aria-hidden="true" />
                <span>더보기</span>
              </PopoverTrigger>
              <PopoverContent align="end" side="top" className="w-44 p-1">
                <ul className="m-0 list-none space-y-0.5 p-0">
                  {MOBILE_SECONDARY.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-11 items-center gap-2 rounded-sm px-3 text-sm font-semibold ${
                            active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon className="size-4" aria-hidden="true" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </PopoverContent>
            </Popover>
          </li>
        </ul>
      </nav>
    </div>
  );
}
