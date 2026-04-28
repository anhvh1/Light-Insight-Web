import {
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDownload,
  IconMapPin,
  IconPlus,
  IconTrash,
  IconUpload
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { buildApiUrl } from '../api/client';
import { downloadSampleImage } from '../api/ingestor';
import type {
  MapCameraPositionRequest,
  MapLayoutResponse,
  MapLayoutType,
  MapViewRequest
} from '../api/types';
import { useI18n } from '../i18n/I18nProvider';
import * as Constants from '../utils/constants';
import * as Geometry from '../utils/geometry';
import { buildMapTree, flattenMapTree, toPositionRequest } from '../utils/map-tree';
import { useMapOperations } from '../hooks/useMapOperations';
import { MapSidebar } from './Sidebar/MapSidebar';
import { MapModals } from './Modals/MapModals';
import { ImageMapCanvas } from './Canvas/ImageMapCanvas';
import { GeoMapCanvas } from './Canvas/GeoMapCanvas';
import { ImageUploadWizard } from './Modals/ImageUploadWizard';

const {
  DEFAULT_ANGLE_DEGREES,
  DEFAULT_RANGE_GEO,
  DEFAULT_ICON_SCALE,
  DEFAULT_FOV_DEGREES,
  MIN_ICON_SCALE,
  MAX_ICON_SCALE
} = Constants;

const {
  clamp,
  clamp01,
  normalizeAngle,
  clampFov,
  getGeoMarkerScale,
  getGeoBearing,
  getGeoDistance,
  angleDistance,
  meanAngle
} = Geometry;

type DragState =
  | { kind: 'pan'; startX: number; startY: number; originX: number; originY: number; }
  | { kind: 'camera'; cameraId: string; offsetX: number; offsetY: number; }
  | { kind: 'fov'; cameraId: string; side: 'left' | 'right'; }
  | { kind: 'rotate'; cameraId: string; }
  | { kind: 'scale'; cameraId: string; startScale: number; startDistance: number; };

type GeoDragState =
  | { kind: 'camera'; cameraId: string; offsetX: number; offsetY: number; }
  | { kind: 'fov'; cameraId: string; side: 'left' | 'right'; }
  | { kind: 'rotate'; cameraId: string; }
  | { kind: 'scale'; cameraId: string; startScale: number; startDistance: number; };

export function MapLayoutManagerPanel() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  
  const [responseOpened, responseHandlers] = useDisclosure(false);
  const [responseStatus, setResponseStatus] = useState<'success' | 'error'>('success');
  const [responseText, setResponseText] = useState('');

  const [createOpened, createHandlers] = useDisclosure(false);
  const [editOpened, editHandlers] = useDisclosure(false);
  const [deleteOpened, deleteHandlers] = useDisclosure(false);
  const [uploadWizardOpened, uploadWizardHandlers] = useDisclosure(false);

  const [newMapName, setNewMapName] = useState('');
  const [newMapCode, setNewMapCode] = useState('');
  const [newMapType, setNewMapType] = useState<MapLayoutType>('Image');
  const [newMapParentId, setNewMapParentId] = useState<string | null>(null);
  const [editMap, setEditMap] = useState<MapLayoutResponse | null>(null);
  const [editMapName, setEditMapName] = useState('');
  const [editMapCode, setEditMapCode] = useState('');
  const [editMapType, setEditMapType] = useState<MapLayoutType>('Image');
  const [editMapParentId, setEditMapParentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MapLayoutResponse | null>(null);

  const showResponse = useCallback((status: 'success' | 'error', text: string) => {
    setResponseStatus(status);
    setResponseText(text);
    responseHandlers.open();
  }, [responseHandlers]);

  const {
    mapsQuery,
    connectorsQuery,
    devicesQuery,
    mapOptionsQuery,
    mapDetailQuery,
    createMapMutation,
    updateMapMutation,
    deleteMapMutation,
    uploadImageMutation,
    deleteImageMutation,
    savePositionsMutation,
    saveGeoViewMutation
  } = useMapOperations(selectedMapId, selectedConnectorId);

  const handleCloseCreate = () => {
    setNewMapName('');
    setNewMapCode('');
    setNewMapType('Image');
    setNewMapParentId(null);
    createHandlers.close();
  };

  const handleCloseEdit = () => {
    setEditMap(null);
    setEditMapName('');
    setEditMapCode('');
    setEditMapType('Image');
    setEditMapParentId(null);
    editHandlers.close();
  };

  const [_isPending, startTransition] = useTransition();

  const handleDownloadSample = () => {
    startTransition(async () => {
      try {
        const blob = await downloadSampleImage();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = 'light-insight-sample-map.png';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(objectUrl);
        }, 100);
        showResponse('success', 'Đã tải ảnh mẫu thành công.');
      } catch (error: any) {
        showResponse('error', t('pages.maps.notifications.sampleDownloadFailed.title') || 'Lỗi khi tải ảnh mẫu.');
      }
    });
  };

  // Mutation effects
  useEffect(() => {
    if (createMapMutation.isSuccess && createMapMutation.data) {
      const res = createMapMutation.data;
      createMapMutation.reset();
      if (res.Status === 1) {
        const newId = res.Data.id;
        setSelectedMapId(newId);
        handleCloseCreate();
        showResponse('success', res.Message || t('pages.maps.notifications.create.message'));
      } else {
        showResponse('error', res.Message || t('pages.maps.notifications.createFailed.title'));
      }
    }
    if (createMapMutation.isError) {
      createMapMutation.reset();
      showResponse('error', t('pages.maps.notifications.createFailed.title'));
    }
  }, [createMapMutation, showResponse, t]);

  useEffect(() => {
    if (updateMapMutation.isSuccess && updateMapMutation.data) {
      const res = updateMapMutation.data;
      updateMapMutation.reset();
      if (res.Status === 1) {
        const updatedName = res.Data?.name || editMap?.name || '';
        handleCloseEdit();
        showResponse('success', res.Message || t('pages.maps.notifications.update.message', { name: updatedName }));
      } else {
        showResponse('error', res.Message || t('pages.maps.notifications.updateFailed.title'));
      }
    }
    if (updateMapMutation.isError) {
      updateMapMutation.reset();
      showResponse('error', t('pages.maps.notifications.updateFailed.title'));
    }
  }, [updateMapMutation, editMap, showResponse, t]);

  useEffect(() => {
    if (deleteMapMutation.isSuccess && deleteMapMutation.data) {
      const res = deleteMapMutation.data;
      deleteMapMutation.reset();
      if (res.Status === 1) {
        setSelectedMapId(null);
        deleteHandlers.close();
        showResponse('success', res.Message || t('pages.maps.notifications.delete.message'));
      } else {
        showResponse('error', res.Message || t('pages.maps.notifications.deleteFailed.title'));
      }
    }
    if (deleteMapMutation.isError) {
      deleteMapMutation.reset();
      showResponse('error', t('pages.maps.notifications.deleteFailed.title'));
    }
  }, [deleteMapMutation, deleteHandlers, showResponse, t]);

  useEffect(() => {
    if (savePositionsMutation.isSuccess && savePositionsMutation.data) {
      const res = savePositionsMutation.data;
      savePositionsMutation.reset();
      if (res.Status === 1) {
        setPositionsDirty(false);
        showResponse('success', res.Message || t('pages.maps.notifications.positionsSaved.message'));
      } else {
        showResponse('error', res.Message || t('pages.maps.notifications.positionsFailed.title'));
      }
    }
    if (savePositionsMutation.isError) {
      savePositionsMutation.reset();
      showResponse('error', t('pages.maps.notifications.positionsFailed.title'));
    }
  }, [savePositionsMutation, showResponse, t]);

  useEffect(() => {
    if (uploadImageMutation.isSuccess && uploadImageMutation.data) {
      const res = uploadImageMutation.data;
      uploadImageMutation.reset();
      if (res.Status === 1) {
        uploadWizardHandlers.close();
        showResponse('success', res.Message || t('pages.maps.notifications.imageUploaded.message', { name: res.Data.name }));
      } else {
        showResponse('error', res.Message || t('pages.maps.notifications.uploadFailed.title'));
      }
    }
    if (uploadImageMutation.isError) {
      uploadImageMutation.reset();
      showResponse('error', t('pages.maps.notifications.uploadFailed.title'));
    }
  }, [uploadImageMutation, showResponse, t]);

  useEffect(() => {
    if (deleteImageMutation.isSuccess && deleteImageMutation.data) {
      const res = deleteImageMutation.data;
      deleteImageMutation.reset();
      if (res.Status === 1) {
        showResponse('success', res.Message || 'Xóa ảnh thành công.');
      } else {
        showResponse('error', res.Message || 'Xóa ảnh thất bại.');
      }
    }
    if (deleteImageMutation.isError) {
      deleteImageMutation.reset();
      showResponse('error', 'Lỗi hệ thống khi xóa ảnh.');
    }
  }, [deleteImageMutation, showResponse]);

  const [positions, setPositions] = useState<MapCameraPositionRequest[]>([]);
  const [positionsDirty, setPositionsDirty] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const [mapSearch, setMapSearch] = useState('');
  const [search, setSearch] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const mapMarkersRef = useRef<Map<string, any>>(new Map());
  const selectedCameraIdRef = useRef<string | null>(null);
  const imageViewportRef = useRef<HTMLDivElement | null>(null);
  const [geoZoom, setGeoZoom] = useState<number | null>(null);
  const saveGeoViewTimeoutRef = useRef<number | null>(null);
  const lastSavedGeoViewRef = useRef<MapViewRequest | null>(null);
  const lastAppliedGeoMapIdRef = useRef<string | null>(null);
  const geoDragStateRef = useRef<GeoDragState | null>(null);
  const lastPositionsMapIdRef = useRef<string | null>(null);
  const geoFovFeaturesRef = useRef<any[]>([]);
  
  const { ref: imageViewportSizeRef, width: viewportWidth, height: viewportHeight } = useElementSize();
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [imageView, setImageView] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const dragStateRef = useRef<DragState | null>(null);
  const lastImageMapIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedCameraIdRef.current = selectedCameraId;
  }, [selectedCameraId]);

  useEffect(() => {
    if (!selectedMapId && mapsQuery.data?.length) {
      setSelectedMapId(mapsQuery.data[0].id);
    }
  }, [mapsQuery.data, selectedMapId]);

  useEffect(() => {
    if (!mapDetailQuery.data) return;
    const mapId = mapDetailQuery.data.map.id;
    if (lastPositionsMapIdRef.current === mapId && positionsDirty) return;
    const cameraList = Array.isArray(mapDetailQuery.data.cameras) ? mapDetailQuery.data.cameras : [];
    setPositions(cameraList.map((camera) => toPositionRequest(camera)));
    setPositionsDirty(false);
    lastPositionsMapIdRef.current = mapId;
  }, [mapDetailQuery.data, positionsDirty]);

  const activeMap = mapDetailQuery.data?.map;

  const geoStyleUrl = useMemo(() => {
    const rawUrl = mapOptionsQuery.data?.geoStyleUrl?.trim();
    if (!rawUrl) return undefined;
    // Để đường dẫn là tương đối để proxy của Vite tự điều hướng
    return rawUrl.startsWith('http') ? rawUrl : rawUrl;
  }, [mapOptionsQuery.data?.geoStyleUrl]);

  const filteredMaps = useMemo(() => {
    const term = mapSearch.trim().toLowerCase();
    const mapList = Array.isArray(mapsQuery.data) ? mapsQuery.data : [];
    return term ? mapList.filter((m) => m.name.toLowerCase().includes(term)) : mapList;
  }, [mapSearch, mapsQuery.data]);

  const mapTree = useMemo(() => buildMapTree(filteredMaps), [filteredMaps]);
  const parentOptions = useMemo(() => flattenMapTree(mapTree), [mapTree]);
  const editParentOptions = useMemo(() => flattenMapTree(mapTree, 0, editMap?.id), [mapTree, editMap]);
  const positionsByCamera = useMemo(() => new Map((positions || []).map((p) => [p.cameraId, p])), [positions]);

  const cameraById = useMemo(() => {
    const map = new Map<string, { CameraName?: string | null; label?: string | null; IP?: string | null }>();
    
    // 1. Add metadata from current positions (already on map)
    (positions || []).forEach(p => {
      if (p.cameraId) {
        map.set(p.cameraId, { 
          CameraName: p.CameraName, 
          label: p.label, 
          IP: p.IP 
        });
      }
    });

    // 2. Add/Override with data from devices query (connector selection)
    (devicesQuery.data || []).forEach(c => {
      map.set(c.cameraId, { 
        CameraName: c.name || c.CameraName, 
        label: c.code || c.label, 
        IP: c.IP || c.ipAddress 
      });
    });

    return map;
  }, [devicesQuery.data, positions]);

  const resolveMapTypeLabel = (type?: MapLayoutType | null) => 
    type === 'Geo' ? t('pages.maps.types.geo') : type === 'Image' ? t('pages.maps.types.image') : (type ?? '-');

  const resolveCameraLabel = (cameraId: string) => {
    const camera = cameraById.get(cameraId);
    if (!camera) return cameraId;
    
    const name = camera.CameraName?.trim();
    const code = camera.label?.trim();
    const ip = camera.IP?.trim();
    
    if (name) return name;
    if (code && ip) return `${code} - ${ip}`;
    return code || ip || cameraId;
  };

  const geoFovFeatures = useMemo(() => {
    if (!activeMap || activeMap.type !== 'Geo') return [];
    return positions
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => {
        const angle = p.angleDegrees ?? DEFAULT_ANGLE_DEGREES;
        const fov = typeof p.fovDegrees === 'number' ? clampFov(p.fovDegrees) : DEFAULT_FOV_DEGREES;
        const rangeValue = typeof p.range === 'number' ? p.range : DEFAULT_RANGE_GEO;
        const iconScale = p.iconScale ?? DEFAULT_ICON_SCALE;
        // Sử dụng geoZoom hiện tại, hoặc giá trị đã lưu, hoặc mặc định 11
        const currentZoom = geoZoom ?? activeMap?.geoZoom ?? 11;
        const viewScale = getGeoMarkerScale(currentZoom);
        const safeRange = Math.max(1, rangeValue) * iconScale / viewScale;
        const left = Geometry.destinationPoint(p.latitude ?? 0, p.longitude ?? 0, angle - fov / 2, safeRange);
        const right = Geometry.destinationPoint(p.latitude ?? 0, p.longitude ?? 0, angle + fov / 2, safeRange);
        return {
          type: 'Feature', properties: { cameraId: p.cameraId },
          geometry: { type: 'Polygon', coordinates: [[[p.longitude ?? 0, p.latitude ?? 0], [left.longitude, left.latitude], [right.longitude, right.latitude], [p.longitude ?? 0, p.latitude ?? 0]]] }
        };
      });
  }, [activeMap, geoZoom, positions]);

  useEffect(() => { geoFovFeaturesRef.current = geoFovFeatures; }, [geoFovFeatures]);

  const resetImageView = useCallback(() => {
    if (!imageNaturalSize.width || !viewportWidth || !viewportHeight) return;

    const scaleX = viewportWidth / imageNaturalSize.width;
    const scaleY = viewportHeight / imageNaturalSize.height;
    const fitScale = Math.min(scaleX, scaleY);

    setImageView({ 
      scale: fitScale, 
      translateX: (viewportWidth - imageNaturalSize.width * fitScale) / 2, 
      translateY: (viewportHeight - imageNaturalSize.height * fitScale) / 2 
    });
  }, [imageNaturalSize, viewportWidth, viewportHeight]);

  useEffect(() => {
    if (!activeMap || activeMap.type !== 'Image' || !imageNaturalSize.width || !viewportWidth || !viewportHeight) return;
    
    // Only reset if it's a new map or explicitly requested (like entering fullscreen)
    if (lastImageMapIdRef.current !== activeMap.id) {
      resetImageView();
      lastImageMapIdRef.current = activeMap.id;
    }
  }, [activeMap, imageNaturalSize.width, viewportWidth, viewportHeight, resetImageView]);

  const DEFAULT_GEO_COORDS: [number, number] = [106.6113, 10.7254];

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activeMap?.type !== 'Geo' || !activeMap?.id) return;
    
    // Kiểm tra xem bản đồ đã được khởi tạo vị trí cho Map ID này chưa
    if (lastAppliedGeoMapIdRef.current === activeMap.id) return;

    const storedLat = activeMap.geoCenterLatitude;
    const storedLng = activeMap.geoCenterLongitude;
    const storedZoom = activeMap.geoZoom;

    // Tọa độ được coi là hợp lệ nếu khác null và khác 0
    const hasSavedCenter = storedLat != null && storedLng != null && storedLat !== 0 && storedLng !== 0;
    const savedCenter: [number, number] | null = hasSavedCenter ? [storedLng, storedLat] : null;

    // Tìm camera đầu tiên có tọa độ hợp lệ (khác null và khác 0)
    const firstCameraWithCoords = positions.find(
      (p) => p.latitude != null && p.longitude != null && p.latitude !== 0 && p.longitude !== 0
    );

    const fallbackCenter: [number, number] = firstCameraWithCoords
      ? [firstCameraWithCoords.longitude ?? DEFAULT_GEO_COORDS[0], firstCameraWithCoords.latitude ?? DEFAULT_GEO_COORDS[1]]
      : DEFAULT_GEO_COORDS;

    const finalCenter = savedCenter ?? fallbackCenter;
    const finalZoom = storedZoom || (hasSavedCenter ? storedZoom : (firstCameraWithCoords ? 17 : 11)) || 11;

    map.jumpTo({
      center: finalCenter,
      zoom: finalZoom
    });

    setGeoZoom(map.getZoom());
    lastSavedGeoViewRef.current = {
      geoCenterLatitude: map.getCenter().lat,
      geoCenterLongitude: map.getCenter().lng,
      geoZoom: map.getZoom()
    };
    lastAppliedGeoMapIdRef.current = activeMap.id;
  }, [activeMap, positions]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activeMap?.type !== 'Geo' || !activeMap?.id) return;

    const handleMoveEnd = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      
      // Safety check: NEVER save 0,0 as center
      if (Math.abs(center.lat) < 0.0001 && Math.abs(center.lng) < 0.0001) {
        console.warn('Prevented saving 0,0 coordinate to backend');
        return;
      }

      const payload: MapViewRequest = { 
        geoCenterLatitude: center.lat, 
        geoCenterLongitude: center.lng, 
        geoZoom: zoom 
      };

      const last = lastSavedGeoViewRef.current;
      if (last && 
          Math.abs(last.geoCenterLatitude - payload.geoCenterLatitude) < 1e-6 && 
          Math.abs(last.geoCenterLongitude - payload.geoCenterLongitude) < 1e-6 &&
          Math.abs(last.geoZoom - payload.geoZoom) < 1e-2) return;

      if (saveGeoViewTimeoutRef.current) window.clearTimeout(saveGeoViewTimeoutRef.current);
      saveGeoViewTimeoutRef.current = window.setTimeout(() => {
        saveGeoViewMutation.mutate({ id: activeMap.id, payload });
        lastSavedGeoViewRef.current = payload;
      }, 1000);
    };

    map.on('moveend', handleMoveEnd);
    return () => { 
      map.off('moveend', handleMoveEnd); 
      if (saveGeoViewTimeoutRef.current) window.clearTimeout(saveGeoViewTimeoutRef.current); 
    };
  }, [activeMap?.id, activeMap?.type, saveGeoViewMutation]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds || activeMap?.type !== 'Image') return;
      const container = imageViewportRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mapX = (event.clientX - rect.left - imageView.translateX) / imageView.scale;
      const mapY = (event.clientY - rect.top - imageView.translateY) / imageView.scale;

      if (ds.kind === 'pan') {
        setImageView((prev) => ({ ...prev, translateX: ds.originX + (event.clientX - ds.startX), translateY: ds.originY + (event.clientY - ds.startY) }));
        return;
      }

      if (ds.kind === 'camera') {
        updatePosition(ds.cameraId, { x: clamp01((mapX - ds.offsetX) / imageNaturalSize.width), y: clamp01((mapY - ds.offsetY) / imageNaturalSize.height) });
        return;
      }

      const pos = positionsByCamera.get(ds.cameraId);
      if (!pos || pos.x == null || pos.y == null) return;
      const dx = mapX - pos.x * imageNaturalSize.width;
      const dy = mapY - pos.y * imageNaturalSize.height;
      const dist = Math.hypot(dx, dy);
      const bearing = Geometry.getBearingDegrees(dx, dy);

      if (ds.kind === 'fov') {
        const iconScale = pos.iconScale ?? DEFAULT_ICON_SCALE;
        const baseRange = clamp01(dist / (Math.min(imageNaturalSize.width, imageNaturalSize.height) * iconScale));
        const currentAngle = pos.angleDegrees ?? DEFAULT_ANGLE_DEGREES;
        const currentFov = typeof pos.fovDegrees === 'number' ? clampFov(pos.fovDegrees) : DEFAULT_FOV_DEGREES;
        const leftEdge = normalizeAngle(currentAngle - currentFov / 2);
        const rightEdge = normalizeAngle(currentAngle + currentFov / 2);
        const nextLeft = ds.side === 'left' ? bearing : leftEdge;
        const nextRight = ds.side === 'right' ? bearing : rightEdge;
        updatePosition(ds.cameraId, { angleDegrees: meanAngle(nextLeft, nextRight), range: baseRange, fovDegrees: clampFov(angleDistance(nextLeft, nextRight)) });
      } else if (ds.kind === 'rotate') {
        updatePosition(ds.cameraId, { angleDegrees: normalizeAngle(bearing) });
      } else if (ds.kind === 'scale') {
        updatePosition(ds.cameraId, { iconScale: clamp(ds.startScale * (dist / ds.startDistance), MIN_ICON_SCALE, MAX_ICON_SCALE) });
      }
    };
    const handlePointerUp = () => { dragStateRef.current = null; };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => { window.removeEventListener('pointermove', handlePointerMove); window.removeEventListener('pointerup', handlePointerUp); };
  }, [activeMap?.type, imageNaturalSize, imageView, positionsByCamera]);

  useEffect(() => {
    if (activeMap?.type !== 'Geo') return;
    const handlePointerMove = (event: PointerEvent) => {
      const ds = geoDragStateRef.current;
      if (!ds) return;
      const map = mapInstanceRef.current;
      const container = mapContainerRef.current;
      if (!map || !container) return;
      const rect = container.getBoundingClientRect();
      const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const pos = positionsByCamera.get(ds.cameraId);
      if (pos?.latitude == null || pos?.longitude == null) return;

      if (ds.kind === 'camera') {
        const lngLat = map.unproject([pointer.x - ds.offsetX, pointer.y - ds.offsetY]);
        updatePosition(ds.cameraId, { latitude: lngLat.lat, longitude: lngLat.lng });
        return;
      }

      const targetLngLat = map.unproject([pointer.x, pointer.y]);
      const bearing = getGeoBearing(pos.latitude, pos.longitude, targetLngLat.lat, targetLngLat.lng);
      const distance = getGeoDistance(pos.latitude, pos.longitude, targetLngLat.lat, targetLngLat.lng);

      if (ds.kind === 'fov') {
        const iconScale = pos.iconScale ?? DEFAULT_ICON_SCALE;
        const baseRange = Math.max(1, (distance * getGeoMarkerScale(geoZoom ?? map.getZoom())) / iconScale);
        const leftEdge = normalizeAngle((pos.angleDegrees ?? DEFAULT_ANGLE_DEGREES) - (pos.fovDegrees ?? DEFAULT_FOV_DEGREES) / 2);
        const rightEdge = normalizeAngle((pos.angleDegrees ?? DEFAULT_ANGLE_DEGREES) + (pos.fovDegrees ?? DEFAULT_FOV_DEGREES) / 2);
        const nextLeft = ds.side === 'left' ? bearing : leftEdge;
        const nextRight = ds.side === 'right' ? bearing : rightEdge;
        updatePosition(ds.cameraId, { angleDegrees: meanAngle(nextLeft, nextRight), range: baseRange, fovDegrees: clampFov(angleDistance(nextLeft, nextRight)) });
      } else if (ds.kind === 'rotate') {
        updatePosition(ds.cameraId, { angleDegrees: normalizeAngle(bearing) });
      } else if (ds.kind === 'scale') {
        const centerPx = map.project([pos.longitude, pos.latitude]);
        const distPx = Math.max(1, Math.hypot(pointer.x - centerPx.x, pointer.y - centerPx.y));
        updatePosition(ds.cameraId, { iconScale: clamp(ds.startScale * (distPx / ds.startDistance), MIN_ICON_SCALE, MAX_ICON_SCALE) });
      }
    };
    const handlePointerUp = () => { if (geoDragStateRef.current) { geoDragStateRef.current = null; if (mapInstanceRef.current) mapInstanceRef.current.dragPan.enable(); } };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => { window.removeEventListener('pointermove', handlePointerMove); window.removeEventListener('pointerup', handlePointerUp); };
  }, [activeMap?.type, positionsByCamera, geoZoom]);

  const updatePosition = (cameraId: string, update: Partial<MapCameraPositionRequest>) => {
    setPositions((prev) => {
      const existing = prev.find((p) => p.cameraId === cameraId);
      const next = prev.filter((p) => p.cameraId !== cameraId);
      next.push({ ...existing, ...update, cameraId });
      return next;
    });
    setPositionsDirty(true);
  };

  const removePosition = (cameraId: string) => {
    setPositions((prev) => prev.filter((p) => p.cameraId !== cameraId));
    setPositionsDirty(true);
  };

  const startGeoCameraDrag = (event: PointerEvent, cameraId: string) => {
    if (event.button !== 0) return;
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;
    if (!map || !container) return;
    const pos = positionsByCamera.get(cameraId);
    if (!pos || pos.latitude == null || pos.longitude == null) return;
    const rect = container.getBoundingClientRect();
    const center = map.project([pos.longitude, pos.latitude]);
    geoDragStateRef.current = { kind: 'camera', cameraId, offsetX: (event.clientX - rect.left) - center.x, offsetY: (event.clientY - rect.top) - center.y };
    map.dragPan.disable();
    setSelectedCameraId(cameraId);
  };

  const startGeoFovDrag = (_event: PointerEvent, cameraId: string, side: 'left' | 'right') => {
    geoDragStateRef.current = { kind: 'fov', cameraId, side };
    if (mapInstanceRef.current) mapInstanceRef.current.dragPan.disable();
    setSelectedCameraId(cameraId);
  };

  const startGeoRotateDrag = (_event: PointerEvent, cameraId: string) => {
    geoDragStateRef.current = { kind: 'rotate', cameraId };
    if (mapInstanceRef.current) mapInstanceRef.current.dragPan.disable();
    setSelectedCameraId(cameraId);
  };

  const startGeoScaleDrag = (event: PointerEvent, cameraId: string) => {
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;
    if (!map || !container) return;
    const pos = positionsByCamera.get(cameraId);
    if (!pos || pos.latitude == null || pos.longitude == null) return;
    const rect = container.getBoundingClientRect();
    const center = map.project([pos.longitude, pos.latitude]);
    const dist = Math.hypot((event.clientX - rect.left) - center.x, (event.clientY - rect.top) - center.y);
    geoDragStateRef.current = { kind: 'scale', cameraId, startScale: pos.iconScale ?? DEFAULT_ICON_SCALE, startDistance: dist };
    map.dragPan.disable();
    setSelectedCameraId(cameraId);
  };

  return (
    <Stack gap="lg" style={{ height: '100%', minHeight: 0, backgroundColor: 'var(--bg0)' }}>
      <Group justify="space-between" align="center" px="md" pt="md">
        <Stack gap={0}>
          <Text size="xl" fw={700} style={{ color: 'var(--t0)', letterSpacing: '-0.02em' }}>{t('pages.maps.title')}</Text>
          <Text size="xs" style={{ color: 'var(--t1)' }}>{t('pages.maps.subtitle')}</Text>
        </Stack>
        <Group gap="sm">
          {positionsDirty && <Badge variant="outline" color="orange" styles={{ root: { borderColor: 'var(--orange)', color: 'var(--orange)', background: 'rgba(255, 140, 0, 0.1)' } }}>{t('pages.maps.badges.unsaved')}</Badge>}
          <Button variant="filled" color="brand" leftSection={<IconPlus size={16} />} onClick={createHandlers.open} style={{ backgroundColor: 'var(--accent)', color: 'var(--bg0)' }}>{t('pages.maps.actions.newMap')}</Button>
        </Group>
      </Group>

      <Group align="stretch" gap="md" px="md" pb="md" style={{ flex: 1, minHeight: 0 }} wrap="nowrap">
        <MapSidebar
          mapTree={mapTree} selectedMapId={selectedMapId} onSelectMap={setSelectedMapId} onRefreshMaps={() => queryClient.invalidateQueries({ queryKey: ['maps'] })}
          mapSearch={mapSearch} onMapSearchChange={setMapSearch} resolveMapTypeLabel={resolveMapTypeLabel}
          onEditMap={(m) => { setEditMap(m); setEditMapName(m.name); setEditMapCode(m.code || ''); setEditMapType(m.type); setEditMapParentId(m.parentId ?? null); editHandlers.open(); }}
          onDeleteMap={(m) => { setDeleteTarget(m); deleteHandlers.open(); }}
          connectors={connectorsQuery.data || []}
          selectedConnectorId={selectedConnectorId}
          onSelectConnector={setSelectedConnectorId}
          isDevicesLoading={devicesQuery.isLoading}
          cameras={devicesQuery.data || []} cameraSearch={search} onCameraSearchChange={setSearch} selectedCameraId={selectedCameraId} onSelectCamera={setSelectedCameraId}
          isMapActive={Boolean(activeMap)} positionsByCamera={positionsByCamera} t={t}
        />

        <Paper radius="lg" withBorder style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg1)', borderColor: 'var(--border-dim)', overflow: 'hidden' }}>
          <Box p="md" style={{ borderBottom: '1px solid var(--border-dim)', backgroundColor: 'rgba(0, 0, 0, 0.12)' }}>
            <Group justify="space-between" align="center">
              <div className="flex items-center gap-2">
                <Text size="lg" fw={700} style={{ color: 'var(--t0)' }}>{activeMap?.name ?? t('pages.maps.panel.noMapSelected')}</Text>
                {activeMap && <Badge variant="outline" size="sm" styles={{ root: { borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: 'rgba(0, 194, 255, 0.05)', fontWeight: 700 } }}>{resolveMapTypeLabel(activeMap.type)}</Badge>}
              </div>
              <Group gap="xs">
                {activeMap?.type === 'Image' && (
                  <>
                    <Button 
                      variant="subtle" 
                      size="xs" 
                      onClick={handleDownloadSample}
                      styles={{ root: { color: 'var(--orange)', fontWeight: 700, backgroundColor: 'rgba(255, 140, 0, 0.05)', '&:hover': { backgroundColor: 'rgba(255, 140, 0, 0.1)' } } }}
                      leftSection={<IconDownload size={14} />}
                    >
                      Ảnh mẫu
                    </Button>
                    <Button 
                      variant="subtle" 
                      size="xs" 
                      onClick={uploadWizardHandlers.open}
                      styles={{ root: { color: 'var(--accent)', fontWeight: 700, backgroundColor: 'rgba(0, 194, 255, 0.05)', '&:hover': { backgroundColor: 'rgba(0, 194, 255, 0.1)' } } }}
                      leftSection={<IconUpload size={14} />}
                    >
                      Tải ảnh
                    </Button>
                    <Button 
                      variant="subtle" 
                      color="red" 
                      size="xs"
                      disabled={!activeMap.mapImagePath && !activeMap.imageUrl}
                      onClick={() => deleteImageMutation.mutate()}
                      loading={deleteImageMutation.isPending}
                      leftSection={<IconTrash size={14} />}
                    >
                      Xóa ảnh
                    </Button>
                  </>
                )}
                <Button variant="filled" size="xs" disabled={!selectedMapId || !positionsDirty || savePositionsMutation.isPending} loading={savePositionsMutation.isPending} onClick={() => savePositionsMutation.mutate(positions)} style={{ backgroundColor: (selectedMapId && positionsDirty) ? 'var(--accent)' : 'var(--bg3)', color: (selectedMapId && positionsDirty) ? 'var(--bg0)' : 'var(--t2)', fontWeight: 700 }}>{t('pages.maps.actions.savePositions')}</Button>
              </Group>
            </Group>
          </Box>
          <Box 
            ref={imageViewportSizeRef}
            style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', padding: '5px 0' }}
          >
            {!activeMap ? (
              <Box h="100%" style={{ minHeight: 360, borderRadius: 16, border: '1px dashed var(--border-dim)', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <Stack gap={4} align="center"><IconMapPin size={32} style={{ color: 'var(--t2)' }} /><Text size="sm" style={{ color: 'var(--t2)' }}>{t('pages.maps.empty')}</Text></Stack>
              </Box>
            ) : activeMap.type === 'Geo' ? (
              <GeoMapCanvas
                activeMap={activeMap} geoStyleUrl={geoStyleUrl} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} positions={positions}
                selectedCameraId={selectedCameraId} setSelectedCameraId={setSelectedCameraId} geoZoom={geoZoom} setGeoZoom={setGeoZoom}
                onDrop={(e) => { 
                  e.preventDefault(); 
                  const id = e.dataTransfer.getData('camera-id'); 
                  const map = mapInstanceRef.current; 
                  if (id && map) { 
                    const rect = e.currentTarget.getBoundingClientRect(); 
                    const p = map.unproject([e.clientX - rect.left, e.clientY - rect.top]); 
                    const camData = devicesQuery.data?.find(c => c.cameraId === id);
                    updatePosition(id, { 
                      latitude: p.lat, 
                      longitude: p.lng,
                      CameraName: camData?.name || camData?.CameraName,
                      IP: camData?.IP || camData?.ipAddress || camData?.ip,
                      Connectorid: camData?.Connectorid || camData?.connectorId,
                      Type: camData?.type,
                      VmsId: connectorsQuery.data?.find(c => c.Id === (camData?.Connectorid || camData?.connectorId))?.VmsID
                    }); 
                  } 
                }}
                startGeoCameraDrag={startGeoCameraDrag} startGeoRotateDrag={startGeoRotateDrag} startGeoFovDrag={startGeoFovDrag} startGeoScaleDrag={startGeoScaleDrag}
                mapContainerRef={mapContainerRef} mapInstanceRef={mapInstanceRef} mapMarkersRef={mapMarkersRef} geoFovFeatures={geoFovFeatures}
                resolveCameraLabel={resolveCameraLabel} createCameraMarkerElement={() => {
                    const w = document.createElement('div'); w.style.cssText = 'position:relative;width:0;height:0;pointer-events:none;';
                    const iw = document.createElement('div'); iw.dataset.role = 'icon-wrap'; iw.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:auto;cursor:grab;';
                    const i = document.createElement('div'); i.dataset.role = 'icon'; i.style.cssText = 'width:100%;height:100%;background:url(/ipro-camera.svg) center/contain no-repeat;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));transform-origin:center;';
                    const l = document.createElement('div'); l.dataset.role = 'label'; l.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-100%);padding:2px 6px;border-radius:999px;font-size:12px;font-weight:600;background:var(--t0);color:var(--bg0);white-space:nowrap;pointer-events:none;';
                    const rb = document.createElement('button'); rb.dataset.role = 'remove-btn'; rb.style.cssText = 'position:absolute;width:22px;height:22px;border-radius:50%;border:none;background:var(--red);color:var(--t0);font-size:12px;cursor:pointer;display:none;padding:0;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.35);pointer-events:auto;'; rb.textContent = 'x';
                    const rh = document.createElement('div'); rh.dataset.role = 'rotate-handle'; rh.style.cssText = 'position:absolute;border-radius:50%;background:var(--accent);border:2px solid var(--bg0);cursor:grab;display:none;pointer-events:auto;';
                    const fl = document.createElement('div'); fl.dataset.role = 'fov-left'; fl.style.cssText = 'position:absolute;border-radius:50%;background:var(--orange);border:2px solid var(--bg0);transform:translate(-50%,-50%);cursor:pointer;display:none;pointer-events:auto;';
                    const fr = document.createElement('div'); fr.dataset.role = 'fov-right'; fr.style.cssText = 'position:absolute;border-radius:50%;background:var(--orange);border:2px solid var(--bg0);transform:translate(-50%,-50%);cursor:pointer;display:none;pointer-events:auto;';
                    iw.appendChild(i); w.appendChild(l); w.appendChild(fl); w.appendChild(fr); w.appendChild(rb); w.appendChild(rh);
                    ['tl', 'tr', 'bl', 'br'].forEach(role => {
                      const sh = document.createElement('div'); sh.dataset.role = 'scale-handle'; sh.dataset.handle = role;
                      sh.style.cssText = 'position:absolute;background:var(--orange);border:2px solid var(--bg0);border-radius:4px;cursor:nwse-resize;display:none;pointer-events:auto;';
                      w.appendChild(sh);
                    });
                    w.appendChild(iw); return w;
                }}
                updateCameraMarkerElement={(el, params) => {
                    const iw = el.querySelector('[data-role="icon-wrap"]') as HTMLElement;
                    const i = el.querySelector('[data-role="icon"]') as HTMLElement;
                    const l = el.querySelector('[data-role="label"]') as HTMLElement;
                    const rb = el.querySelector('[data-role="remove-btn"]') as HTMLElement;
                    const rh = el.querySelector('[data-role="rotate-handle"]') as HTMLElement;
                    const fl = el.querySelector('[data-role="fov-left"]') as HTMLElement;
                    const fr = el.querySelector('[data-role="fov-right"]') as HTMLElement;
                    const shs = Array.from(el.querySelectorAll('[data-role="scale-handle"]')) as HTMLElement[];
                    const vs = params.viewScale; const size = Math.round(32 * vs * params.scale);
                    const hSize = Math.round(10 * vs); const rOff = Math.round(18 * vs);
                    const lOff = params.selected ? (size/2 + rOff + hSize + Math.round(4 * vs)) : (size/2 + Math.round(4 * vs));
                    if (iw) { iw.style.width = iw.style.height = `${size}px`; iw.style.border = params.selected ? '1px dashed var(--accent)' : 'none'; iw.style.borderRadius = '8px'; iw.onpointerdown = (e) => startGeoCameraDrag(e, params.cameraId); }
                    if (i) i.style.transform = `rotate(${normalizeAngle(params.angle - 90)}deg)`;
                    if (l) { l.textContent = params.label; l.style.top = `-${lOff}px`; l.style.fontSize = `${Math.round(11 * Geometry.clamp(vs, 0.7, 1.2))}px`; }
                    if (rb) { const bSize = Math.round(22 * vs); rb.style.width = rb.style.height = `${bSize}px`; rb.style.left = `${size/2 + rOff - bSize}px`; rb.style.top = `${-size/2 - rOff - hSize - Math.round(8*vs)}px`; rb.style.display = params.selected ? 'block' : 'none'; rb.onclick = (e) => { e.stopPropagation(); removePosition(params.cameraId); }; }
                    if (rh) { rh.style.width = rh.style.height = `${hSize}px`; rh.style.left = `${-hSize/2}px`; rh.style.top = `${-size/2 - rOff - hSize}px`; rh.style.display = params.selected ? 'block' : 'none'; rh.onpointerdown = (e) => startGeoRotateDrag(e, params.cameraId); }
                    shs.forEach(sh => {
                      const role = sh.dataset.handle; const isL = role==='tl'||role==='bl'; const isT = role==='tl'||role==='tr';
                      sh.style.width = sh.style.height = `${hSize}px`; sh.style.left = `${(isL ? -hSize/2 : size - hSize/2) - size/2}px`;
                      sh.style.top = `${(isT ? -hSize/2 : size - hSize/2) - size/2}px`; sh.style.display = params.selected ? 'block' : 'none';
                      sh.onpointerdown = (e) => startGeoScaleDrag(e, params.cameraId);
                    });
                    if (fl && fr) {
                      if (!params.selected) { fl.style.display = fr.style.display = 'none'; } else {
                        const safeR = Math.max(1, params.range) * params.scale / vs;
                        const lp = Geometry.destinationPoint(params.latitude, params.longitude, params.angle - params.fovDegrees/2, safeR);
                        const rp = Geometry.destinationPoint(params.latitude, params.longitude, params.angle + params.fovDegrees/2, safeR);
                        const cPx = params.map.project([params.longitude, params.latitude]);
                        const lPx = params.map.project([lp.longitude, lp.latitude]);
                        const rPx = params.map.project([rp.longitude, rp.latitude]);
                        fl.style.width = fl.style.height = fr.style.width = fr.style.height = `${hSize}px`;
                        fl.style.left = `${lPx.x - cPx.x}px`; fl.style.top = `${lPx.y - cPx.y}px`;
                        fr.style.left = `${rPx.x - cPx.x}px`; fr.style.top = `${rPx.y - cPx.y}px`;
                        fl.style.display = fr.style.display = 'block'; fl.onpointerdown = (e) => startGeoFovDrag(e, params.cameraId, 'left'); fr.onpointerdown = (e) => startGeoFovDrag(e, params.cameraId, 'right');
                      }
                    }
                }}
                t={t}
              />
            ) : (
              <ImageMapCanvas
                activeMap={activeMap} resolvedImageUrl={(activeMap.imageUrl || activeMap.mapImagePath) ? buildApiUrl(activeMap.imageUrl || activeMap.mapImagePath!) : null} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen}
                imageNaturalSize={imageNaturalSize} setImageNaturalSize={setImageNaturalSize} imageView={imageView} setImageViewportNode={(node) => { imageViewportRef.current = node; }}
                positions={positions} selectedCameraId={selectedCameraId}
                onDrop={(e) => { 
                  e.preventDefault(); 
                  const id = e.dataTransfer.getData('camera-id'); 
                  if (id && imageNaturalSize.width) { 
                    const rect = imageViewportRef.current!.getBoundingClientRect(); 
                    const mx = (e.clientX - rect.left - imageView.translateX) / imageView.scale; 
                    const my = (e.clientY - rect.top - imageView.translateY) / imageView.scale; 
                    const camData = devicesQuery.data?.find(c => c.cameraId === id);
                    updatePosition(id, { 
                      x: clamp01(mx / imageNaturalSize.width), 
                      y: clamp01(my / imageNaturalSize.height),
                      CameraName: camData?.name || camData?.CameraName,
                      IP: camData?.IP || camData?.ipAddress || camData?.ip,
                      Connectorid: camData?.Connectorid || camData?.connectorId,
                      Type: camData?.type,
                      VmsId: connectorsQuery.data?.find(c => c.Id === (camData?.Connectorid || camData?.connectorId))?.VmsID
                    }); 
                  } 
                }}
                onPointerDown={(e) => { if (e.button !== 0 || (e.target as HTMLElement).closest('[data-no-pan="true"]')) return; setSelectedCameraId(null); dragStateRef.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, originX: imageView.translateX, originY: imageView.translateY }; }}
                onWheel={(e) => { if (!imageNaturalSize.width) return; e.preventDefault(); const rect = imageViewportRef.current!.getBoundingClientRect(); const factor = e.deltaY < 0 ? 1.1 : 0.9; const ax = e.clientX - rect.left; const ay = e.clientY - rect.top; setImageView((prev) => { const nextScale = clamp(prev.scale * factor, 0.2, 6); const dx = (ax - prev.translateX) / prev.scale; const dy = (ay - prev.translateY) / prev.scale; return { scale: nextScale, translateX: ax - dx * nextScale, translateY: ay - dy * nextScale }; }); }}
                startCameraDrag={(e, id) => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); setSelectedCameraId(id); const rect = imageViewportRef.current!.getBoundingClientRect(); const mx = (e.clientX - rect.left - imageView.translateX) / imageView.scale; const my = (e.clientY - rect.top - imageView.translateY) / imageView.scale; const p = positionsByCamera.get(id); dragStateRef.current = { kind: 'camera', cameraId: id, offsetX: mx - (p?.x ?? 0) * imageNaturalSize.width, offsetY: my - (p?.y ?? 0) * imageNaturalSize.height }; }}
                startRotateDrag={(e, id) => { e.preventDefault(); e.stopPropagation(); setSelectedCameraId(id); dragStateRef.current = { kind: 'rotate', cameraId: id }; }}
                startScaleDrag={(e, id) => { e.preventDefault(); e.stopPropagation(); setSelectedCameraId(id); const p = positionsByCamera.get(id); const rect = imageViewportRef.current!.getBoundingClientRect(); const mx = (e.clientX - rect.left - imageView.translateX) / imageView.scale; const my = (e.clientY - rect.top - imageView.translateY) / imageView.scale; const dist = Math.hypot(mx - (p?.x ?? 0) * imageNaturalSize.width, my - (p?.y ?? 0) * imageNaturalSize.height); dragStateRef.current = { kind: 'scale', cameraId: id, startScale: p?.iconScale ?? 1, startDistance: dist }; }}
                startFovDrag={(e, id, side) => { e.preventDefault(); e.stopPropagation(); setSelectedCameraId(id); dragStateRef.current = { kind: 'fov', cameraId: id, side }; }}
                removePosition={removePosition} zoomImage={(f, x, y) => { setImageView((prev) => { const ns = clamp(prev.scale * f, 0.2, 6); const dx = (x - prev.translateX) / prev.scale; const dy = (y - prev.translateY) / prev.scale; return { scale: ns, translateX: x - dx * ns, translateY: y - dy * ns }; }); }}
                resetImageView={resetImageView} viewportWidth={viewportWidth - 32} viewportHeight={viewportHeight - 32} resolveCameraLabel={resolveCameraLabel} t={t}
              />
            )}
          </Box>
        </Paper>
      </Group>

      <MapModals
        createOpened={createOpened} onCreateClose={handleCloseCreate} 
        newMapName={newMapName} onNewMapNameChange={setNewMapName} 
        newMapCode={newMapCode} onNewMapCodeChange={setNewMapCode}
        newMapType={newMapType} onNewMapTypeChange={setNewMapType} 
        newMapParentId={newMapParentId} onNewMapParentIdChange={setNewMapParentId} 
        parentOptions={parentOptions}
        onCreateSubmit={() => createMapMutation.mutate({ name: newMapName.trim(), code: newMapCode.trim(), type: newMapType, parentId: newMapParentId ?? undefined })} isCreateLoading={createMapMutation.isPending}
        editOpened={editOpened} onEditClose={handleCloseEdit} 
        editMapName={editMapName} onEditMapNameChange={setEditMapName} 
        editMapCode={editMapCode} onEditMapCodeChange={setEditMapCode}
        editMapType={editMapType} onEditMapTypeChange={setEditMapType} 
        editMapParentId={editMapParentId} onEditMapParentIdChange={setEditMapParentId} 
        editParentOptions={editParentOptions}
        onEditSubmit={() => { if (editMap) updateMapMutation.mutate({ id: editMap.id, payload: { name: editMapName.trim(), code: editMapCode.trim(), type: editMapType, parentId: editMapParentId ?? undefined } }); }} isEditLoading={updateMapMutation.isPending} hasEditMap={Boolean(editMap)}
        deleteOpened={deleteOpened} onDeleteClose={deleteHandlers.close} deleteTargetName={deleteTarget?.name ?? ''} onDeleteConfirm={() => deleteTarget && deleteMapMutation.mutate(deleteTarget.id)} isDeleteLoading={deleteMapMutation.isPending} 
        responseOpened={responseOpened} onResponseClose={responseHandlers.close} responseStatus={responseStatus} responseText={responseText}
        t={t}
      />

      <ImageUploadWizard
        opened={uploadWizardOpened}
        onClose={uploadWizardHandlers.close}
        onConfirm={(file) => uploadImageMutation.mutate(file)}
        isUploading={uploadImageMutation.isPending}
        t={t}
      />
    </Stack>
  );
}

function useElementSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);
  
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      const obs = new ResizeObserver((entries) => {
        if (entries[0]) {
          setSize({
            width: entries[0].contentRect.width,
            height: entries[0].contentRect.height
          });
        }
      });
      obs.observe(node);
      observerRef.current = obs;
    }
  }, []);

  return { ref, ...size };
}
