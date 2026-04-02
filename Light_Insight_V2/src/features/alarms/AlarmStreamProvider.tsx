import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as signalR from '@microsoft/signalr';
import type { Alarm } from '@/types';
import { normalizeAlarm, type SignalRAlarmPayload } from './alarm-mapper';

const HUB_BASE_URL = import.meta.env.VITE_ALARM_HUB_URL;
const HUB_URL = HUB_BASE_URL ? `${HUB_BASE_URL.replace(/\/$/, '')}/alarm-hub` : '';

// TODO: doi ten event cho dung voi hub backend dang emit
const HUB_EVENT_NAME = 'ReceiveAlarm';
const MAX_ALARMS = 300;

type AlarmStreamContextValue = {
  alarms: Alarm[];
  connected: boolean;
};

const AlarmStreamContext = createContext<AlarmStreamContextValue | null>(null);

export function AlarmStreamProvider({ children }: { children: ReactNode }) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [connected, setConnected] = useState(false);

  const addAlarm = useCallback((payload: SignalRAlarmPayload) => {
    const alarm = normalizeAlarm(payload);
    setAlarms(prev => [alarm, ...prev].slice(0, MAX_ALARMS));
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

    connection.on(HUB_EVENT_NAME, (data: SignalRAlarmPayload) => {
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
    () => ({ alarms, connected }),
    [alarms, connected]
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
