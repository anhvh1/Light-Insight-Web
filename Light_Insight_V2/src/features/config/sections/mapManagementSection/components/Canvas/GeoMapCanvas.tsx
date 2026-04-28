import { Box, Group, Stack, Text } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, type CSSProperties, type DragEvent } from 'react';
import type { MapCameraPositionRequest, MapLayoutResponse } from '../../api/types';
import * as Constants from '../../utils/constants';
import * as Geometry from '../../utils/geometry';

const {
  DEFAULT_ANGLE_DEGREES,
  DEFAULT_FOV_DEGREES,
  DEFAULT_ICON_SCALE,
  DEFAULT_RANGE_GEO
} = Constants;

const {
  getGeoMarkerScale,
  clampFov
} = Geometry;

interface GeoMapCanvasProps {
  activeMap: MapLayoutResponse | null;
  geoStyleUrl: string | undefined;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  positions: MapCameraPositionRequest[];
  selectedCameraId: string | null;
  setSelectedCameraId: (id: string | null) => void;
  geoZoom: number | null;
  setGeoZoom: (z: number) => void;

  onDrop: (event: DragEvent<HTMLDivElement>) => void;

  // Handlers for markers
  startGeoCameraDrag: (event: PointerEvent, id: string) => void;
  startGeoRotateDrag: (event: PointerEvent, id: string) => void;
  startGeoFovDrag: (event: PointerEvent, id: string, side: 'left' | 'right') => void;
  startGeoScaleDrag: (event: PointerEvent, id: string) => void;

  mapContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  mapInstanceRef: React.MutableRefObject<MapLibreMap | null>;
  mapMarkersRef: React.MutableRefObject<Map<string, maplibregl.Marker>>;
  geoFovFeatures: any[];

  resolveCameraLabel: (id: string) => string;
  createCameraMarkerElement: () => HTMLElement;
  updateCameraMarkerElement: (el: HTMLElement, params: any) => void;
  t: (key: string, params?: any) => string;
}

