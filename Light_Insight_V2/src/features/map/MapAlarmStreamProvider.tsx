import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as signalR from '@microsoft/signalr';
import type { Alarm } from '@/types';
import { normalizeSignalRAlarm, type AlarmPayload } from '../alarms/alarm-mapper';

const HUB_BASE_URL = import.meta.env.VITE_ALARM_HUB_URL;
const HUB_URL = HUB_BASE_URL ? `${HUB_BASE_URL.replace(/\/$/, '')}/alarm-hub` : '';

const HUB_EVENT_NAME = 'ReceiveAlarm';
const MAX_ALARMS = 500; // Increased for map view

type MapAlarmStreamContextValue = {
  alarms: Alarm[];
  connected: boolean;
};

const MapAlarmStreamContext = createContext<MapAlarmStreamContextValue | null>(null);

export function MapAlarmStreamProvider({ children }: { children: ReactNode }) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [connected, setConnected] = useState(false);

  const addAlarm = useCallback((payload: AlarmPayload) => {
    const alarm = normalizeSignalRAlarm(payload);

    // If alarm has no location, don't add it to the map stream
    if (!alarm.loc) {
      return;
    }

    setAlarms((prev) => {
      // Remove existing alarm with same ID to avoid duplicates and show movement
      const withoutDuplicate = prev.filter((item) => item.id !== alarm.id);
      // Add the new or updated alarm to the front
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
  
  const value = useMemo(
    () => ({
      alarms,
      connected,
    }),
    [alarms, connected]
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
