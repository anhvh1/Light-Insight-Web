export interface ApiResponse<T> {
  Status: number;
  Message: string;
  MessageDetail?: string | null;
  Data: T;
}

export interface CameraResponse {
  cameraId: string;
  cameraId_Original?: string;
  code?: string | null;
  label?: string | null;
  name?: string | null;
  CameraName?: string | null;
  ipAddress: string;
  IP?: string | null;
  ip?: string | null;
  rtspUsername?: string;
  rtspProfile?: string;
  rtspPath?: string;
  cameraSeries?: string | null;
  cameraModel?: string | null;
  enabled?: boolean;
  hasPassword?: boolean;
  type?: number;
  Connectorid?: string | null;
  connectorId?: string; // Keep for compatibility if needed, but Connectorid is preferred for save logic
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorResponse {
  Id: string;
  Name: string;
  VmsID: number;
}

export type MapLayoutType = 'Image' | 'Geo';

export interface MapLayoutRequest {
  parentId?: string | null;
  name: string;
  code: string;
  type: MapLayoutType;
  imageUrl?: string | null;
}

export interface MapLayoutResponse {
  id: string;
  parentId?: string | null;
  name: string;
  code?: string | null;
  type: MapLayoutType;
  mapImagePath?: string | null;
  imageUrl?: string | null;
  geoCenterLatitude?: number | null;
  geoCenterLongitude?: number | null;
  geoZoom?: number | null;
  createdAt: string;
  Children?: MapLayoutResponse[];
}

export interface MapCameraPositionRequest {
  cameraId: string;
  CameraId?: string;
  label?: string | null;
  CameraName?: string | null;
  x?: number | null;
  PosX?: number | null;
  y?: number | null;
  PosY?: number | null;
  angleDegrees?: number | null;
  AngleDegrees?: number | null;
  Rotation?: number | null;
  fovDegrees?: number | null;
  FovDegrees?: number | null;
  range?: number | null;
  Range?: number | null;
  iconScale?: number | null;
  IconScale?: number | null;
  latitude?: number | null;
  Latitude?: number | null;
  longitude?: number | null;
  Longitude?: number | null;
  IP?: string | null;
  VmsId?: number;
  Type?: number;
  Connectorid?: string | null;
  Icon?: string | null;
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
