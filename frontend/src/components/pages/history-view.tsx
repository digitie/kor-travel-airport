"use client";

import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import { HistoryChart } from "@/components/history-chart";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDashboard } from "@/lib/dashboard-context";
import { historyLabel, summarizeTimeSeriesAvailability } from "@/lib/dashboard-view-helpers";
import { toDateKey } from "@/lib/format";
import type { ParkingTimeSeriesResponse } from "@/lib/types";

const DEFAULT_RELATIVE_DAYS = 7;

function formatRangeLabel(range: DateRange | undefined): string {
  if (!range?.from || !range?.to) {
    return "날짜 범위 선택";
  }
  return `${toDateKey(range.from)} ~ ${toDateKey(range.to)}`;
}

export function HistoryView() {
  const {
    api,
    selectedAirportCode,
    selectedParkingLotId,
    selectedAirport,
    selectedParkingLotName,
    holidaySummary,
    collectorStatus,
    dataVersion,
  } = useDashboard();
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [timeSeries, setTimeSeries] = useState<ParkingTimeSeriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scopeLabel = historyLabel(selectedParkingLotName, selectedAirport?.name_ko);
  const earliestSelectable = collectorStatus?.earliest_snapshot_observed_at
    ? new Date(collectorStatus.earliest_snapshot_observed_at)
    : undefined;
  const today = new Date();
  const hasCustomRange = Boolean(range?.from && range?.to);

  useEffect(() => {
    if (!selectedAirportCode) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const request =
      range?.from && range?.to
        ? api.getTimeSeries(selectedAirportCode, {
            parkingLotId: selectedParkingLotId,
            startDate: toDateKey(range.from),
            endDate: toDateKey(range.to),
          })
        : api.getTimeSeries(selectedAirportCode, { parkingLotId: selectedParkingLotId, days: DEFAULT_RELATIVE_DAYS });

    request
      .then((response) => {
        if (!active) {
          return;
        }
        setTimeSeries(response);
        setLoading(false);
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }
        setError(caughtError instanceof Error ? caughtError.message : "과거 자료를 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
    // range is read directly (not spread into primitives) - a new Date selection always
    // produces a new object, so this effect re-runs exactly when the user picks a new range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, selectedAirportCode, selectedParkingLotId, dataVersion, range]);

  const summary = timeSeries ? summarizeTimeSeriesAvailability(timeSeries.items) : null;

  return (
    <div className="page-shell">
      <header className="page-header">
        <h2>과거 자료 조회</h2>
      </header>

      <div className="action-stack">
        <Popover>
          <PopoverTrigger className="button secondary" type="button">
            {formatRangeLabel(range)}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              defaultMonth={range?.from ?? earliestSelectable}
              disabled={[
                ...(earliestSelectable ? [{ before: earliestSelectable }] : []),
                { after: today },
              ]}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        {hasCustomRange ? (
          <Button className="button secondary" variant="secondary" type="button" onClick={() => setRange(undefined)}>
            최근 {DEFAULT_RELATIVE_DAYS}일 보기
          </Button>
        ) : null}
      </div>

      {error ? (
        <Alert className="notice error" variant="destructive">
          {error}
        </Alert>
      ) : null}
      {loading ? <p className="notice">데이터를 불러오는 중입니다.</p> : null}

      {summary && (summary.min !== null || summary.max !== null || summary.average !== null) ? (
        <section className="detail-ribbon">
          <Card className="metric-card detail-card">
            <span>최소 잔여 주차면</span>
            <strong>{summary.min}대</strong>
          </Card>
          <Card className="metric-card detail-card">
            <span>평균 잔여 주차면</span>
            <strong>{summary.average}대</strong>
          </Card>
          <Card className="metric-card detail-card">
            <span>최대 잔여 주차면</span>
            <strong>{summary.max}대</strong>
          </Card>
        </section>
      ) : null}

      <HistoryChart holidays={holidaySummary?.items ?? []} series={timeSeries} scopeLabel={scopeLabel} />
    </div>
  );
}
