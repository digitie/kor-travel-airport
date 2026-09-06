"use client";

import { useEffect, useState } from "react";

import { useDashboard } from "@/lib/dashboard-context";
import type {
  FlightStatusResponse,
  HolidayPatternResponse,
  ParkingTimeSeriesResponse,
  ThresholdEvent,
  ThresholdInsightsResponse,
  WeekdayHourlyPattern,
} from "@/lib/types";

type AnalyticsState = {
  loading: boolean;
  error: string | null;
  thresholdEvents: ThresholdEvent[];
  thresholdInsights: ThresholdInsightsResponse | null;
  weekdayHourlyPatterns: WeekdayHourlyPattern[];
  holidayPatterns: HolidayPatternResponse | null;
  timeSeries: ParkingTimeSeriesResponse | null;
  flightStatus: FlightStatusResponse | null;
};

const INITIAL_STATE: AnalyticsState = {
  loading: true,
  error: null,
  thresholdEvents: [],
  thresholdInsights: null,
  weekdayHourlyPatterns: [],
  holidayPatterns: null,
  timeSeries: null,
  flightStatus: null,
};

function buildFlightStatusError(airportCode: string, caughtError: unknown): FlightStatusResponse {
  return {
    generated_at: new Date().toISOString(),
    airport_code: airportCode,
    local_date: new Date().toISOString().slice(0, 10),
    source: "client",
    status: "client_error",
    error_message: caughtError instanceof Error ? caughtError.message : "비행편 정보를 불러오지 못했습니다.",
    items: [],
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  buildFallback: () => T,
  onTimeoutId?: (id: ReturnType<typeof setTimeout>) => void
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(buildFallback()), timeoutMs);
    onTimeoutId?.(timeoutId);
  });

  return Promise.race([
    promise.finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }),
    timeout,
  ]);
}

/**
 * Fetches the dashboard analytics bundle (threshold/weekday/holiday/timeseries) plus flight
 * status for the currently-selected airport/lot. Only mounted by routes that need it
 * (/analytics, /history) - this replaces the old IntersectionObserver-gated lazy load with
 * route-mount-gated loading, and re-fetches whenever `dataVersion` bumps (a background poll
 * found new data) even if the airport/lot selection itself hasn't changed.
 */
export function useAnalyticsData(flightStatusTimeoutMs = 6_000): AnalyticsState {
  const { api, selectedAirportCode, selectedParkingLotId, dataVersion } = useDashboard();
  const [state, setState] = useState<AnalyticsState>(INITIAL_STATE);

  useEffect(() => {
    if (!selectedAirportCode) {
      return;
    }

    let active = true;
    let flightStatusTimeoutId: ReturnType<typeof setTimeout> | null = null;
    setState((current) => ({ ...current, loading: true, error: null }));

    async function load() {
      try {
        const flightStatusRequest = withTimeout(
          api.getFlightStatus(selectedAirportCode).catch((caughtError) => buildFlightStatusError(selectedAirportCode, caughtError)),
          flightStatusTimeoutMs,
          () => buildFlightStatusError(selectedAirportCode, new Error("비행편 정보 응답이 지연되어 주차 현황을 먼저 표시합니다.")),
          (id) => {
            flightStatusTimeoutId = id;
          }
        );
        const analyticsRequest = api.getDashboardAnalytics(selectedAirportCode, selectedParkingLotId);
        const [analytics, flights] = await Promise.all([analyticsRequest, flightStatusRequest]);

        if (!active) {
          return;
        }
        setState({
          loading: false,
          error: null,
          thresholdEvents: analytics.threshold_events,
          thresholdInsights: analytics.threshold_insights,
          weekdayHourlyPatterns: analytics.weekday_hour_patterns,
          holidayPatterns: analytics.holiday_patterns,
          timeSeries: analytics.time_series,
          flightStatus: flights,
        });
      } catch (caughtError) {
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          loading: false,
          error: caughtError instanceof Error ? caughtError.message : "분석 데이터를 불러오지 못했습니다.",
        }));
      }
    }

    void load();
    return () => {
      active = false;
      if (flightStatusTimeoutId) {
        clearTimeout(flightStatusTimeoutId);
      }
    };
    // selectedAirportCode/selectedParkingLotId are intentionally excluded: every airport/lot
    // change goes through DashboardProvider's loadAirportData, which bumps dataVersion on
    // success. Keying only on dataVersion (plus mount) avoids firing this fetch twice per
    // selection change - once for the selection state update, once for the dataVersion bump -
    // against the same (now-current) selectedAirportCode/selectedParkingLotId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, dataVersion, flightStatusTimeoutMs]);

  return state;
}
