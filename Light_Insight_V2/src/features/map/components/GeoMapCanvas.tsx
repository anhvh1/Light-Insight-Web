import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn } from '@/lib/utils';
import type { Alarm } from '@/types';
import { IconZoomIn, IconZoomOut, IconFocus2 } from '@tabler/icons-react';
import * as Geometry from '../utils';

const {
  getGeoMarkerScale,
} = Geometry;

interface GeoMapCanvasProps {
  activeMap: any;
  geoStyleUrl: string | undefined;
  markers: any[];
  alarmsBySource: Map<string, Alarm>;
  cameraStatusMap: Map<string, any>;
  onMarkerClick: (alarm: Alarm) => void;
  showLegend: boolean;
}

const alarmStyles: { [key: string]: string } = {
  critical: '#ff4d4d',
  high: '#ff6b00',
  medium: '#00c2ff',
  low: '#22c55e',
};

export function GeoMapCanvas({
  activeMap,
  geoStyleUrl,
  markers,
  alarmsBySource,
  cameraStatusMap,
  onMarkerClick,
  showLegend
}: GeoMapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const mapMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [geoZoom, setGeoZoom] = useState<number>(11);
  const [isMapReady, setIsMapReady] = useState(false);

  const initialViewRef = useRef({
      center: [106.6113, 10.7254] as [number, number],
      zoom: 11
  });

  // Calculate Geo FOV Features as SVG points Map
  const geoFovShapes = useMemo(() => {
    const shapeMap = new Map<string, { points: string }>();
    markers
      .filter((m) => m.latitude != null && m.longitude != null && m.latitude !== 0)
      .forEach((m) => {
        const angle = m.angleDegrees || 0;
        const fov = m.fovDegrees || 60;
        const rangeValue = m.range || 25;
        const iconScale = m.iconScale || 1;
        
        // Use a consistent pixel range for FOV in Geo Map to ensure visibility
        const viewScale = getGeoMarkerScale(geoZoom);
        const rangePixels = rangeValue * 3 * iconScale * viewScale; 
        
        shapeMap.set(m.cameraId, {
          points: Geometry.buildImageSectorPoints(0, 0, angle, rangePixels, fov)
        });
      });
    return shapeMap;
  }, [markers, geoZoom]);

  useEffect(() => {
    if (!geoStyleUrl || !mapContainerRef.current || mapInstanceRef.current) return;

    const storedLat = activeMap?.geoCenterLatitude;
    const storedLng = activeMap?.geoCenterLongitude;
    const storedZoom = activeMap?.geoZoom;

    const hasSavedCenter = storedLat != null && storedLng != null && storedLat !== 0 && storedLng !== 0;
    const center: [number, number] = hasSavedCenter ? [storedLng, storedLat] : [106.6113, 10.7254];
    const zoom = storedZoom || 11;
    
    initialViewRef.current = { center, zoom };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: geoStyleUrl,
      center: center,
      zoom: zoom
    });

    map.on('load', () => {
      setIsMapReady(true);
      setGeoZoom(map.getZoom());
    });

    map.on('zoom', () => setGeoZoom(map.getZoom()));

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setIsMapReady(false);
    };
  }, [geoStyleUrl, activeMap?.id]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleReset = () => {
      mapInstanceRef.current?.flyTo({
          center: initialViewRef.current.center,
          zoom: initialViewRef.current.zoom,
          essential: true
      });
  };

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;

    const markerMap = mapMarkersRef.current;
    const nextIds = new Set<string>();
    const viewScale = getGeoMarkerScale(geoZoom);

    markers.forEach((m) => {
      if (m.latitude == null || m.longitude == null || m.latitude === 0 || m.longitude === 0) return;
      
      const cameraId = m.cameraId;
      nextIds.add(cameraId);

      const alarmForMarker = alarmsBySource.get(m.CameraName);
      const status = cameraStatusMap.get(cameraId);
      const isOffline = status && status.IsOnline === false;
      
      const angle = m.angleDegrees || 0;
      const iconScale = m.iconScale || 1;
      const fovShape = geoFovShapes.get(cameraId);

      const existing = markerMap.get(cameraId);

      if (existing) {
        existing.setLngLat([m.longitude, m.latitude]);
        updateMarkerElement(existing.getElement(), m, angle, iconScale, alarmForMarker, isOffline, viewScale, fovShape);
      } else {
        const el = createMarkerElement(m, angle, iconScale, alarmForMarker, isOffline, viewScale, fovShape, () => {
           if (alarmForMarker) onMarkerClick(alarmForMarker);
        });
        const marker = new maplibregl.Marker({ element: el }).setLngLat([m.longitude, m.latitude]).addTo(map);
        markerMap.set(cameraId, marker);
      }
    });

    for (const [id, marker] of markerMap.entries()) {
      if (!nextIds.has(id)) {
        marker.remove();
        markerMap.delete(id);
      }
    }
  }, [markers, alarmsBySource, cameraStatusMap, geoZoom, isMapReady]);

  function createMarkerElement(m: any, angle: number, iconScale: number, alarm: Alarm | undefined, isOffline: boolean, viewScale: number, fovShape: any, onClick: () => void) {
    const container = document.createElement('div');
    container.className = 'cursor-pointer group/marker relative';
    
    const inner = document.createElement('div');
    inner.className = 'relative flex flex-col items-center';
    inner.onclick = (e) => {
      e.stopPropagation();
      onClick();
    };

    const label = document.createElement('div');
    label.className = cn(
      "marker-label absolute bottom-full mb-2 px-2 py-0.5 whitespace-nowrap shadow-xl transition-opacity pointer-events-none text-[10px] font-bold rounded bg-white border border-black/10 text-black uppercase",
      (alarm || isOffline) ? "opacity-100" : "opacity-0 group-hover/marker:opacity-100"
    );
    label.innerText = `${m.CameraName}${isOffline ? ' (OFFLINE)' : ''}`;

    const rotateContainer = document.createElement('div');
    rotateContainer.className = cn(
      'relative flex items-center justify-center',
      alarm && 'marker-alarm-blink'
    );
    const finalSize = Math.round(32 * iconScale * viewScale);
    rotateContainer.style.width = `${finalSize}px`;
    rotateContainer.style.height = `${finalSize}px`;

    // FOV SVG with viewBox to ensure proper coordinate system
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "200");
    svg.setAttribute("height", "200");
    svg.setAttribute("viewBox", "-100 -100 200 200");
    svg.style.position = "absolute";
    svg.style.left = "50%";
    svg.style.top = "50%";
    svg.style.transform = "translate(-50%, -50%)";
    svg.style.overflow = "visible";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "0";
    svg.classList.add("fov-svg");

    const polygon = document.createElementNS(svgNS, "polygon");
    if (fovShape) polygon.setAttribute("points", fovShape.points);
    polygon.setAttribute("fill", alarm ? "rgba(255, 107, 0, 0.25)" : "rgba(0, 194, 255, 0.25)");
    polygon.setAttribute("stroke", alarm ? "#ff6b00" : "#00c2ff");
    polygon.setAttribute("stroke-width", "2");
    svg.appendChild(polygon);

    const icon = document.createElement('div');
    icon.className = 'marker-icon-dynamic';
    icon.style.width = '100%';
    icon.style.height = '100%';
    const iconUrl = (m && m.Icon && m.Icon !== 'Cctv') ? `/icons/${m.Icon}.svg` : '/ipro-camera.svg';
    icon.style.background = `url(${iconUrl}) center / contain no-repeat`;
    icon.style.transform = `rotate(${Geometry.normalizeAngle(angle - 90)}deg)`;
    icon.style.filter = alarm 
      ? `drop-shadow(0 0 8px ${alarmStyles[alarm.pri] || '#fff'})` 
      : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45))';

    rotateContainer.appendChild(svg);
    rotateContainer.appendChild(icon);
    inner.appendChild(label);
    inner.appendChild(rotateContainer);
    container.appendChild(inner);

    return container;
  }

  function updateMarkerElement(el: HTMLElement, m: any, angle: number, iconScale: number, alarm: Alarm | undefined, isOffline: boolean, viewScale: number, fovShape: any) {
    const rotateContainer = el.querySelector('.relative.flex.items-center.justify-center') as HTMLElement;
    if (rotateContainer) {
      if (alarm) rotateContainer.classList.add('marker-alarm-blink');
      else rotateContainer.classList.remove('marker-alarm-blink');
    }

    const label = el.querySelector('.marker-label') as HTMLElement;
    if (label) {
      label.className = cn(
        "marker-label absolute bottom-full mb-2 px-2 py-0.5 whitespace-nowrap shadow-xl transition-opacity pointer-events-none text-[10px] font-bold rounded bg-white border border-black/10 text-black uppercase",
        (alarm || isOffline) ? "opacity-100" : "opacity-0 group-hover/marker:opacity-100"
      );
      label.innerText = `${m.CameraName}${isOffline ? ' (OFFLINE)' : ''}`;
    }

    if (rotateContainer) {
      const finalSize = Math.round(32 * iconScale * viewScale);
      rotateContainer.style.width = `${finalSize}px`;
      rotateContainer.style.height = `${finalSize}px`;
    }

    const polygon = el.querySelector('.fov-svg polygon') as SVGPolygonElement;
    if (polygon && fovShape) {
      polygon.setAttribute("points", fovShape.points);
      polygon.setAttribute("fill", alarm ? "rgba(255, 107, 0, 0.25)" : "rgba(0, 194, 255, 0.25)");
      polygon.setAttribute("stroke", alarm ? "#ff6b00" : "#00c2ff");
      polygon.setAttribute("stroke-width", "2");
    }

    const icon = el.querySelector('.marker-icon-dynamic') as HTMLElement;
    if (icon) {
      const iconUrl = (m && m.Icon && m.Icon !== 'Cctv') ? `/icons/${m.Icon}.svg` : '/ipro-camera.svg';
      icon.style.background = `url(${iconUrl}) center / contain no-repeat`;
      icon.style.transform = `rotate(${Geometry.normalizeAngle(angle - 90)}deg)`;
      icon.style.filter = alarm 
        ? `drop-shadow(0 0 8px ${alarmStyles[alarm.pri] || '#fff'})` 
        : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45))';
    }
  }

  return (
    <div className="flex-1 relative bg-[#05070a] overflow-hidden">
      <style>{`
        @keyframes marker-alert-blink {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 15px rgba(255, 107, 0, 0.8)); }
          50% { opacity: 0.5; filter: drop-shadow(0 0 5px rgba(255, 0, 0, 0.4)); }
        }
        .marker-alarm-blink {
          animation: marker-alert-blink 0.8s infinite ease-in-out;
        }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full" />
      
      <div className="absolute top-4 right-4 z-50">
        <div className="flex flex-col bg-white border border-[#cccccc] rounded-sm overflow-hidden shadow-[0_1px_5px_rgba(0,0,0,0.2)]">
          <button 
            onClick={handleZoomIn}
            className="w-[29px] h-[29px] flex items-center justify-center text-black hover:bg-gray-100 border-b border-[#eeeeee] transition-colors"
            title="Phóng to"
          >
            <IconZoomIn size={18} />
          </button>
          <button 
            onClick={handleZoomOut}
            className="w-[29px] h-[29px] flex items-center justify-center text-black hover:bg-gray-100 border-b border-[#eeeeee] transition-colors"
            title="Thu nhỏ"
          >
            <IconZoomOut size={18} />
          </button>
          <button 
            onClick={handleReset}
            className="w-[29px] h-[29px] flex items-center justify-center text-black hover:bg-gray-100 transition-colors"
            title="Reset (Fit)"
          >
            <IconFocus2 size={18} />
          </button>
        </div>
      </div>

      {showLegend && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#0a0f1d]/80 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-2.5 z-20 flex items-center gap-8 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all hover:bg-[#0a0f1d]/95 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2.5 text-[10px] font-black text-white/70 uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-psim-red shadow-[0_0_8px_#ff4d4d]" /> Critical
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-2.5 text-[10px] font-black text-white/70 uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-psim-orange shadow-[0_0_8px_#ff6b00]" /> High
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-2.5 text-[10px] font-black text-white/70 uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-psim-orange shadow-[0_0_8px_#00c2ff]" /> Medium
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-2.5 text-[10px] font-black text-white/70 uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-psim-green shadow-[0_0_8px_#22c55e]" /> Low / Normal
          </div>
        </div>
      )}
    </div>
  );
}
