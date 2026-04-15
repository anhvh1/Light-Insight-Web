import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as signalR from '@microsoft/signalr';
import { apiClient } from '@/lib/api-client';

export interface CameraStatusDetail {
  CameraId: string;
  IpAddress: string;
  DeviceType: number;
  IsOnline: boolean;
  FailCount: number;
  LastChecked: string;
}

export interface CameraStatusSummary {
  GlobalTotal: number;
  GlobalOnline: number;
  GlobalOffline: number;
  Details: CameraStatusDetail[];
}

export function useCameraStatus(mapId: string | null) {
  const [summary, setSummary] = useState<CameraStatusSummary | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const fetchStatus = useCallback(async (currentMapId: string) => {
    try {
      const response = await apiClient.get(`/cameras/status?mapId=${currentMapId}`);
      if (response.data && response.data.Data) {
        setSummary(response.data.Data);
      }
    } catch (error) {
      console.error('Failed to fetch camera status:', error);
    }
  }, []);

  useEffect(() => {
    if (!mapId) {
      setSummary(null);
      return;
    }

    // 1. Initial Fetch
    void fetchStatus(mapId);

    // 2. Set up SignalR
    const hubUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') + '/camera-status-hub' 
      : 'http://localhost:8080/camera-status-hub';

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { withCredentials: false })
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;
    setConnectionState('connecting');

    connection.start()
      .then(() => setConnectionState('connected'))
      .catch((err) => {
        console.error('SignalR CameraStatusHub connection failed:', err);
        setConnectionState('disconnected');
      });

    connection.onreconnecting(() => {
      setConnectionState('reconnecting');
    });

    connection.onreconnected(() => {
      setConnectionState('connected');
      // Resync full state on reconnect to avoid missed updates
      void fetchStatus(mapId);
    });

    connection.onclose(() => {
      setConnectionState('disconnected');
    });

    connection.on("CameraStatusChanged", (updatedDevice: any) => {
      setSummary((prev) => {
        if (!prev) return prev;

        const nextDetails = [...prev.Details];
        const detailIndex = nextDetails.findIndex(d => d.CameraId === updatedDevice.CameraId);
        
        if (detailIndex === -1) return prev; // Not in current map view

        const oldDetail = nextDetails[detailIndex];
        
        if (oldDetail.IsOnline !== updatedDevice.IsOnline) {
          nextDetails[detailIndex] = {
            ...oldDetail,
            IsOnline: updatedDevice.IsOnline,
            LastChecked: new Date().toISOString()
          };

          const newOnline = updatedDevice.IsOnline ? prev.GlobalOnline + 1 : prev.GlobalOnline - 1;
          const newOffline = updatedDevice.IsOnline ? prev.GlobalOffline - 1 : prev.GlobalOffline + 1;

          return {
            ...prev,
            GlobalOnline: newOnline,
            GlobalOffline: newOffline,
            Details: nextDetails
          };
        }
        
        return prev;
      });
    });

    return () => {
      connection.off("CameraStatusChanged");
      void connection.stop();
    };
  }, [mapId, fetchStatus]);

  // Create a map for O(1) lookups in MapView
  const statusMap = useMemo(() => {
    const map = new Map<string, CameraStatusDetail>();
    if (summary?.Details) {
      summary.Details.forEach(d => map.set(d.CameraId, d));
    }
    return map;
  }, [summary]);

  return { summary, statusMap, connectionState };
}
