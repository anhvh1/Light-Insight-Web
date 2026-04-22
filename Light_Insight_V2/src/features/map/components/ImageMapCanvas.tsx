import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { IconZoomIn, IconZoomOut, IconFocus2 } from '@tabler/icons-react';
import type { Alarm } from '@/types';
import * as Constants from '../constants';
import * as Geometry from '../utils';

const {
} = Constants;

interface ImageMapCanvasProps {
  activeMapUrl: string;
  activeMapName: string;
  markers: any[];
  alarmsBySource: Map<string, Alarm>;
  cameraStatusMap: Map<string, any>;
  onMarkerClick: (alarm: Alarm) => void;
  showLegend: boolean;
}

export function ImageMapCanvas({
  activeMapUrl,
  activeMapName,
  markers,
  alarmsBySource,
  cameraStatusMap,
  onMarkerClick,
  showLegend,
}: ImageMapCanvasProps) {
  // Internal State for maximum performance and smoothness
  const [zoomScale, setZoomScale] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  const panningStartRef = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const rafRef = useRef<number | null>(null);

  const fitImageToViewport = useCallback(() => {
    if (imageNaturalSize.width > 0 && viewportRef.current) {
        const viewport = viewportRef.current.getBoundingClientRect();
        const padding = 40;
        const availableW = viewport.width - padding * 2;
        const availableH = viewport.height - padding * 2;
        
        const scaleW = availableW / imageNaturalSize.width;
        const scaleH = availableH / imageNaturalSize.height;
        const fitScale = Math.min(scaleW, scaleH);
        
        setZoomScale(fitScale);
        setMapOffset({
            x: (viewport.width - imageNaturalSize.width * fitScale) / 2,
            y: 5
        });
    }
  }, [imageNaturalSize]);

  // Initial fit when image loads
  useEffect(() => {
    fitImageToViewport();
  }, [imageNaturalSize.width, imageNaturalSize.height, fitImageToViewport]);

  // Handle Viewport Resize
  useEffect(() => {
    const observer = new ResizeObserver(() => {
        fitImageToViewport();
    });
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [fitImageToViewport]);

  // Smoother Panning with BOUNDS
  useEffect(() => {
    if (!isPanning || !viewportRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      
      rafRef.current = requestAnimationFrame(() => {
        if (!viewportRef.current || !panningStartRef.current) return;

        const viewport = viewportRef.current.getBoundingClientRect();
        const dx = e.clientX - panningStartRef.current.mouseX;
        const dy = e.clientY - panningStartRef.current.mouseY;
        
        let nextX = (panningStartRef.current.offsetX ?? 0) + dx;
        let nextY = (panningStartRef.current.offsetY ?? 0) + dy;

        const imgW = (imageNaturalSize?.width ?? 0) * zoomScale;
        const imgH = (imageNaturalSize?.height ?? 0) * zoomScale;
        
        // Keep at least 100px visible
        nextX = Math.max(-imgW + 100, Math.min(viewport.width - 100, nextX));
        nextY = Math.max(-imgH + 100, Math.min(viewport.height - 100, nextY));

        setMapOffset({ x: nextX, y: nextY });
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPanning, imageNaturalSize, zoomScale]);

  // Internal Zoom Handlers
  const handleZoomIn = () => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const oldScale = zoomScale;
    const newScale = Math.min(10, zoomScale + 0.2);
    setZoomScale(newScale);
    setMapOffset({
        x: centerX - (centerX - mapOffset.x) * (newScale / oldScale),
        y: centerY - (centerY - mapOffset.y) * (newScale / oldScale)
    });
  };

  const handleZoomOut = () => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const oldScale = zoomScale;
    const newScale = Math.max(0.1, zoomScale - 0.2);
    setZoomScale(newScale);
    setMapOffset({
        x: centerX - (centerX - mapOffset.x) * (newScale / oldScale),
        y: centerY - (centerY - mapOffset.y) * (newScale / oldScale)
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.1, Math.min(10, zoomScale + delta));
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const oldScale = zoomScale;
    
    setZoomScale(newScale);
    setMapOffset({ 
        x: mouseX - (mouseX - mapOffset.x) * (newScale / oldScale), 
        y: mouseY - (mouseY - mapOffset.y) * (newScale / oldScale) 
    });
  };

  const imageFovShapes = useMemo(() => {
    if (imageNaturalSize.width <= 0 || imageNaturalSize.height <= 0) return [];
    const baseScale = Math.min(imageNaturalSize.width, imageNaturalSize.height);
    
    return markers.map(m => {
       const angle = m.angleDegrees || 0;
       const fov = m.fovDegrees || 140;
       const iconScale = m.iconScale || 1;
       const rangeValue = typeof m.range === 'number' ? m.range : 0.25;
       const rangePixels = Geometry.clamp01(rangeValue) * baseScale * iconScale;

       return {
         cameraId: m.cameraId,
         points: Geometry.buildImageSectorPoints(0, 0, angle, rangePixels, fov)
       };
    });
  }, [markers, imageNaturalSize]);

  return (
    <div 
      ref={viewportRef}
      id="map-canvas"
      className={cn(
        "flex-1 relative bg-[#05070a] overflow-hidden group/map select-none",
        isPanning ? "cursor-grabbing" : "cursor-grab"
      )}
      onWheel={handleWheel}
      onMouseDown={(e) => { 
        if (e.button === 0) { 
          e.preventDefault();
          const currentX = mapOffset?.x ?? 0;
          const currentY = mapOffset?.y ?? 0;
          panningStartRef.current = { 
            mouseX: e.clientX, 
            mouseY: e.clientY, 
            offsetX: currentX, 
            offsetY: currentY 
          };
          setIsPanning(true); 
        } 
      }} 
    >
      {/* Zoom Controls Overlay */}
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
            onClick={fitImageToViewport}
            className="w-[29px] h-[29px] flex items-center justify-center text-black hover:bg-gray-100 transition-colors"
            title="Reset (Fit)"
          >
            <IconFocus2 size={18} />
          </button>
        </div>
      </div>

      {/* Legend */}
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

      {/* Map Content Layer */}
      <div 
        className="absolute left-0 top-0 origin-top-left" 
        style={{ 
            transform: `translate3d(${mapOffset.x}px, ${mapOffset.y}px, 0) scale(${zoomScale})`,
            width: imageNaturalSize.width,
            height: imageNaturalSize.height,
            pointerEvents: 'none',
            willChange: 'transform'
        }}
      >
           <img 
             src={activeMapUrl} 
             style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }}
             className="drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]" 
             alt={activeMapName} 
             draggable="false"
             onDragStart={(e) => e.preventDefault()}
             onLoad={(e) => {
               setImageNaturalSize({
                 width: e.currentTarget.naturalWidth,
                 height: e.currentTarget.naturalHeight
               });
             }}
           />
           
           {/* Map Markers Layer */}
           {markers.map((m: any, idx) => {
             const alarmForMarker = alarmsBySource.get(m.CameraName);
             const cameraId = m.cameraId;
             const status = cameraStatusMap.get(cameraId);
             const isOffline = status && status.IsOnline === false;
             
             const angle = m.angleDegrees || 0;
             const scale = m.iconScale || 1;
             
             // Natural scale: Icon size is fixed (32px) relative to image pixels.
             // It will get smaller when you zoom out, matching map-v2 behavior.
             const iconSize = 32 * scale; 
             
             const fovShape = imageFovShapes[idx];
             
             return (
               <div 
                 key={cameraId}
                 className={cn("absolute cursor-pointer group/marker z-10", (isOffline || alarmForMarker) && "z-20")}
                 style={{ 
                   left: `${m.x * 100}%`, 
                   top: `${m.y * 100}%`,
                   transform: `translate(-50%, -50%)`,
                   pointerEvents: 'auto'
                 }}
                 onClick={() => {
                   if (alarmForMarker) {
                     onMarkerClick(alarmForMarker);
                   }
                 }}
               >
                 <div className="relative flex flex-col items-center">
                    {/* SVG Layer for FOV */}
                    {fovShape && (
                      <svg
                          width="0"
                          height="0"
                          style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none' }}
                      >
                          <polygon
                              points={fovShape.points}
                              fill={alarmForMarker ? "rgba(255, 107, 0, 0.15)" : "rgba(0, 194, 255, 0.15)"}
                              stroke={alarmForMarker ? "rgba(255, 107, 0, 0.5)" : "rgba(0, 194, 255, 0.5)"}
                              strokeWidth="1"
                          />
                      </svg>
                    )}

                    {/* Camera Label */}
                    <div className={cn(
                      "absolute bottom-full mb-2 px-2 py-0.5 whitespace-nowrap shadow-xl transition-opacity pointer-events-none font-bold rounded bg-white border border-black/10 text-black uppercase",
                      (alarmForMarker || isOffline) ? "opacity-100" : "opacity-0 group-hover/marker:opacity-100"
                    )}
                    style={{ 
                        fontSize: '10px',
                        padding: '2px 8px',
                        marginBottom: '8px'
                    }}
                    >
                      {m.CameraName} {isOffline && "(OFFLINE)"}
                    </div>

                    {/* Camera Icon */}
                    <div 
                        style={{
                          width: iconSize,
                          height: iconSize,
                          background: `url(${m.Icon && m.Icon !== 'Cctv' ? `/icons/${m.Icon}.svg` : '/ipro-camera.svg'}) center / contain no-repeat`,
                          filter: alarmForMarker 
                            ? `drop-shadow(0 0 8px ${
                                alarmForMarker.pri === 'critical' ? '#ff4d4d' : 
                                alarmForMarker.pri === 'high' ? '#ff6b00' : 
                                alarmForMarker.pri === 'medium' ? '#00c2ff' : '#22c55e'
                              })` 
                            : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45))',
                          transform: `rotate(${Geometry.normalizeAngle(angle - 90)}deg)`,
                          transformOrigin: 'center'
                        }}
                    />
                 </div>
               </div>
             );
           })}
      </div>
    </div>
  );
}
