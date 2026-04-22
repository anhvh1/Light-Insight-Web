import { apiRequest } from './client';
import type {
  ApiResponse,
  CameraResponse,
  ConnectorResponse,
  MapCameraPositionRequest,
  MapLayoutRequest,
  MapLayoutResponse,
  MapOptionsResponse,
  MapRouteRequest,
  MapRouteResponse,
  MapViewRequest
} from './types';

export const listConnectors = () => 
  apiRequest<ApiResponse<ConnectorResponse[]>>('/api/Connectors/GetAllConnectors');

export const listDevicesByConnector = async (connectorId: string) => {
  const res = await apiRequest<ApiResponse<any[]>>(`/api/DMMap/GetAllDevicesAsync?key=${connectorId}`);
  const devices = res?.Data || [];
  return {
    ...res,
    Data: devices.map((d: any) => ({
      cameraId: String(d.Id || ''),
      code: d.Code || d.Name,
      name: d.Name,
      ipAddress: d.IP || d.Ip || '',
      IP: d.IP || d.Ip || '', // Add direct IP field
      type: d.Type,
      Connectorid: d.Connectorid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as unknown as CameraResponse))
  };
};

export const listMaps = async () => {
  const res = await apiRequest<ApiResponse<MapLayoutResponse[]>>('/api/DMMap/GetAllTree');
  const data = res?.Data || [];
  return {
    ...res,
    Data: data.map(m => ({ ...m, children: m.Children || [] }))
  };
};

// API v1 thường trả về data trực tiếp, không bọc trong ApiResponse
export const getMapOptions = () => apiRequest<MapOptionsResponse>('/api/v1/maps/options');

export const getMap = (id: string) =>
  apiRequest<ApiResponse<{ map: MapLayoutResponse; cameras: any[] }>>(`/api/DMMap/GetById/${id}`);

export const createMap = (payload: MapLayoutRequest) =>
  apiRequest<ApiResponse<MapLayoutResponse>>('/api/DMMap/Add', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      code: payload.code,
      parentId: payload.parentId || null,
      type: payload.type
    })
  });

export const updateMap = (id: string, payload: MapLayoutRequest) =>
  apiRequest<ApiResponse<MapLayoutResponse>>('/api/DMMap/Update', {
    method: 'PUT',
    body: JSON.stringify({
      id: id,
      name: payload.name,
      code: payload.code,
      parentId: payload.parentId || null,
      type: payload.type
    })
  });

export const deleteMap = (id: string) =>
  apiRequest<ApiResponse<void>>(`/api/DMMap/Delete/${id}`, { method: 'DELETE' });

export const updateMapView = (id: string, payload: MapViewRequest) =>
  apiRequest<ApiResponse<MapLayoutResponse>>(`/api/DMMap/${id}/view`, {
    method: 'PUT',
    body: JSON.stringify({
      geoCenterLatitude: payload.geoCenterLatitude,
      geoCenterLongitude: payload.geoCenterLongitude,
      geoZoom: payload.geoZoom
    })
  });

export const uploadMapImage = (id: string, file: File) => {
  const data = new FormData();
  data.append('file', file);
  return apiRequest<ApiResponse<MapLayoutResponse>>(`/api/DMMap/UploadImage/${id}`, {
    method: 'POST',
    body: data
  });
};

export const deleteMapImage = (id: string) =>
  apiRequest<ApiResponse<void>>(`/api/DMMap/DeleteImage/${id}`, { method: 'DELETE' });

export const downloadSampleImage = async () => {
  const response = await fetch('/api/SystemConfig/DownloadSampleImage', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  });
  if (!response.ok) throw new Error('Failed to download sample image');
  return await response.blob();
};

export const saveMapCameras = (id: string, payload: MapCameraPositionRequest[]) =>
  apiRequest<ApiResponse<void>>('/api/DMMap/SaveMarkers', {
    method: 'POST',
    body: JSON.stringify({
      MapId: id,
      Markers: payload.map(p => ({
        CameraId: p.cameraId,
        CameraName: p.CameraName || p.label || "",
        PosX: p.x ?? 0,
        PosY: p.y ?? 0,
        Icon: p.Icon || 'Cctv',
        VmsId: p.VmsId ?? 0,
        Rotation: p.angleDegrees ?? 0,
        Type: p.Type ?? 0,
        Connectorid: p.Connectorid || null,
        IP: p.IP || "",
        Latitude: p.latitude ?? 0,
        Longitude: p.longitude ?? 0,
        IconScale: p.iconScale ?? 1,
        Range: p.range ?? 100,
        AngleDegrees: p.angleDegrees ?? 0,
        FovDegrees: p.fovDegrees ?? 140
      }))
    })
  });

export const buildMapRoute = (payload: MapRouteRequest) =>
  apiRequest<ApiResponse<MapRouteResponse>>('/api/v1/maps/route', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
