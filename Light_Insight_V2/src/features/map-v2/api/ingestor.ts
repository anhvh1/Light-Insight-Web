import { apiRequest } from './client';
import type {
  CameraResponse,
  MapCameraPositionRequest,
  MapDetailResponse,
  MapLayoutRequest,
  MapLayoutResponse,
  MapOptionsResponse,
  MapRouteRequest,
  MapRouteResponse,
  MapViewRequest
} from './types';

export const listCameras = () => apiRequest<CameraResponse[]>('/api/v1/cameras');

export const listMaps = async () => {
  const data = await apiRequest<MapLayoutResponse[]>('/api/DMMap/GetAllTree');
  return (data || []).map(m => ({ ...m, children: m.Children || [] }));
};

export const getMapOptions = () => apiRequest<MapOptionsResponse>('/api/v1/maps/options');

export const getMap = async (id: string) => {
  const response = await apiRequest<{ map: MapLayoutResponse; cameras: any[] }>(`/api/DMMap/GetById/${id}`);
  return response;
};

export const createMap = (payload: MapLayoutRequest) =>
  apiRequest<MapLayoutResponse>('/api/v1/maps', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const updateMap = (id: string, payload: MapLayoutRequest) =>
  apiRequest<MapLayoutResponse>(`/api/v1/maps/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

export const deleteMap = (id: string) =>
  apiRequest<void>(`/api/v1/maps/${id}`, { method: 'DELETE' });

export const updateMapView = (id: string, payload: MapViewRequest) =>
  apiRequest<MapLayoutResponse>(`/api/DMMap/${id}/view`, {
    method: 'PUT',
    body: JSON.stringify({
      GeoCenterLatitude: payload.geoCenterLatitude,
      GeoCenterLongitude: payload.geoCenterLongitude,
      GeoZoom: payload.geoZoom
    })
  });

export const uploadMapImage = (id: string, file: File) => {
  const data = new FormData();
  data.append('file', file);
  return apiRequest<MapLayoutResponse>(`/api/v1/maps/${id}/image`, {
    method: 'POST',
    body: data
  });
};

export const saveMapCameras = (id: string, payload: MapCameraPositionRequest[]) =>
  apiRequest<MapDetailResponse>(`/api/v1/maps/${id}/cameras`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

export const buildMapRoute = (payload: MapRouteRequest) =>
  apiRequest<MapRouteResponse>('/api/v1/maps/route', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
