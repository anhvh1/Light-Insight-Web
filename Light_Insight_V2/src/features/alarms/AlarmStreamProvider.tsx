import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as signalR from '@microsoft/signalr';
import type { Alarm } from '@/types';
import { alarmApi } from '@/lib/alarm-api';
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
  refreshAlarms: () => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
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

  const clearNewFlags = useCallback(() => {
    setAlarms((prev) => prev.map((alarm) => ({ ...alarm, isNew: false })));
  }, []);

  const markAlarmAsRead = useCallback((alarmId: string) => {
    setAlarms((prev) =>
      prev.map((alarm) =>
        alarm.id === alarmId && alarm.isNew ? { ...alarm, isNew: false } : alarm
      )
    );
  }, []);

  const fetchPage = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const rows = await alarmApi.getAll({ page, pageSize: SERVER_PAGE_SIZE });
      const nextAlarms = rows.map(normalizeApiAlarm).slice(0, MAX_ALARMS);
      setAlarms(nextAlarms);
      setCurrentPage(page);
      setCanNextPage(rows.length >= SERVER_PAGE_SIZE);
      return true;
    } catch (error) {
      console.error('Failed to load alarm list:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAlarms = useCallback(async () => {
    await fetchPage(1);
  }, [fetchPage]);

  const nextPage = useCallback(async () => {
    if (loading || !canNextPage) return;
    const targetPage = currentPage + 1;
    const ok = await fetchPage(targetPage);
    if (!ok) return;
  }, [canNextPage, currentPage, fetchPage, loading]);

  const prevPage = useCallback(async () => {
    if (loading || currentPage <= 1) return;
    await fetchPage(currentPage - 1);
  }, [currentPage, fetchPage, loading]);

  const addAlarm = useCallback((payload: AlarmPayload) => {
    const alarm = normalizeSignalRAlarm(payload);
    setAlarms((prev) => {
      const withoutDuplicate = prev.filter((item) => item.id !== alarm.id);
      return [alarm, ...withoutDuplicate].slice(0, MAX_ALARMS);
    });
  }, []);

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
      refreshAlarms,
      nextPage,
      prevPage,
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
      refreshAlarms,
      nextPage,
      prevPage,
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
