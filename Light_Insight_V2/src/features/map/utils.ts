import type { MapTreeNode as APIMapTreeNode } from '@/types';
import * as Constants from './constants';

const { EARTH_RADIUS_METERS, MIN_FOV_DEGREES, MAX_FOV_DEGREES, GEO_MARKER_BASE_ZOOM, GEO_MARKER_SCALE_FACTOR, GEO_MARKER_MIN_SCALE, GEO_MARKER_MAX_SCALE } = Constants;

export type MapTreeNode = {
  map: APIMapTreeNode;
  children: MapTreeNode[];
};

export const buildMapTree = (maps: APIMapTreeNode[]) => {
  const nodes = new Map<string, MapTreeNode>();
  const safeMaps = Array.isArray(maps) ? maps : [];
  
  const flatten = (items: APIMapTreeNode[], result: APIMapTreeNode[] = []) => {
    items.forEach(item => {
      result.push(item);
      if (item.Children && item.Children.length > 0) {
        flatten(item.Children, result);
      }
    });
    return result;
  };

  const flatMaps = flatten(safeMaps);

  flatMaps.forEach((map) => {
    nodes.set(map.id, { map, children: [] });
  });

  const roots: MapTreeNode[] = [];
  nodes.forEach((node) => {
    if (node.map.parentId && nodes.has(node.map.parentId)) {
      nodes.get(node.map.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (items: MapTreeNode[]) => {
    items.sort((a, b) => a.map.name.localeCompare(b.map.name));
    items.forEach((item) => sortNodes(item.children));
  };
  sortNodes(roots);

  return roots;
};

export const toPositionRequest = (position: any) => {
  const name = position.CameraName || position.cameraName || position.name || position.Name || '';
  const code = position.label || position.code || position.Code || '';
  const ip = position.IP || position.ipAddress || position.Ip || position.ipadress || position.IpAddress || position.ip || position.Ipaddress || position.ipaddress || position.IPAddress || '';
  const id = position.cameraId || position.CameraId || position.Id || '';

  const rawX = position.x ?? position.PosX ?? position.posX ?? 0;
  const rawY = position.y ?? position.PosY ?? position.posY ?? 0;

  return {
    cameraId: id,
    label: code || name || id,
    CameraName: name,
    IP: ip,
    x: rawX > 1 ? rawX / 100 : rawX,
    y: rawY > 1 ? rawY / 100 : rawY,
    angleDegrees: position.angleDegrees ?? position.AngleDegrees ?? position.Rotation ?? position.rotation ?? 0,
    fovDegrees: position.fovDegrees ?? position.FovDegrees ?? position.fovWidth ?? position.FovWidth ?? 140,
    range: position.range ?? position.Range ?? position.fovLength ?? position.FovLength ?? 100,
    iconScale: position.iconScale ?? position.IconScale ?? 1,
    latitude: position.latitude ?? position.Latitude ?? 0,
    longitude: position.longitude ?? position.Longitude ?? 0,
    VmsId: position.VmsId ?? position.vmsId ?? position.Vmsid ?? 0,
    Type: position.Type ?? position.type ?? 0,
    Connectorid: position.Connectorid || position.connectorId || position.ConnectorId || position.ConnectorID || position.connectorid || null,
    Icon: position.Icon || position.icon || 'Cctv'
  };
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const clamp01 = (value: number) => clamp(value, 0, 1);
export const normalizeAngle = (value: number) => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export const toRadians = (value: number) => (value * Math.PI) / 180;
export const clampFov = (value: number) => clamp(value, MIN_FOV_DEGREES, MAX_FOV_DEGREES);

export const getGeoMarkerScale = (zoom: number) =>
  clamp(
    Math.pow(2, (zoom - GEO_MARKER_BASE_ZOOM) * GEO_MARKER_SCALE_FACTOR),
    GEO_MARKER_MIN_SCALE,
    GEO_MARKER_MAX_SCALE
  );

export const getGeoBearing = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
) => {
  const phi1 = toRadians(fromLat);
  const phi2 = toRadians(toLat);
  const deltaLng = toRadians(toLng - fromLng);
  const y = Math.sin(deltaLng) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLng);
  return normalizeAngle((Math.atan2(y, x) * 180) / Math.PI);
};

export const getGeoDistance = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
) => {
  const phi1 = toRadians(fromLat);
  const phi2 = toRadians(toLat);
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

export const angleDistance = (from: number, to: number) => {
  const diff = Math.abs(normalizeAngle(to - from));
  return diff > 180 ? 360 - diff : diff;
};

export const meanAngle = (first: number, second: number) => {
  const a = toRadians(first);
  const b = toRadians(second);
  const x = Math.cos(a) + Math.cos(b);
  const y = Math.sin(a) + Math.sin(b);
  if (Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6) {
    return normalizeAngle(first);
  }
  return normalizeAngle((Math.atan2(y, x) * 180) / Math.PI);
};

export const buildImageSectorPoints = (
  cx: number,
  cy: number,
  angleDegrees: number,
  rangePixels: number,
  fovDegrees: number
) => {
  const bearing = toRadians(angleDegrees);
  const half = toRadians(fovDegrees / 2);
  const left = bearing - half;
  const right = bearing + half;
  const leftX = cx + rangePixels * Math.sin(left);
  const leftY = cy - rangePixels * Math.cos(left);
  const rightX = cx + rangePixels * Math.sin(right);
  const rightY = cy - rangePixels * Math.cos(right);
  return `${cx},${cy} ${leftX},${leftY} ${rightX},${rightY}`;
};

export const getImageSectorEdges = (
  cx: number,
  cy: number,
  angleDegrees: number,
  rangePixels: number,
  fovDegrees: number
) => {
  const bearing = toRadians(angleDegrees);
  const half = toRadians(fovDegrees / 2);
  const left = bearing - half;
  const right = bearing + half;
  return {
    left: {
      x: cx + rangePixels * Math.sin(left),
      y: cy - rangePixels * Math.cos(left)
    },
    right: {
      x: cx + rangePixels * Math.sin(right),
      y: cy - rangePixels * Math.cos(right)
    }
  };
};

export const getBearingDegrees = (dx: number, dy: number) => {
  const radians = Math.atan2(dx, -dy);
  return normalizeAngle((radians * 180) / Math.PI);
};

export const destinationPoint = (
  latitude: number,
  longitude: number,
  bearingDegrees: number,
  distanceMeters: number
) => {
  const bearing = toRadians(bearingDegrees);
  const delta = distanceMeters / EARTH_RADIUS_METERS;
  const phi1 = toRadians(latitude);
  const lambda1 = toRadians(longitude);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const sinDelta = Math.sin(delta);
  const cosDelta = Math.cos(delta);

  const phi2 = Math.asin(sinPhi1 * cosDelta + cosPhi1 * sinDelta * Math.cos(bearing));
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(bearing) * sinDelta * cosPhi1,
      cosDelta - sinPhi1 * Math.sin(phi2)
    );

  return {
    latitude: (phi2 * 180) / Math.PI,
    longitude: (lambda2 * 180) / Math.PI
  };
};
