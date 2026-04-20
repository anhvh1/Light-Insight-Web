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

export const listMaps = () => apiRequest<MapLayoutResponse[]>('/api/v1/maps');

export const getMapOptions = () => apiRequest<MapOptionsResponse>('/api/v1/maps/options');

export const getMap = (id: string) => apiRequest<MapDetailResponse>(`/api/v1/maps/${id}`);

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
  apiRequest<MapLayoutResponse>(`/api/v1/maps/${id}/view`, {
    method: 'PUT',
    body: JSON.stringify(payload)
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
