"use client";

import { HistoryChart } from "@/components/history-chart";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { useDashboard } from "@/lib/dashboard-context";
import { historyLabel } from "@/lib/dashboard-view-helpers";

export function HistoryView() {
  const { selectedAirport, selectedParkingLotName, holidaySummary } = useDashboard();
  const { timeSeries } = useAnalyticsData();
  const scopeLabel = historyLabel(selectedParkingLotName, selectedAirport?.name_ko);

  return (
    <div className="page-shell">
      <header className="page-header">
        <h2>과거 자료 조회</h2>
      </header>
      <HistoryChart holidays={holidaySummary?.items ?? []} series={timeSeries} scopeLabel={scopeLabel} />
    </div>
  );
}
