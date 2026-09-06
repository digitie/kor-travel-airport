"use client";

import { FeeCalculator } from "@/components/fee-calculator";
import { Alert } from "@/components/ui/alert";
import { useDashboard } from "@/lib/dashboard-context";

export function FeesView() {
  const { airports, selectedAirportCode, api, error } = useDashboard();

  if (airports.length === 0) {
    return (
      <div className="page-shell">
        {/* T-038 Hallmark audit: a screen reader is not guaranteed to announce a live
            region that arrives already-mounted with its final content - keep this
            announcer permanently mounted and let only its content change. */}
        <p className="sr-only" aria-live="polite">
          {!error ? "공항 목록을 불러오는 중입니다." : ""}
        </p>
        {error ? (
          <Alert className="notice error" variant="destructive">
            {error}
          </Alert>
        ) : (
          <p className="notice" aria-hidden="true">
            공항 목록을 불러오는 중입니다.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="page-shell">
      <FeeCalculator
        airports={airports}
        initialAirportCode={selectedAirportCode || airports[0].code}
        onCalculate={api.calculateFee}
      />
    </div>
  );
}
