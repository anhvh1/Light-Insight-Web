export interface CameraResponse {
  cameraId: string;
  code?: string | null;
  ipAddress: string;
  rtspUsername: string;
  rtspProfile: string;
  rtspPath: string;
  cameraSeries?: string | null;
  cameraModel?: string | null;
  enabled: boolean;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MapLayoutType = 'Image' | 'Geo';

export interface MapLayoutRequest {
  parentId?: string | null;
  name: string;
  type: MapLayoutType;
}

export interface MapLayoutResponse {
  id: string;
  parentId?: string | null;
  name: string;
  code?: string | null;
  type: MapLayoutType;
  mapImagePath?: string | null;
  geoCenterLatitude?: number | null;
  geoCenterLongitude?: number | null;
  geoZoom?: number | null;
  createdAt: string;
  Children?: MapLayoutResponse[];
}

export interface MapCameraPositionRequest {
  cameraId: string;
  CameraId?: string; // New API uses PascalCase
  label?: string | null;
  CameraName?: string | null;
  x?: number | null;
  PosX?: number | null;
  y?: number | null;
  PosY?: number | null;
  angleDegrees?: number | null;
  Rotation?: number | null;
  fovDegrees?: number | null;
  range?: number | null;
  iconScale?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  IP?: string | null;
}

export interface MapCameraPositionResponse extends MapCameraPositionRequest {
  updatedAt: string;
}

export interface MapDetailResponse {
  map: MapLayoutResponse;
  cameras: MapCameraPositionResponse[];
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface MapRouteRequest {
  points: GeoPoint[];
  mode?: string;
}

export interface MapRouteResponse {
  points: GeoPoint[];
  isFallback: boolean;
}

export interface MapOptionsResponse {
  geoStyleUrl?: string | null;
  routingEnabled: boolean;
}

export interface MapViewRequest {
  geoCenterLatitude: number;
  geoCenterLongitude: number;
  geoZoom: number;
}
