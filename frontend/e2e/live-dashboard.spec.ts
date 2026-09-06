import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/analytics", "/history", "/fees", "/backup"] as const;

test.describe("live parking-radar dashboard", () => {
  test("paints current data, remembers selection, and exposes the backup route", async ({ page, context }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/parking-radar/i);
    await expect(page.getByRole("combobox", { name: "공항 선택" })).toBeVisible();
    await expect(page.locator('[data-testid="desktop-lot-table"], [data-testid="mobile-lot-grid"]').first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('[data-testid="desktop-lot-table"] tbody tr, [data-testid="mobile-lot-grid"] article').first()).toBeVisible({
      timeout: 20_000,
    });

    const apiHealth = await page.request.get("/api/backend/health");
    expect(apiHealth.status()).toBe(200);
    const healthPayload = await apiHealth.json();
    expect(healthPayload.status).toBe("ok");
    const expectedReleaseSha = process.env.EXPECTED_RELEASE_SHA;
    if (expectedReleaseSha) {
      expect(healthPayload.release_sha).toBe(expectedReleaseSha);
    }

    const collectorStatus = await page.request.get("/api/backend/v1/admin/collector-status");
    expect(collectorStatus.status()).toBe(200);
    const collectorPayload = await collectorStatus.json();
    expect(collectorPayload.client_mode).toBe("live");
    expect(collectorPayload.scheduler_enabled).toBe(true);
    expect(collectorPayload.collect_interval_seconds).toBe(300);
    expect(collectorPayload.effective_collect_interval_seconds).toBe(180);
    expect(collectorPayload.last_run?.status).toBe("success");
    expect(collectorPayload.last_run?.trigger).toBe("scheduler");
    expect(collectorPayload.last_run?.raw_response_count).toBeGreaterThan(0);
    const lastRunFinishedAt = Date.parse(collectorPayload.last_run?.finished_at);
    expect(Number.isFinite(lastRunFinishedAt)).toBe(true);
    const lastRunAge = Date.now() - lastRunFinishedAt;
    expect(lastRunAge).toBeGreaterThanOrEqual(0);
    expect(lastRunAge).toBeLessThanOrEqual(300_000);
    const latestObservedAt = Date.parse(collectorPayload.latest_snapshot_observed_at);
    expect(Number.isFinite(latestObservedAt)).toBe(true);
    const latestAge = Date.now() - latestObservedAt;
    expect(latestAge).toBeGreaterThanOrEqual(0);
    expect(latestAge).toBeLessThanOrEqual(300_000);

    const airportSelect = page.getByRole("combobox", { name: "공항 선택" });
    await expect.poll(() => airportSelect.locator("option").count(), { timeout: 20_000 }).toBeGreaterThan(0);
    const airportOptions = await airportSelect.locator("option").allTextContents();
    expect(airportOptions.length).toBeGreaterThan(0);
    if (airportOptions.length > 1) {
      await airportSelect.selectOption({ index: 1 });
      await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === "parking-radar-selection")).toBe(true);
    }

    // The shared selection lives in DashboardProvider, so it must survive a route change.
    await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "백업" }).click();
    await expect(page).toHaveURL(/\/backup$/);
    await expect(page.getByRole("button", { name: /백업 \/ 복원/ })).toBeVisible();
    await page.getByRole("button", { name: /백업 \/ 복원/ }).click();
    await expect(page.getByText(/별도 인증 없이 제공되는 운영 도구/)).toBeVisible();
    await expect(page.getByRole("button", { name: "새 백업 만들기" })).toBeVisible();
    if (process.env.EXERCISE_LIVE_BACKUP === "true") {
      await page.getByRole("button", { name: "새 백업 만들기" }).click();
      await expect(page.getByText(/백업을 만들었습니다:/)).toBeVisible({ timeout: 180_000 });
    }
    await expect(page.locator('[data-testid="backup-empty-state"], [data-testid="backup-list"]').first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("desktop nav switches routes and marks the active tab", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const desktopNav = page.getByRole("navigation", { name: "주요 메뉴" });
    await expect(desktopNav.getByRole("link", { name: "현황" })).toHaveAttribute("aria-current", "page");

    await desktopNav.getByRole("link", { name: "분석" }).click();
    await expect(page).toHaveURL(/\/analytics$/);
    await expect(desktopNav.getByRole("link", { name: "분석" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("tab", { name: "요일별 패턴" })).toBeVisible();

    await page.getByRole("tab", { name: "일별 흐름" }).click();
    await expect(page.getByRole("tab", { name: "일별 흐름" })).toHaveAttribute("aria-selected", "true");
  });

  test("mobile bottom tabbar navigates routes and tucks 백업 behind 더보기", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const bottomNav = page.getByRole("navigation", { name: "하단 메뉴" });
    await expect(bottomNav.getByRole("link", { name: "현황" })).toHaveAttribute("aria-current", "page");

    await bottomNav.getByRole("link", { name: "과거조회" }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(bottomNav.getByRole("link", { name: "과거조회" })).toHaveAttribute("aria-current", "page");

    await bottomNav.getByRole("button", { name: "더보기" }).click();
    await page.getByRole("link", { name: "백업" }).click();
    await expect(page).toHaveURL(/\/backup$/);
  });

  for (const width of [320, 375, 414, 768]) {
    for (const route of ROUTES) {
      test(`does not create page overflow at ${width}px on ${route}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("combobox", { name: "공항 선택" })).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(1);
      });
    }
  }
});
