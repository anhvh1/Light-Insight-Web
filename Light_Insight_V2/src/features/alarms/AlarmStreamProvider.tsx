import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as signalR from '@microsoft/signalr';
import type { Alarm } from '@/types';
import { alarmApi } from '@/lib/alarm-api';
import { normalizeApiAlarm, normalizeSignalRAlarm, type AlarmPayload } from './alarm-mapper';

const HUB_BASE_URL = import.meta.env.VITE_ALARM_HUB_URL;
const HUB_URL = HUB_BASE_URL ? `${HUB_BASE_URL.replace(/\/$/, '')}/alarm-hub` : '';

// TODO: doi ten event cho dung voi hub backend dang emit
const HUB_EVENT_NAME = 'ReceiveAlarm';
const MAX_ALARMS = 300;

type AlarmStreamContextValue = {
  alarms: Alarm[];
  connected: boolean;
  newCount: number;
  refreshAlarms: () => Promise<void>;
  clearNewFlags: () => void;
  markAlarmAsRead: (alarmId: string) => void;
};

const AlarmStreamContext = createContext<AlarmStreamContextValue | null>(null);

export function AlarmStreamProvider({ children }: { children: ReactNode }) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [connected, setConnected] = useState(false);

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

  const refreshAlarms = useCallback(async () => {
    try {
      const rows = await alarmApi.getAll();
      const nextAlarms = rows.map(normalizeApiAlarm).slice(0, MAX_ALARMS);
      setAlarms(nextAlarms);
    } catch (error) {
      console.error('Failed to load alarm list:', error);
    }
  }, []);

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
    () => ({ alarms, connected, newCount, refreshAlarms, clearNewFlags, markAlarmAsRead }),
    [alarms, connected, newCount, refreshAlarms, clearNewFlags, markAlarmAsRead]
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