export function GeoMapCanvas({
  activeMap,
  geoStyleUrl,
  isFullscreen,
  setIsFullscreen,
  positions,
  selectedCameraId,
  setSelectedCameraId,
  geoZoom,
  setGeoZoom,
  onDrop,
  mapContainerRef,
  mapInstanceRef,
  mapMarkersRef,
  geoFovFeatures,
  resolveCameraLabel,
  createCameraMarkerElement,
  updateCameraMarkerElement,
  t
}: GeoMapCanvasProps) {
  const lastMapIdRef = useRef<string | null>(null);
  const geoFovFeaturesRef = useRef(geoFovFeatures);

  // Luôn cập nhật ref khi prop thay đổi
  useEffect(() => {
    geoFovFeaturesRef.current = geoFovFeatures;
  }, [geoFovFeatures]);

  useEffect(() => {
    const isChangingMap = mapInstanceRef.current && activeMap?.id !== lastMapIdRef.current;

    if (activeMap?.type !== 'Geo' || !geoStyleUrl || !mapContainerRef.current || isChangingMap) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        mapMarkersRef.current.forEach((m) => m.remove());
        mapMarkersRef.current.clear();
      }
      if (!isChangingMap) return;
    }

    if (mapInstanceRef.current) return;

    lastMapIdRef.current = activeMap?.id || null;
    const DEFAULT_COORDS: [number, number] = [106.6113, 10.7254];

    const storedLat = activeMap?.geoCenterLatitude;
    const storedLng = activeMap?.geoCenterLongitude;
    const hasSavedCenter = storedLat != null && storedLng != null && storedLat !== 0 && storedLng !== 0;
    const savedCenter: [number, number] | null = hasSavedCenter ? [storedLng!, storedLat!] : null;

    const firstCameraWithCoords = positions.find(
      (p) => p.latitude != null && p.longitude != null && p.latitude !== 0 && p.longitude !== 0
    );

    const fallbackCenter: [number, number] = firstCameraWithCoords
      ? [firstCameraWithCoords.longitude ?? DEFAULT_COORDS[0], firstCameraWithCoords.latitude ?? DEFAULT_COORDS[1]]
      : DEFAULT_COORDS;

    const center = savedCenter ?? fallbackCenter;
    const zoom = activeMap?.geoZoom || (hasSavedCenter ? activeMap?.geoZoom : (firstCameraWithCoords ? 17 : 11)) || 11;

    const container = mapContainerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container: container,
      style: geoStyleUrl,
      center: center,
      zoom: zoom
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const updateFovData = () => {
      if (!map.isStyleLoaded()) return;
      const source = map.getSource('camerfov') as maplibregl.GeoJSONSource | undefined;
      const features = geoFovFeaturesRef.current;

      if (!source) {
        map.addSource('camerfov', { type: 'geojson', data: { type: 'FeatureCollection', features } });
        map.addLayer({
          id: 'camerfov-fill',
          type: 'fill',
          source: 'camerfov',
          paint: { 'fill-color': '#00c2ff', 'fill-opacity': 0.15 }
        });
        map.addLayer({
          id: 'camerfov-outline',
          type: 'line',
          source: 'camerfov',
          paint: { 'line-color': '#00c2ff', 'line-width': 1, 'line-opacity': 0.5 }
        });
      } else {
        source.setData({ type: 'FeatureCollection', features });
      }
    };

    map.on('load', () => {
      setGeoZoom(map.getZoom());
      updateFovData();
    });

    map.on('styledata', () => {
      updateFovData();
    });

    map.on('click', (e) => {
      const target = e.originalEvent?.target as HTMLElement | null;
      if (target && target.closest('[data-role="icon-wrap"], [data-role="label"], [data-role="remove-btn"], [data-role="rotate-handle"], [data-role="scale-handle"], [data-role="fov-left"], [data-role="fov-right"]')) return;
      setSelectedCameraId(null);
    });

    mapInstanceRef.current = map;
  }, [activeMap?.type, geoStyleUrl, activeMap?.id]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activeMap?.type !== 'Geo') return;
    map.resize();
  }, [activeMap?.type, isFullscreen]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activeMap?.type !== 'Geo') return;
    const handleZoom = () => setGeoZoom(map.getZoom());
    map.on('zoom', handleZoom);
    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoom', handleZoom);
      map.off('zoomend', handleZoom);
    };
  }, [activeMap?.type]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activeMap?.type !== 'Geo') return;
    const zoom = geoZoom ?? map.getZoom();
    const viewScale = getGeoMarkerScale(zoom);
    const markerMap = mapMarkersRef.current;
    const nextIds = new Set<string>();

    positions.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      nextIds.add(p.cameraId);
      const existing = markerMap.get(p.cameraId);
      const params = {
        label: resolveCameraLabel(p.cameraId),
        angle: p.angleDegrees ?? DEFAULT_ANGLE_DEGREES,
        scale: p.iconScale ?? DEFAULT_ICON_SCALE,
        selected: selectedCameraId === p.cameraId,
        viewScale,
        latitude: p.latitude,
        longitude: p.longitude,
        fovDegrees: typeof p.fovDegrees === 'number' ? clampFov(p.fovDegrees) : DEFAULT_FOV_DEGREES,
        range: typeof p.range === 'number' ? p.range : DEFAULT_RANGE_GEO,
        map,
        cameraId: p.cameraId,
        icon: p.Icon
      };

      if (existing) {
        existing.setLngLat([p.longitude, p.latitude]);
        updateCameraMarkerElement(existing.getElement(), params);
      } else {
        const el = createCameraMarkerElement();
        updateCameraMarkerElement(el, params);
        const marker = new maplibregl.Marker({ element: el, draggable: false }).setLngLat([p.longitude, p.latitude]).addTo(map);
        markerMap.set(p.cameraId, marker);
      }
    });

    for (const [id, marker] of markerMap.entries()) {
      if (!nextIds.has(id)) {
        marker.remove();
        markerMap.delete(id);
      }
    }

    // Sau khi cập nhật Marker, hãy thử cập nhật FOV ngay
    const source = map.getSource('camerfov') as maplibregl.GeoJSONSource | undefined;
    if (source && map.isStyleLoaded()) {
      source.setData({ type: 'FeatureCollection', features: geoFovFeaturesRef.current });
    }
  }, [activeMap?.type, geoZoom, positions, selectedCameraId]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activeMap?.type !== 'Geo') return;
    const source = map.getSource('camerfov') as maplibregl.GeoJSONSource | undefined;
    if (source) source.setData({ type: 'FeatureCollection', features: geoFovFeatures });
  }, [activeMap?.type, geoFovFeatures]);

  const containerStyles: CSSProperties = {
    borderRadius: 16,
    border: '1px solid var(--border-dim)',
    overflow: 'hidden',
    background: 'var(--bg0)',
    height: isFullscreen ? 'calc(100vh - 160px)' : '100%',
    minHeight: 360,
    width: '100%',
    position: 'relative'
  };

  if (isFullscreen) {
    containerStyles.position = 'fixed';
    containerStyles.inset = '80px 64px';
    containerStyles.zIndex = 200;
    containerStyles.boxShadow = '0 16px 50px rgba(0,0,0,0.6)';
  }

  return (
    <>
      {isFullscreen && (
        <Box onClick={() => setIsFullscreen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', zIndex: 199 }} />
      )}
      <Box ref={mapContainerRef} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} style={containerStyles}>
        {!geoStyleUrl && (
          <Group h="100%" align="center" justify="center">
            <Stack gap={4} align="center">
              <IconMapPin size={32} style={{ color: 'var(--t2)' }} />
              <Text size="sm" style={{ color: 'var(--t2)' }}>
                {t('pages.maps.geo.missingStyle')}
              </Text>
            </Stack>
          </Group>
        )}
      </Box>
    </>
  );
}
