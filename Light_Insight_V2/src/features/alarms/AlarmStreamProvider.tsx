import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as signalR from '@microsoft/signalr';
import type { Alarm } from '@/types';
import { alarmApi, type AlarmFilters } from '@/lib/alarm-api';
import { normalizeApiAlarm, normalizeSignalRAlarm, type AlarmPayload } from './alarm-mapper';

const HUB_BASE_URL = import.meta.env.VITE_ALARM_HUB_URL;
const HUB_URL = HUB_BASE_URL ? `${HUB_BASE_URL.replace(/\/$/, '')}/alarm-hub` : '';

// TODO: doi ten event cho dung voi hub backend dang emit
const HUB_EVENT_NAME = 'ReceiveAlarm';
const MAX_ALARMS = 100;
const SERVER_PAGE_SIZE = 100;

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
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
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

  const clearBellCount = useCallback(() => {
    setBellCount(0);
  }, []);

  const normalizeText = (value?: string) => (value ?? '').trim().toLowerCase();
  const normalizeStatus = (value?: string) => {
    const normalized = normalizeText(value);
    if (normalized === 'closed') return 'close';
    return normalized;
  };
  const normalizePriority = (value?: string) => normalizeText(value);
  const hasActiveFilters = (activeFilters: AlarmFilters) => {
    const values: Array<unknown> = [
      activeFilters.priorityName,
      activeFilters.stateName,
      activeFilters.message,
      activeFilters.source,
      activeFilters.fromTime,
      activeFilters.toTime,
    ];
    return values.some((value) => {
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return Boolean(value);
    });
  };
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

  const fetchPage = useCallback(async (page: number, activeFilters: AlarmFilters) => {
    setLoading(true);
    try {
      const rows = await alarmApi.getAll({
        page,
        pageSize: SERVER_PAGE_SIZE,
        ...activeFilters,
      });
      const nextAlarms = rows.map(normalizeApiAlarm).slice(0, MAX_ALARMS);
      setAlarms(nextAlarms);
      setCurrentPage(page);
      currentPageRef.current = page;
      setCanNextPage(rows.length >= SERVER_PAGE_SIZE);
      if (page === 1) {
        setPendingRealtimeCount(0);
        if (!hasActiveFilters(activeFilters)) {
          clearBellCount();
        }
      }
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
      clearBellCount();
      let merged: AlarmFilters = {};
      setFilters((prev) => {
        merged = { ...prev, ...(nextFilters ?? {}) };
        filtersRef.current = merged;
        return merged;
      });
      await fetchPage(1, merged);
    },
    [clearBellCount, fetchPage],
  );

  const nextPage = useCallback(async () => {
    if (loading || !canNextPage) return;
    const targetPage = currentPage + 1;
    const ok = await fetchPage(targetPage, filters);
    if (!ok) return;
  }, [canNextPage, currentPage, fetchPage, filters, loading]);

  const prevPage = useCallback(async () => {
    if (loading || currentPage <= 1) return;
    await fetchPage(currentPage - 1, filters);
  }, [currentPage, fetchPage, filters, loading]);

  const addAlarm = useCallback((payload: AlarmPayload) => {
    const alarm = normalizeSignalRAlarm(payload);
    setBellCount((prev) => prev + 1);
    const activeFilters = filtersRef.current;
    if (!matchesFilters(alarm, payload, activeFilters)) {
      return;
    }
    if (currentPageRef.current !== 1) {
      setPendingRealtimeCount((prev) => prev + 1);
      return;
    }
    setAlarms((prev) => {
      const withoutDuplicate = prev.filter((item) => item.id !== alarm.id);
      return [alarm, ...withoutDuplicate].slice(0, MAX_ALARMS);
    });
  }, [matchesFilters]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

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
      nextPage,
      prevPage,
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
      nextPage,
      prevPage,
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