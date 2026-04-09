import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { 
  MapPin, 
  ChevronRight, 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Layers, 
  Building2, 
  Map as MapIcon,
  Search,
  Maximize2,
  Activity,
  Cctv,
  RefreshCcw
} from 'lucide-react';
import { mapApi } from '@/lib/map-api';
import { useAlarmStream } from '@/features/alarms/AlarmStreamProvider';
import type { MapTreeNode } from '@/types';

const STATS = [
  { label: 'CAMERA ACTIVE', val: '47', sub: '/ 52 total', color: 'text-psim-green' },
  { label: 'GUARDS ON DUTY', val: '8', sub: 'Ca đêm', color: 'text-psim-orange' },
  { label: 'ACCESS EVENTS/H', val: '142', sub: '↑ normal', color: 'text-psim-accent' },
  { label: 'LPR SCAN/H', val: '38', sub: '2 mismatch', color: 'text-teal' },
];

export function MapView() {
  const { alarms, bellCount } = useAlarmStream();
  
  const criticalCount = alarms.filter(a => a.pri === 'critical').length;

  const stats = [
    { label: 'ACTIVE ALARMS', val: alarms.length.toString(), sub: `${criticalCount} critical`, color: 'text-psim-red' },
    { label: 'CAMERA ACTIVE', val: '47', sub: '/ 52 total', color: 'text-psim-green' },
    { label: 'GUARDS ON DUTY', val: '8', sub: 'Night Shift', color: 'text-psim-orange' },
    { label: 'ACCESS EVENTS/H', val: '142', sub: '↑ normal', color: 'text-psim-accent' },
    { label: 'LPR SCAN/H', val: '38', sub: '2 mismatch', color: 'text-teal' },
  ];

  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedMapName, setSelectedMapName] = useState<string | null>(null);
  const [activeMapUrl, setActiveMapMapUrl] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  // Zoom & Pan States
  const [zoomScale, setZoomScale] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  // Refs for high-frequency updates & Start-Delta logic
  const panningStartRef = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 });
  const mapOffsetRef = useRef({ x: 0, y: 0 });
  const zoomScaleRef = useRef(1);
  const isPanningRef = useRef(false);
  
  useEffect(() => { mapOffsetRef.current = mapOffset; }, [mapOffset]);
  useEffect(() => { zoomScaleRef.current = zoomScale; }, [zoomScale]);
  useEffect(() => { isPanningRef.current = isPanning; }, [isPanning]);

  // --- API DATA FETCHING ---
  const { data: mapTreeResponse, isLoading: isLoadingTree } = useQuery({
    queryKey: ['map-tree-view'],
    queryFn: mapApi.getAllTree
  });
  const mapTree = mapTreeResponse?.Data || [];

  const { data: markersResponse } = useQuery({
    queryKey: ['map-markers-view', selectedMapId],
    queryFn: () => mapApi.getMarkers(selectedMapId!),
    enabled: !!selectedMapId
  });
  const markers = markersResponse?.Data || [];

  // Draggable Toolbar States
  const [isExpanded, setIsExpanded] = useState(true);
  const [toolbarPos, setToolbarPos] = useState({ x: 20, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: toolbarPos.x,
      startY: toolbarPos.y
    };
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!activeMapUrl) return;
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

  const handleZoomIn = () => setZoomScale(prev => Math.min(10, prev + 0.2));
  const handleZoomOut = () => setZoomScale(prev => Math.max(0.1, prev - 0.2));
  const handleResetZoom = () => {
    setZoomScale(1);
    setMapOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 1. Toolbar Dragging
      if (isDragging && mapContainerRef.current && toolbarRef.current) {
        const containerRect = mapContainerRef.current.getBoundingClientRect();
        const toolbarRect = toolbarRef.current.getBoundingClientRect();
        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current.mouseY;
        let newRight = dragStartRef.current.startX - dx;
        let newTop = dragStartRef.current.startY + dy;
        newRight = Math.max(8, Math.min(containerRect.width - toolbarRect.width - 8, newRight));
        newTop = Math.max(8, Math.min(containerRect.height - toolbarRect.height - 8, newTop));
        setToolbarPos({ x: newRight, y: newTop });
        return;
      }

      // 2. Map Panning
      if (isPanningRef.current && activeMapUrl) {
        const dx = e.clientX - panningStartRef.current.mouseX;
        const dy = e.clientY - panningStartRef.current.mouseY;
        setMapOffset({ 
          x: panningStartRef.current.offsetX + dx, 
          y: panningStartRef.current.offsetY + dy 
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsPanning(false);
    };

    if (isDragging || isPanning) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isPanning, activeMapUrl]);

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans select-none">
      {/* Header & Stats Bar */}
      <div className="px-3 py-3 border-b border-border-dim bg-bg0/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-[16px] font-semibold uppercase tracking-tight text-white">Situational Map</h1>
            {selectedMapName && (
              <div className="flex items-center h-6 px-3 bg-psim-orange/10 border border-psim-orange/20 rounded text-psim-orange text-[10px] font-bold uppercase tracking-widest animate-in fade-in zoom-in-95 duration-300">
                {selectedMapName}
              </div>
            )}
          </div>
          <div className="text-[10px] text-t2 font-mono flex gap-4">
            <span><span className="text-psim-red">●</span> {bellCount} alarms active</span>
            <span>47/52 cameras online</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-px bg-border-dim border border-border-dim rounded overflow-hidden">
          {stats.map((s, i) => (
            <div key={i} className="bg-bg0/40 p-3 flex flex-col gap-1 hover:bg-bg1/60 transition-colors cursor-default">
              <div className="text-[9px] font-mono text-t2 tracking-widest">{s.label}</div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-2xl font-heading font-bold leading-none", s.color)}>{s.val}</span>
                <span className="text-[10px] text-t2 font-mono">{s.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-14 border-r border-white/5 flex flex-col items-center py-6 gap-4 bg-[#0a0f1d]/40">
          <button 
            onClick={handleZoomIn}
            disabled={!activeMapUrl}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-psim-orange hover:border-psim-orange hover:shadow-[0_0_15px_rgba(255,107,0,0.3)] transition-all font-bold disabled:opacity-20 disabled:grayscale"
          >
            +
          </button>
          <button 
            onClick={handleZoomOut}
            disabled={!activeMapUrl}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-psim-orange hover:border-psim-orange hover:shadow-[0_0_15px_rgba(255,107,0,0.3)] transition-all font-bold disabled:opacity-20 disabled:grayscale"
          >
            -
          </button>
          <button 
            onClick={handleResetZoom}
            disabled={!activeMapUrl}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-psim-accent hover:bg-psim-accent hover:text-bg0 transition-all font-bold disabled:opacity-20 disabled:grayscale"
            title="Reset (100%)"
          >
            🎯
          </button>
          
          <div className="flex-1" />

          <button 
            onClick={() => setShowLegend(!showLegend)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl border transition-all",
              showLegend ? "bg-psim-orange border-psim-orange text-white shadow-[0_0_15px_rgba(255,107,0,0.3)]" : "border-white/10 bg-white/5 text-t3 hover:text-white"
            )}
            title="Bật/Tắt chú thích"
          >
            <Activity size={18} />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-t3 hover:text-white transition-all"><Maximize2 size={18} /></button>
        </div>

        {/* Map Canvas */}
        <div 
          ref={mapContainerRef} 
          id="map-canvas"
          className={cn(
            "flex-1 relative bg-[#05070a] overflow-hidden flex items-center justify-center group/map select-none",
            isPanning ? "cursor-grabbing" : (activeMapUrl ? "cursor-grab" : "cursor-default")
          )}
          onWheel={handleWheel}
          onMouseDown={(e) => { 
            if (e.button === 0 && activeMapUrl) { 
              e.preventDefault();
              panningStartRef.current = { 
                mouseX: e.clientX, 
                mouseY: e.clientY, 
                offsetX: mapOffsetRef.current.x, 
                offsetY: mapOffsetRef.current.y 
              };
              setIsPanning(true); 
            } 
          }} 
        >
          {/* Legend (Bottom Center - Slim Pill Style) */}
          {showLegend && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#0a0f1d]/80 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-2.5 z-20 flex items-center gap-8 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all hover:bg-[#0a0f1d]/95 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2.5 text-[10px] font-black text-white/70 uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-psim-red shadow-[0_0_8px_#ff4d4d]" /> 
                Critical
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-2.5 text-[10px] font-black text-white/70 uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-psim-orange shadow-[0_0_8px_#ff6b00]" /> 
                High
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-2.5 text-[10px] font-black text-white/70 uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-psim-accent shadow-[0_0_8px_#00c2ff]" /> 
                Medium
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-2.5 text-[10px] font-black text-white/70 uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-psim-green shadow-[0_0_8px_#22c55e]" /> 
                Low / Normal
              </div>
            </div>
          )}

          {/* Map Image or SVG */}
          {activeMapUrl ? (
            <div 
              className="w-full h-full flex items-start justify-center relative origin-center pt-[5px] px-20 pb-20" 
              style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${zoomScale})` }}
            >
               <div className="relative inline-block">
                 <img 
                   src={activeMapUrl} 
                   className="max-w-full max-h-full object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]" 
                   alt="Current Map" 
                   draggable="false"
                   onDragStart={(e) => e.preventDefault()}
                 />
                 
                 {/* Map Markers (Cameras) */}
                 {markers.map((m: any) => (
                   <div 
                     key={m.Id}
                     className="absolute cursor-pointer group/marker z-10"
                     style={{ 
                       left: `${m.PosX}%`, 
                       top: `${m.PosY}%`,
                       transform: `translate(-50%, -50%)`
                     }}
                     title={m.CameraName}
                   >
                     <div className="relative flex flex-col items-center">
                        {/* Camera Label (Visible on hover) */}
                        <div className="bg-white border border-black/10 rounded px-2 py-0.5 mb-3 whitespace-nowrap shadow-xl z-30 opacity-0 group-hover/marker:opacity-100 transition-opacity pointer-events-none text-[9px] font-bold text-black uppercase">
                          {m.CameraName}
                        </div>

                        {/* Rotation Container */}
                        <div className="relative w-10 h-10 flex items-center justify-center" style={{ transform: `rotate(${m.Rotation || 0}deg)` }}>
                          {/* Field of View (FoV) Cone */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 pointer-events-none">
                            <div className="relative -top-[100px]">
                              <svg width="140" height="100" viewBox="0 0 140 100" className="opacity-40">
                                <path d="M70 100 L0 0 L140 0 Z" fill="rgba(0, 194, 255, 0.3)" stroke="rgba(0, 194, 255, 0.5)" strokeWidth="1" />
                              </svg>
                            </div>
                          </div>

                          {/* Camera Icon */}
                          <div className={cn(
                            "w-10 h-10 rounded-xl border flex items-center justify-center bg-[#1a1f2e] text-white shadow-2xl transition-all group-hover/marker:scale-110",
                            m.VmsID === 0 ? "border-psim-orange/50" : "border-psim-accent/50"
                          )}>
                            <Cctv size={22} className="-rotate-90" />
                          </div>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center opacity-20 grayscale pointer-events-none">
               <div className="flex items-center justify-center flex-col gap-4">
                  <MapIcon size={64} className="text-white" />
                  <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white">Vui lòng chọn bản đồ hệ thống</span>
               </div>
            </div>
          )}

          {/* Floating Map Tree Selector (Recursive) */}
          <div 
            ref={toolbarRef}
            style={{ 
              right: `${toolbarPos.x}px`, 
              top: `${toolbarPos.y}px`,
              transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
            className={cn(
              "absolute z-50 flex flex-col bg-[#0a0f1d]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300",
              isExpanded ? "rounded-2xl min-w-[280px] max-w-[320px]" : "rounded-xl min-w-[48px] w-[48px]"
            )}
          >
            {/* Header / Drag Handle */}
            <div className={cn(
              "flex items-center border-white/5 bg-white/[0.03]",
              isExpanded ? "justify-between px-4 py-3 border-b" : "flex-col py-2 gap-2"
            )}>
              <div 
                onMouseDown={handleDragStart}
                className={cn(
                  "flex items-center gap-2 cursor-move group",
                  !isExpanded && "flex-col"
                )}
              >
                {isExpanded ? (
                  <>
                    <GripVertical size={16} className="text-t3 group-hover:text-psim-orange transition-colors" />
                    <span className="text-[11px] font-black text-white uppercase tracking-widest">Hệ thống bản đồ</span>
                  </>
                ) : (
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-psim-orange/10 text-psim-orange group-hover:bg-psim-orange group-hover:text-white transition-all">
                    <Layers size={18} className={cn(!isDragging && "animate-pulse")} />
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "flex items-center justify-center hover:bg-psim-orange hover:text-white rounded-lg transition-all text-psim-orange",
                  isExpanded ? "w-7 h-7 bg-white/5" : "w-8 h-8"
                )}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {/* Tree Content (Only shown when expanded) */}
            <div className={cn(
              "flex flex-col p-2 transition-all duration-500",
              isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
            )}>
              {isExpanded && (
                <>
                  <div className="relative mb-3 px-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-t3" size={12} />
                    <input className="w-full bg-black/40 border border-white/5 rounded-xl h-9 pl-10 text-[11px] text-white outline-none focus:border-psim-orange/30 transition-all" placeholder="Tìm kiếm vị trí..." />
                  </div>

                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
                    {isLoadingTree ? (
                      <div className="py-10 flex flex-col items-center gap-2 opacity-40">
                        <RefreshCcw size={20} className="animate-spin text-psim-orange" />
                        <span className="text-[10px] font-bold uppercase">Syncing...</span>
                      </div>
                    ) : (
                      mapTree.map((node: MapTreeNode) => (
                        <TreeItem 
                          key={node.Id} 
                          node={node} 
                          level={0} 
                          selectedId={selectedMapId} 
                          onSelect={(n) => {
                            setSelectedMapId(n.Id);
                            setSelectedMapName(n.Name);
                            setActiveMapMapUrl(n.MapImagePath);
                          }} 
 
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Live Events Sidebar (Right) */}
        <div className="w-[320px] border-l border-white/5 bg-[#0a0f1d]/60 flex flex-col overflow-hidden backdrop-blur-lg">
          <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-psim-accent animate-pulse shadow-[0_0_8px_var(--accent)]" />
              <span className="text-[11px] font-black tracking-[0.1em] uppercase text-white">Live Event</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-psim-accent/10 text-psim-accent rounded border border-psim-accent/20">{alarms.length} ALERTS</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
            {alarms.slice(0, 20).map((alarm) => (
              <div key={alarm.id} className="p-3.5 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer group relative overflow-hidden">
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1 transition-transform origin-top scale-y-0 group-hover:scale-y-100",
                  alarm.pri === 'critical' ? "bg-psim-red" : "bg-psim-orange"
                )} />
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={cn(
                    "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                    alarm.pri === 'critical' ? "bg-psim-red text-white" : "bg-psim-orange text-white"
                  )}>
                    {alarm.pri}
                  </span>
                  <span className="text-[9px] font-mono text-t3 group-hover:text-t2">
                    {alarm.time}
                  </span>
                </div>
                <div className="text-[12px] font-bold leading-tight group-hover:text-psim-accent transition-colors mb-2 text-t1">
                  {alarm.title}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-t3 font-medium">
                  <MapPin size={10} className="text-psim-accent" /> {alarm.loc}
                </div>
              </div>
            ))}
            {alarms.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-20 gap-3">
                <Activity size={32} />
                <span className="text-[10px] font-bold uppercase tracking-widest">No active events</span>
              </div>
            )}
          </div>
          <button className="m-4 h-11 text-[10px] font-black border border-white/10 hover:border-psim-orange/50 hover:bg-psim-orange/5 rounded-xl transition-all text-t2 flex items-center justify-center gap-2 uppercase tracking-widest group">
            Global Activity Logs <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- TREE COMPONENT ---
function TreeItem({ node, level, selectedId, onSelect }: { node: MapTreeNode, level: number, selectedId: string | null, onSelect: (n: MapTreeNode) => void }) {
  const [isOpen, setIsExpanded] = useState(true);
  const hasChildren = node.Children && node.Children.length > 0;
  const isSelected = selectedId === node.Id;

  return (
    <div className="flex flex-col">
      <div 
        onClick={() => onSelect(node)}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        className={cn(
          "flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer transition-all group relative",
          isSelected 
            ? "bg-psim-orange/10 text-psim-orange" 
            : "hover:bg-white/[0.04] text-t2 hover:text-white"
        )}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          {hasChildren ? (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isOpen); }}
              className="w-4 h-4 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
            >
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <div className="w-4" />
          )}
          {level === 0 ? <Building2 size={14} /> : <MapIcon size={14} />}
          <span className="text-[12px] font-bold truncate tracking-tight">{node.Name}</span>
        </div>
        {isSelected && (
          <div className="w-1.5 h-1.5 rounded-full bg-psim-orange shadow-[0_0_8px_rgba(255,107,0,0.8)]" />
        )}
      </div>
      
      {hasChildren && isOpen && (
        <div className="flex flex-col">
          {node.Children.map(child => (
            <TreeItem key={child.Id} node={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
