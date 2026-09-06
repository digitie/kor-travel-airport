"use client";

import { HistoryChart } from "@/components/history-chart";
import { Alert } from "@/components/ui/alert";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { useDashboard } from "@/lib/dashboard-context";
import { historyLabel } from "@/lib/dashboard-view-helpers";

export function HistoryView() {
  const { selectedAirport, selectedParkingLotName, holidaySummary } = useDashboard();
  const { error, timeSeries } = useAnalyticsData();
  const scopeLabel = historyLabel(selectedParkingLotName, selectedAirport?.name_ko);

  return (
    <div className="page-shell">
      <header className="page-header">
        <h2>과거 자료 조회</h2>
      </header>
      {error ? (
        <Alert className="notice error" variant="destructive">
          {error}
        </Alert>
      ) : null}
      <HistoryChart holidays={holidaySummary?.items ?? []} series={timeSeries} scopeLabel={scopeLabel} />
    </div>
  );
}
