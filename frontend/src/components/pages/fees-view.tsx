"use client";

import { FeeCalculator } from "@/components/fee-calculator";
import { useDashboard } from "@/lib/dashboard-context";

export function FeesView() {
  const { airports, selectedAirportCode, api } = useDashboard();

  if (airports.length === 0) {
    return (
      <div className="page-shell">
        <p className="notice">공항 목록을 불러오는 중입니다.</p>
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
