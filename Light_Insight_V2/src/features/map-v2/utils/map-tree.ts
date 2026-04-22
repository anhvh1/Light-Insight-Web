import type { MapLayoutResponse, MapCameraPositionRequest } from '../api/types';

export type MapTreeNode = {
  map: MapLayoutResponse;
  children: MapTreeNode[];
};

export const buildMapTree = (maps: MapLayoutResponse[]) => {
  const nodes = new Map<string, MapTreeNode>();
  const safeMaps = Array.isArray(maps) ? maps : [];
  
  safeMaps.forEach((map) => {
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

export const flattenMapTree = (
  nodes: MapTreeNode[],
  depth = 0,
  excludeId?: string
): { value: string; label: string }[] => {
  const options: { value: string; label: string }[] = [];
  nodes.forEach((node) => {
    if (node.map.id !== excludeId) {
      const prefix = depth > 0 ? `${'--'.repeat(depth)} ` : '';
      options.push({ value: node.map.id, label: `${prefix}${node.map.name}` });
    }
    options.push(...flattenMapTree(node.children, depth + 1, excludeId));
  });
  return options;
};

export const toPositionRequest = (position: any): MapCameraPositionRequest => {
  // Ưu tiên lấy tên camera từ mọi trường có thể có
  const name = position.CameraName || position.cameraName || position.name || position.Name || '';
  const code = position.label || position.code || position.Code || '';
  const ip = position.IP || position.ipAddress || position.Ip || position.ipadress || position.IpAddress || position.ip || position.Ipaddress || position.ipaddress || position.IPAddress || '';
  const id = position.cameraId || position.CameraId || position.Id || '';

  return {
    cameraId: id,
    label: code || name || id, // label dùng cho mã
    CameraName: name,
    IP: ip,
    x: position.x ?? position.PosX ?? position.posX ?? 0,
    y: position.y ?? position.PosY ?? position.posY ?? 0,
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
