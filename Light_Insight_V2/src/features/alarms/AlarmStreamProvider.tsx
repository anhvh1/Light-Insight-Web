import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as signalR from '@microsoft/signalr';
import type { Alarm } from '@/types';
import { alarmApi, type AlarmFilters } from '@/lib/alarm-api';
import { normalizeApiAlarm, normalizeSignalRAlarm, type AlarmPayload } from './alarm-mapper';

const HUB_BASE_URL = import.meta.env.VITE_ALARM_HUB_URL;
const HUB_URL = HUB_BASE_URL ? `${HUB_BASE_URL.replace(/\/$/, '')}/alarm-hub` : '';

// TODO: doi ten event cho dung voi hub backend dang emit
const HUB_EVENT_NAME = 'ReceiveAlarm';
const SERVER_PAGE_SIZE = 100;
const MAX_DUPLICATE_PAGE_SKIPS = 20;

type AlarmStreamContextValue = {
  alarms: Alarm[];
  connected: boolean;
  loading: boolean;
  currentPage: number;
  pageSize: number;
  canNextPage: boolean;
  newCount: number;
  bellCount: number;
  pendingRealtimeCount: number;
  filters: AlarmFilters;
  refreshAlarms: (nextFilters?: AlarmFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  setIsAtTop: (isAtTop: boolean) => void;
  clearBellCount: () => void;
  clearPendingRealtimeCount: () => void;
  clearNewFlags: () => void;
  markAlarmAsRead: (alarmId: string) => void;
};

const AlarmStreamContext = createContext<AlarmStreamContextValue | null>(null);

export function AlarmStreamProvider({ children }: { children: ReactNode }) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [canNextPage, setCanNextPage] = useState(true);
  const [filters, setFilters] = useState<AlarmFilters>({});
  const [bellCount, setBellCount] = useState(0);
  const [pendingRealtimeCount, setPendingRealtimeCount] = useState(0);
  const currentPageRef = useRef(1);
  const filtersRef = useRef<AlarmFilters>({});
  const alarmsRef = useRef<Alarm[]>([]);
  const isAtTopRef = useRef(true);

  const clearBellCount = useCallback(() => {
    setBellCount(0);
  }, []);
  const setIsAtTop = useCallback((isAtTop: boolean) => {
    isAtTopRef.current = isAtTop;
    if (isAtTop) {
      setPendingRealtimeCount(0);
    }
  }, []);

  const normalizeText = (value?: string) => (value ?? '').trim().toLowerCase();
  const normalizeStatus = (value?: string) => {
    const normalized = normalizeText(value);
    if (normalized === 'closed') return 'close';
    return normalized;
  };
  const normalizePriority = (value?: string) => normalizeText(value);
  const parseDateLike = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const matchesFilters = useCallback((alarm: Alarm, payload: AlarmPayload, activeFilters: AlarmFilters) => {
    if (activeFilters.priorityName) {
      if (normalizePriority(alarm.pri) !== normalizePriority(activeFilters.priorityName)) {
        return false;
      }
    }

    if (activeFilters.stateName) {
      if (normalizeStatus(alarm.status) !== normalizeStatus(activeFilters.stateName)) {
        return false;
      }
    }

    if (activeFilters.message) {
      if (normalizeText(alarm.title) !== normalizeText(activeFilters.message)) {
        return false;
      }
    }

    if (activeFilters.source) {
      const sourceValue = normalizeText(payload.source ?? alarm.src);
      if (sourceValue !== normalizeText(activeFilters.source)) {
        return false;
      }
    }

    const fromDate = parseDateLike(activeFilters.fromTime);
    const toDate = parseDateLike(activeFilters.toTime);
    const eventDate = parseDateLike(payload.time);
    if ((fromDate || toDate) && !eventDate) {
      return false;
    }
    if (fromDate && eventDate && eventDate < fromDate) {
      return false;
    }
    if (toDate && eventDate && eventDate > toDate) {
      return false;
    }

    return true;
  }, []);

  const clearPendingRealtimeCount = useCallback(() => {
    setPendingRealtimeCount(0);
  }, []);

  const clearNewFlags = useCallback(() => {
    setAlarms((prev) => prev.map((alarm) => ({ ...alarm, isNew: false })));
  }, []);

  const markAlarmAsRead = useCallback((alarmId: string) => {
    setBellCount((prev) => Math.max(0, prev - 1));
    setAlarms((prev) =>
      prev.map((alarm) =>
        alarm.id === alarmId && alarm.isNew ? { ...alarm, isNew: false } : alarm
      )
    );
  }, []);

  const fetchFirstPage = useCallback(async (activeFilters: AlarmFilters) => {
    setLoading(true);
    try {
      const rows = await alarmApi.getAll({
        page: 1,
        pageSize: SERVER_PAGE_SIZE,
        ...activeFilters,
      });
      const nextAlarms = rows.map(normalizeApiAlarm);
      setAlarms(nextAlarms);
      setCurrentPage(1);
      currentPageRef.current = 1;
      setCanNextPage(rows.length >= SERVER_PAGE_SIZE);
      setPendingRealtimeCount(0);
      return true;
    } catch (error) {
      console.error('Failed to load alarm list:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAlarms = useCallback(
    async (nextFilters?: AlarmFilters) => {
      let merged: AlarmFilters = {};
      setFilters((prev) => {
        merged = { ...prev, ...(nextFilters ?? {}) };
        filtersRef.current = merged;
        return merged;
      });
      await fetchFirstPage(merged);
    },
    [fetchFirstPage],
  );

  const loadMore = useCallback(async () => {
    if (loading || !canNextPage) return;
    setLoading(true);
    try {
      const existingIds = new Set(alarmsRef.current.map((a) => a.id));
      const batchNew: Alarm[] = [];
      let pageToFetch = currentPage + 1;
      let lastPageFetched = currentPage;
      let lastRowsLength = 0;

      let skips = 0;
      while (skips < MAX_DUPLICATE_PAGE_SKIPS) {
        skips += 1;
        const rows = await alarmApi.getAll({
          page: pageToFetch,
          pageSize: SERVER_PAGE_SIZE,
          ...filters,
        });
        lastRowsLength = rows.length;
        lastPageFetched = pageToFetch;
        const incoming = rows.map(normalizeApiAlarm);
        const appended = incoming.filter((a) => !existingIds.has(a.id));
        for (const a of appended) {
          existingIds.add(a.id);
          batchNew.push(a);
        }

        if (rows.length < SERVER_PAGE_SIZE) break;
        if (appended.length > 0) break;
        pageToFetch += 1;
      }

      setAlarms((prev) => {
        const ids = new Set(prev.map((a) => a.id));
        const extra = batchNew.filter((a) => !ids.has(a.id));
        return [...prev, ...extra];
      });
      setCurrentPage(lastPageFetched);
      currentPageRef.current = lastPageFetched;
      setCanNextPage(lastRowsLength >= SERVER_PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load more alarms:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, canNextPage, currentPage, filters]);

  const addAlarm = useCallback((payload: AlarmPayload) => {
    const alarm = normalizeSignalRAlarm(payload);
    const activeFilters = filtersRef.current;
    if (!matchesFilters(alarm, payload, activeFilters)) {
      return;
    }
    setBellCount((prev) => prev + 1);
    if (!isAtTopRef.current) {
      setPendingRealtimeCount((prev) => prev + 1);
      return;
    }
    setAlarms((prev) => {
      const withoutDuplicate = prev.filter((item) => item.id !== alarm.id);
      return [alarm, ...withoutDuplicate];
    });
  }, [matchesFilters]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    alarmsRef.current = alarms;
  }, [alarms]);

  useEffect(() => {
    if (!HUB_URL) {
      console.error('Missing VITE_ALARM_HUB_URL environment variable.');
      return;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { withCredentials: false })
      .withAutomaticReconnect()
      .build();

    connection.on(HUB_EVENT_NAME, (data: AlarmPayload) => {
      addAlarm(data);
    });

    connection.onreconnecting(() => setConnected(false));
    connection.onreconnected(() => setConnected(true));
    connection.onclose(() => setConnected(false));

    connection
      .start()
      .then(() => setConnected(true))
      .catch((err) => console.error('SignalR connection failed:', err));

    return () => {
      connection.off(HUB_EVENT_NAME);
      void connection.stop();
    };
  }, [addAlarm]);

  const newCount = useMemo(() => alarms.filter((alarm) => alarm.isNew).length, [alarms]);
  const value = useMemo(
    () => ({
      alarms,
      connected,
      loading,
      currentPage,
      pageSize: SERVER_PAGE_SIZE,
      canNextPage,
      newCount,
      bellCount,
      pendingRealtimeCount,
      filters,
      refreshAlarms,
      loadMore,
      setIsAtTop,
      clearBellCount,
      clearPendingRealtimeCount,
      clearNewFlags,
      markAlarmAsRead,
    }),
    [
      alarms,
      connected,
      loading,
      currentPage,
      canNextPage,
      newCount,
      bellCount,
      pendingRealtimeCount,
      filters,
      refreshAlarms,
      loadMore,
      setIsAtTop,
      clearBellCount,
      clearPendingRealtimeCount,
      clearNewFlags,
      markAlarmAsRead,
    ]
  );

  return (
    <AlarmStreamContext.Provider value={value}>
      {children}
    </AlarmStreamContext.Provider>
  );
}

export function useAlarmStream() {
  const context = useContext(AlarmStreamContext);

  if (!context) {
    throw new Error('useAlarmStream must be used within AlarmStreamProvider');
  }

  return context;
}