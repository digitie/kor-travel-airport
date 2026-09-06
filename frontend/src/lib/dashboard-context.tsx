"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { buildApiClient } from "@/lib/api";
import {
  readStoredDashboardSelection,
  writeStoredDashboardSelection,
} from "@/lib/dashboard-preferences";
import { formatDateTime } from "@/lib/format";
import type {
  Airport,
  CollectorStatusResponse,
  DashboardBootstrapResponse,
  HolidaySummaryResponse,
  ParkingLot,
  ParkingStatus,
} from "@/lib/types";

type DashboardProviderProps = {
  children: ReactNode;
  apiBaseUrl?: string;
  autoRefreshIntervalMs?: number;
};

const DASHBOARD_AUTO_REFRESH_INTERVAL_MS = 15_000;

function buildBackendUpdateMarker(status: CollectorStatusResponse): string {
  return `${status.latest_snapshot_observed_at ?? ""}|${status.latest_snapshot_collected_at ?? ""}`;
}

function buildCollectorCooldownMessage(status: CollectorStatusResponse): string {
  const cooldownMinutes = Math.max(1, Math.round(status.manual_collect_min_interval_seconds / 60));
  if (status.manual_collect_available_at) {
    return `마지막 업데이트 후 ${cooldownMinutes}분이 지나지 않았습니다. ${formatDateTime(status.manual_collect_available_at)} 이후 다시 시도해 주세요.`;
  }
  return `마지막 업데이트 후 ${cooldownMinutes}분이 지나지 않았습니다. 잠시 후 다시 시도해 주세요.`;
}

