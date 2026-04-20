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

export const toPositionRequest = (position: MapCameraPositionRequest) => ({
  cameraId: position.cameraId,
  label: position.label,
  x: position.x,
  y: position.y,
  angleDegrees: position.angleDegrees,
  fovDegrees: position.fovDegrees,
  range: position.range,
  iconScale: position.iconScale,
  latitude: position.latitude,
  longitude: position.longitude
});
