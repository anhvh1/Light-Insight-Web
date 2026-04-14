import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as signalR from '@microsoft/signalr';
import type { Alarm } from '@/types';
import { normalizeSignalRAlarm, type AlarmPayload } from './map-alarm-mapper';

const HUB_BASE_URL = import.meta.env.VITE_ALARM_HUB_URL;
const HUB_URL = HUB_BASE_URL ? `${HUB_BASE_URL.replace(/\/$/, '')}/alarm-hub` : '';

const HUB_EVENT_NAME = 'ReceiveAlarm';
const MAX_LATEST_ALARMS = 10;

type MapAlarmStreamContextValue = {
  latestAlarms: Alarm[];
  totalAlarmCount: number;
  connected: boolean;
};

const MapAlarmStreamContext = createContext<MapAlarmStreamContextValue | null>(null);

export function MapAlarmStreamProvider({ children }: { children: ReactNode }) {
  const [latestAlarms, setLatestAlarms] = useState<Alarm[]>([]);
  const [totalAlarmCount, setTotalAlarmCount] = useState(0);
  const [connected, setConnected] = useState(false);

  const addAlarm = useCallback((payload: AlarmPayload) => {
    const alarm = normalizeSignalRAlarm(payload);

    // If alarm has no location or source, don't add it to the map stream as it can't be placed
    if (!alarm.loc || !alarm.src) {
      return;
    }
    
    setTotalAlarmCount(prev => prev + 1);

    setLatestAlarms((prev) => {
      // Add the new alarm to the front
      const newAlarms = [alarm, ...prev];
      // Remove duplicates by ID, keeping the newest one (which is first)
      const uniqueAlarms = Array.from(new Map(newAlarms.map(a => [a.id, a])).values());
      // Enforce the max size
      return uniqueAlarms.slice(0, MAX_LATEST_ALARMS);
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
  
  const value = useMemo(
    () => ({
      latestAlarms,
      totalAlarmCount,
      connected,
    }),
    [latestAlarms, totalAlarmCount, connected]
  );

  return (
    <MapAlarmStreamContext.Provider value={value}>
      {children}
    </MapAlarmStreamContext.Provider>
  );
}

export function useMapAlarmStream() {
  const context = useContext(MapAlarmStreamContext);

  if (!context) {
    throw new Error('useMapAlarmStream must be used within MapAlarmStreamProvider');
  }

  return context;
}