type DashboardContextValue = {
  api: ReturnType<typeof buildApiClient>;
  airports: Airport[];
  selectedAirportCode: string;
  selectedParkingLotId: number | null;
  selectedAirport: Airport | null;
  selectedAirportLots: ParkingLot[];
  selectedParkingLotName: string | null;
  scopeItems: ParkingStatus[];
  holidaySummary: HolidaySummaryResponse | null;
  collectorStatus: CollectorStatusResponse | null;
  /** Bumped whenever bootstrap-level data (current items/collector/holidays) is refetched -
   *  route pages that fetch their own supplementary data key an effect off this so a silent
   *  background refresh (polling) also refreshes what they show, without re-fetching on every
   *  render. */
  dataVersion: number;
  loading: boolean;
  collecting: boolean;
  error: string | null;
  actionMessage: string | null;
  actionMessageIsError: boolean;
  onAirportChange: (airportCode: string) => void;
  onParkingLotChange: (parkingLotId: number | null) => void;
  onRefresh: () => void;
  onManualCollect: () => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  children,
  apiBaseUrl,
  autoRefreshIntervalMs = DASHBOARD_AUTO_REFRESH_INTERVAL_MS,
}: DashboardProviderProps) {
  const api = useMemo(() => buildApiClient(apiBaseUrl), [apiBaseUrl]);
  const mountedRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const latestBackendUpdateMarkerRef = useRef<string | null>(null);
  const backendRefreshInFlightRef = useRef(false);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [selectedAirportCode, setSelectedAirportCode] = useState("");
  const [selectedParkingLotId, setSelectedParkingLotId] = useState<number | null>(null);
  const [currentItems, setCurrentItems] = useState<ParkingStatus[]>([]);
  const [holidaySummary, setHolidaySummary] = useState<HolidaySummaryResponse | null>(null);
  const [collectorStatus, setCollectorStatus] = useState<CollectorStatusResponse | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionMessageIsError, setActionMessageIsError] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAirportData = useCallback(
    async (
      airportCode: string,
      parkingLotId: number | null = null,
      options: { showLoading?: boolean } = {}
    ) => {
      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;
      const showLoading = options.showLoading ?? true;

      if (showLoading) {
        setLoading(true);
        setHolidaySummary(null);
      }
      setError(null);

      try {
        const bootstrap: DashboardBootstrapResponse = await api.getDashboardBootstrap(airportCode);
        if (!mountedRef.current || loadRequestIdRef.current !== requestId) {
          return;
        }
        setCurrentItems(bootstrap.current.items);
        setCollectorStatus(bootstrap.collector);
        latestBackendUpdateMarkerRef.current = buildBackendUpdateMarker(bootstrap.collector);
        setHolidaySummary(bootstrap.holidays);
        setDataVersion((version) => version + 1);
        if (showLoading) {
          setLoading(false);
        }
      } catch (caughtError) {
        if (!mountedRef.current || loadRequestIdRef.current !== requestId) {
          return;
        }
        setActionMessageIsError(true);
        setError(caughtError instanceof Error ? caughtError.message : "대시보드 데이터를 불러오지 못했습니다.");
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [api]
  );

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const bootstrapPayload: DashboardBootstrapResponse = await api.getDashboardBootstrap();
        const loadedAirports = bootstrapPayload.airports;
        if (!active) {
          return;
        }

        setAirports(loadedAirports);
        const storedSelection = readStoredDashboardSelection();
        const initialAirport =
          loadedAirports.find((airport) => airport.code === storedSelection?.airportCode) ?? loadedAirports[0] ?? null;
        const initialParkingLotId =
          storedSelection?.parkingLotId != null &&
          initialAirport?.parking_lots.some(
            (parkingLot) => parkingLot.is_active && parkingLot.id === storedSelection.parkingLotId
          )
            ? storedSelection.parkingLotId
            : null;
        const initialAirportCode = initialAirport?.code ?? "";

        setSelectedAirportCode(initialAirportCode);
        setSelectedParkingLotId(initialParkingLotId);

        if (initialAirportCode && active) {
          setCurrentItems(bootstrapPayload.current.items);
          setCollectorStatus(bootstrapPayload.collector);
          latestBackendUpdateMarkerRef.current = buildBackendUpdateMarker(bootstrapPayload.collector);
          setHolidaySummary(bootstrapPayload.holidays);
          setDataVersion((version) => version + 1);
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (caughtError) {
        if (!active) {
          return;
        }
        setError(caughtError instanceof Error ? caughtError.message : "공항 목록을 불러오지 못했습니다.");
        setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [api]);

  useEffect(() => {
    if (!selectedAirportCode) {
      return;
    }

    let active = true;

    async function refreshVisibleDashboard() {
      if (document.visibilityState === "hidden") {
        return;
      }

      try {
        const status = await api.getCollectorStatus();
        if (!active || !mountedRef.current) {
          return;
        }

        const nextMarker = buildBackendUpdateMarker(status);
        const previousMarker = latestBackendUpdateMarkerRef.current;
        setCollectorStatus(status);

        if (previousMarker === null) {
          latestBackendUpdateMarkerRef.current = nextMarker;
          return;
        }

        if (nextMarker === previousMarker || backendRefreshInFlightRef.current) {
          return;
        }

        backendRefreshInFlightRef.current = true;
        await loadAirportData(selectedAirportCode, selectedParkingLotId, { showLoading: false });
      } catch {
        // Keep the last known dashboard visible; the next poll or focus event will retry.
      } finally {
        backendRefreshInFlightRef.current = false;
      }
    }

    const refreshTimer = window.setInterval(refreshVisibleDashboard, autoRefreshIntervalMs);
    window.addEventListener("focus", refreshVisibleDashboard);
    document.addEventListener("visibilitychange", refreshVisibleDashboard);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshVisibleDashboard);
      document.removeEventListener("visibilitychange", refreshVisibleDashboard);
    };
  }, [api, autoRefreshIntervalMs, loadAirportData, selectedAirportCode, selectedParkingLotId]);

  useEffect(() => {
    if (!selectedAirportCode) {
      return;
    }

    writeStoredDashboardSelection({
      airportCode: selectedAirportCode,
      parkingLotId: selectedParkingLotId,
    });
  }, [selectedAirportCode, selectedParkingLotId]);

  const selectedAirport = useMemo(
    () => airports.find((airport) => airport.code === selectedAirportCode) ?? null,
    [airports, selectedAirportCode]
  );
  const selectedAirportLots = useMemo(
    () => selectedAirport?.parking_lots.filter((parkingLot) => parkingLot.is_active) ?? [],
    [selectedAirport]
  );
  const selectedParkingLot = selectedAirportLots.find((parkingLot) => parkingLot.id === selectedParkingLotId) ?? null;

  const scopeItems = useMemo(
    () =>
      currentItems.filter(
        (item) =>
          item.airport_code === selectedAirportCode &&
          (selectedParkingLotId === null || item.parking_lot_id === selectedParkingLotId)
      ),
    [currentItems, selectedAirportCode, selectedParkingLotId]
  );

  async function handleManualCollect() {
    setActionMessage(null);
    setActionMessageIsError(false);
    setError(null);

    if (collectorStatus?.manual_collect_blocked) {
      setActionMessage(buildCollectorCooldownMessage(collectorStatus));
      setActionMessageIsError(true);
      return;
    }

    try {
      setCollecting(true);
      const summary = await api.runCollector();
      await loadAirportData(selectedAirportCode, selectedParkingLotId);
      setActionMessageIsError(false);
      setActionMessage(`즉시 수집을 완료했습니다. 신규 스냅샷 ${summary.snapshot_count}건을 저장했습니다.`);
    } catch (caughtError) {
      setActionMessageIsError(true);
      setActionMessage(caughtError instanceof Error ? caughtError.message : "즉시 수집 실행에 실패했습니다.");
    } finally {
      setCollecting(false);
    }
  }

  const value: DashboardContextValue = {
    api,
    airports,
    selectedAirportCode,
    selectedParkingLotId,
    selectedAirport,
    selectedAirportLots,
    selectedParkingLotName: selectedParkingLot?.name ?? null,
    scopeItems,
    holidaySummary,
    collectorStatus,
    dataVersion,
    loading,
    collecting,
    error,
    actionMessage,
    actionMessageIsError,
    onAirportChange: (airportCode) => {
      startTransition(() => {
        setSelectedAirportCode(airportCode);
        setSelectedParkingLotId(null);
        setActionMessage(null);
        setActionMessageIsError(false);
      });
      void loadAirportData(airportCode, null);
    },
    onParkingLotChange: (parkingLotId) => {
      startTransition(() => {
        setSelectedParkingLotId(parkingLotId);
        setActionMessage(null);
        setActionMessageIsError(false);
      });
      void loadAirportData(selectedAirportCode, parkingLotId);
    },
    onRefresh: () => {
      setActionMessage(null);
      setActionMessageIsError(false);
      if (selectedAirportCode) {
        void loadAirportData(selectedAirportCode, selectedParkingLotId);
      }
    },
    onManualCollect: () => {
      if (selectedAirportCode) {
        void handleManualCollect();
      }
    },
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
