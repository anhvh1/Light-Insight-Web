import { useState, useRef, useEffect, useMemo, createContext, useContext, useCallback, type ReactNode } from 'react';
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
  RefreshCcw,
  ZoomIn,
  ZoomOut,
  X
} from 'lucide-react';
import { mapApi } from '@/lib/map-api';
import type { MapTreeNode, Alarm } from '@/types';
import { useAlarmStream } from '@/features/alarms/AlarmStreamProvider';

import { normalizeApiAlarm } from '@/features/alarms/alarm-mapper';

// --- HELPER FUNCTION ---

function findFirstMap(nodes: MapTreeNode[]): MapTreeNode | null {
  for (const node of nodes) {
    // A node is considered a map if it has a path. This is the most reliable check.
    if (node.MapImagePath) {
      return node;
    }
    // If not, recurse into its children.
    if (node.Children && node.Children.length > 0) {
      const foundInChild = findFirstMap(node.Children);
      if (foundInChild) {
        return foundInChild;
      }
    }
  }
  return null;
}

function findMapById(nodes: MapTreeNode[], id: string): MapTreeNode | null {
  for (const node of nodes) {
    if (node.Id === id) return node;
    if (node.Children && node.Children.length > 0) {
      const found = findMapById(node.Children, id);
      if (found) return found;
    }
  }
  return null;
}

function filterMapTree(nodes: MapTreeNode[], query: string): MapTreeNode[] {
  if (!query) return nodes;
  const lowerQuery = query.toLowerCase();
  
  return nodes.map(node => {
    const isMatch = node.Name.toLowerCase().includes(lowerQuery);
    if (node.Children && node.Children.length > 0) {
      const filteredChildren = filterMapTree(node.Children, query);
      if (isMatch || filteredChildren.length > 0) {
        return { ...node, Children: filteredChildren };
      }
    } else if (isMatch) {
      return node;
    }
    return null;
  }).filter(Boolean) as MapTreeNode[];
}

// --- THE ACTUAL MAP VIEW COMPONENT (Consumes the context) ---

function MapViewInternal() {
  // Use the central alarm stream
  const { alarms: allAlarms } = useAlarmStream();

  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedMapName, setSelectedMapName] = useState<string | null>(null);
  const [activeMapUrl, setActiveMapMapUrl] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAlarms, setModalAlarms] = useState<Alarm[]>([]);
  const [modalPage, setModalPage] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    if (isModalOpen) {
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => {
        window.removeEventListener('keydown', handleEsc);
        document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

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

  const { data: historicalAlarmsResponse } = useQuery({
    queryKey: ['map-historical-alarms', selectedMapId],
    queryFn: () => mapApi.getMilestoneAlarms(selectedMapId!, 0, 20),
    enabled: !!selectedMapId,
    select: (res) => (res.Data || []).map(normalizeApiAlarm)
  });
  const historicalAlarms = historicalAlarmsResponse || [];

  // --- MODAL DATA FETCHING ---
  const fetchModalAlarms = useCallback(async (page: number, append = false) => {
    if (!selectedMapId) return;
    setIsFetchingMore(true);
    try {
      const res = await mapApi.getMilestoneAlarms(selectedMapId, page, 20);
      const newAlarms = (res.Data || []).map(normalizeApiAlarm);
      
      if (newAlarms.length < 20) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setModalAlarms(prev => append ? [...prev, ...newAlarms] : newAlarms);
      setModalPage(page);
    } catch (error) {
      console.error('Failed to fetch modal alarms:', error);
    } finally {
      setIsFetchingMore(false);
    }
  }, [selectedMapId]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setModalAlarms([]);
    setModalPage(0);
    setHasMore(true);
    void fetchModalAlarms(0);
  };

  const handleModalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || isFetchingMore) return;
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      void fetchModalAlarms(modalPage + 1, true);
    }
  };

  // --- AUTO-SELECT MAP ---
  useEffect(() => {
    // If a map isn't already selected and the tree has finished loading and is not empty
    if (!selectedMapId && !isLoadingTree && mapTree.length > 0) {
      const savedMapId = localStorage.getItem('lastSelectedMapId');
      let targetMap = savedMapId ? findMapById(mapTree, savedMapId) : null;
      
      if (!targetMap) {
        targetMap = findFirstMap(mapTree);
      }

      if (targetMap) {
        setSelectedMapId(targetMap.Id);
        setSelectedMapName(targetMap.Name);
        setActiveMapMapUrl(targetMap.MapImagePath);
        if (!savedMapId) {
          localStorage.setItem('lastSelectedMapId', targetMap.Id);
        }
      }
    }
  }, [mapTree, isLoadingTree, selectedMapId]);


  // Extract CameraNames from the markers for efficient lookup
  const cameraNamesOnActiveMap = useMemo(() => {
    return new Set(markers.map(marker => marker.CameraName));
  }, [markers]);


  // --- DERIVED STATE FROM CENTRAL ALARM STREAM + HISTORICAL ---

  // 1. Filter for alarms relevant to the map (must have a source AND that source must be a camera on the active map)
  const mapAlarms = useMemo(() => {
    const realtimeMapAlarms = allAlarms.filter(alarm => 
      alarm.src && cameraNamesOnActiveMap.has(alarm.src)
    );
    
    // Combine and remove duplicates by ID
    const combined = [...realtimeMapAlarms, ...historicalAlarms];
    const uniqueMap = new Map<string, Alarm>();
    combined.forEach(a => {
      if (!uniqueMap.has(a.id)) {
        uniqueMap.set(a.id, a);
      }
    });
    
    return Array.from(uniqueMap.values());
  }, [allAlarms, historicalAlarms, cameraNamesOnActiveMap]);

  // 2. Get the 6 most recent alarms for the live feed
  const latestAlarms = useMemo(() => {
    // The `allAlarms` from the hook are already sorted by time, newest first.
    return mapAlarms.slice(0, 6);
  }, [mapAlarms]);

  // 3. Daily Alarm Counters
  const [dailyAlarmCount, setDailyAlarmCount] = useState(0);
  const [dailyCriticalCount, setDailyCriticalCount] = useState(0);
  const processedAlarmsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedMapId) return;
    
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format based on local time
    const storageKey = `map_alarms_daily_${selectedMapId}`;
    const dateKey = `map_alarms_date_${selectedMapId}`;
    
    const savedDate = localStorage.getItem(dateKey);
    if (savedDate !== today) {
      localStorage.setItem(dateKey, today);
      localStorage.setItem(storageKey + '_total', '0');
      localStorage.setItem(storageKey + '_critical', '0');
      setDailyAlarmCount(0);
      setDailyCriticalCount(0);
      processedAlarmsRef.current.clear(); // Reset processed alarms on a new day
    } else {
      setDailyAlarmCount(parseInt(localStorage.getItem(storageKey + '_total') || '0', 10));
      setDailyCriticalCount(parseInt(localStorage.getItem(storageKey + '_critical') || '0', 10));
    }

    let newTotal = parseInt(localStorage.getItem(storageKey + '_total') || '0', 10);
    let newCritical = parseInt(localStorage.getItem(storageKey + '_critical') || '0', 10);
    let updated = false;

    allAlarms.forEach(alarm => {
      // Only process NEW alarms from hub that belong to the current map's cameras
      if (alarm.isNew && alarm.src && cameraNamesOnActiveMap.has(alarm.src)) {
        if (!processedAlarmsRef.current.has(alarm.id)) {
          processedAlarmsRef.current.add(alarm.id);
          newTotal += 1;
          if (alarm.pri === 'critical') {
            newCritical += 1;
          }
          updated = true;
        }
      }
    });

    if (updated) {
      localStorage.setItem(storageKey + '_total', newTotal.toString());
      localStorage.setItem(storageKey + '_critical', newCritical.toString());
      setDailyAlarmCount(newTotal);
      setDailyCriticalCount(newCritical);
    }
  }, [allAlarms, selectedMapId, cameraNamesOnActiveMap]);

  const stats = [
    { label: 'ACTIVE ALARMS', val: dailyAlarmCount.toString(), sub: `${dailyCriticalCount} critical`, color: 'text-psim-red' },
    { label: 'CAMERA ACTIVE', val: '47', sub: '/ 52 total', color: 'text-psim-green' },
    { label: 'GUARDS ON DUTY', val: '8', sub: 'Night Shift', color: 'text-psim-orange' },
    { label: 'ACCESS EVENTS/H', val: '142', sub: '↑ normal', color: 'text-psim-accent' },
    { label: 'LPR SCAN/H', val: '38', sub: '2 mismatch', color: 'text-teal' },
  ];

  // Draggable Toolbar States
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toolbarPos, setToolbarPos] = useState({ x: 20, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const [dismissedAlarmIds, setDismissedAlarmIds] = useState<Set<string>>(new Set());
  const scheduledAlarmsRef = useRef<Set<string>>(new Set());

  // Handle auto-dismiss after 5s
  useEffect(() => {
    mapAlarms.forEach(alarm => {
      if (!scheduledAlarmsRef.current.has(alarm.id)) {
        scheduledAlarmsRef.current.add(alarm.id);
        setTimeout(() => {
          setDismissedAlarmIds(prev => {
            const next = new Set(prev);
            next.add(alarm.id);
            return next;
          });
        }, 5000);
      }
    });
  }, [mapAlarms]);

  // Create a map of deviceId -> highest priority alarm (that hasn't been dismissed)
  const alarmsBySource = useMemo(() => {
    const priorityOrder: { [key: string]: number } = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };
    
    // Filter out dismissed alarms first
    const activeMapAlarms = mapAlarms.filter(a => !dismissedAlarmIds.has(a.id));
    
    const map = new Map<string, Alarm>();
    const sortedAlarms = [...activeMapAlarms].sort((a, b) => (priorityOrder[a.pri] || 5) - (priorityOrder[b.pri] || 5));
    
    for (const alarm of sortedAlarms) {
      if (alarm.src && !map.has(alarm.src)) {
        map.set(alarm.src, alarm);
      }
    }
    return map;
  }, [mapAlarms, dismissedAlarmIds]);

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
      if (isDragging && mapContainerRef.current && toolbarRef.current) {
        const containerRect = mapContainerRef.current.getBoundingClientRect();
        const toolbarRect = toolbarRef.current.getBoundingClientRect();
        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current. mouseY;
        let newRight = dragStartRef.current.startX - dx;
        let newTop = dragStartRef.current.startY + dy;
        newRight = Math.max(8, Math.min(containerRect.width - toolbarRect.width - 8, newRight));
        newTop = Math.max(8, Math.min(containerRect.height - toolbarRect.height - 8, newTop));
        setToolbarPos({ x: newRight, y: newTop });
        return;
      }

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

  const alarmStyles: { [key: string]: string } = {
    critical: 'border-psim-red shadow-[0_0_15px_3px_var(--tw-shadow-color)] shadow-psim-red/50 animate-pulse',
    high: 'border-psim-orange shadow-[0_0_15px_3px_var(--tw-shadow-color)] shadow-psim-orange/50 animate-pulse',
    medium: 'border-psim-accent shadow-[0_0_15px_3px_var(--tw-shadow-color)] shadow-psim-accent/50',
    low: 'border-psim-green',
  };

  const filteredMapTree = useMemo(() => filterMapTree(mapTree, searchQuery), [mapTree, searchQuery]);

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans select-none">
      {/* Custom Tailwind Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            onClick={() => setIsModalOpen(false)} 
          />
          
          {/* Modal Content */}
          <div className="relative w-[1200px] h-[80vh] bg-[#0a0f1d] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-psim-orange/10 flex items-center justify-center text-psim-orange shadow-inner">
                   <Activity size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold uppercase tracking-widest text-white leading-none mb-1">
                    Nhật ký sự kiện
                  </h2>
                  <p className="text-[11px] font-bold text-psim-orange uppercase tracking-tighter opacity-70">
                    Bản đồ: {selectedMapName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-psim-red hover:text-white flex items-center justify-center transition-all group"
              >
                <X size={20} className="group-hover:rotate-90 transition-transform duration-300 text-t3 group-hover:text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div 
              ref={modalScrollRef}
              onScroll={handleModalScroll}
              className="flex-1 overflow-y-auto custom-scrollbar bg-[#05070a]/50"
            >
              {/* Table Header */}
              <div className="sticky top-0 z-20 grid grid-cols-[120px_120px_1fr_200px_150px_150px] gap-6 px-8 py-4 bg-[#161b2e] border-b border-white/10 text-[10px] font-heading font-bold uppercase tracking-widest text-t3">
                <div>Thời gian</div>
                <div>Mức độ</div>
                <div>Nội dung sự kiện</div>
                <div>Nguồn</div>
                <div>Hệ thống</div>
                <div>Địa chỉ IP</div>
              </div>

              <div className="flex flex-col min-h-full">
                {modalAlarms.map((alarm, idx) => (
                  <div 
                    key={alarm.id + idx} 
                    className="grid grid-cols-[120px_120px_1fr_200px_150px_150px] gap-6 px-8 py-4 border-b border-white/[0.03] hover:bg-white/[0.03] transition-all items-center group/row"
                  >
                    <div className="text-[12px] font-mono text-t2 font-semibold group-hover/row:text-white transition-colors">
                      {alarm.time}
                    </div>
                    <div>
                      <span className={cn(
                        "text-[10px] font-heading font-bold px-3 py-1 rounded-lg uppercase tracking-wider border inline-block text-center min-w-[80px]",
                        alarm.pri === 'critical' ? "border-psim-red/40 bg-psim-red/10 text-psim-red" : "border-psim-orange/40 bg-psim-orange/10 text-psim-orange"
                      )}>
                        {alarm.pri}
                      </span>
                    </div>
                    <div className="text-[14px] font-medium text-white/90 group-hover/row:text-psim-accent transition-colors truncate" title={alarm.title}>
                      {alarm.title}
                    </div>
                    <div className="text-[13px] font-medium text-t2 group-hover/row:text-white transition-colors truncate flex items-center gap-2" title={alarm.src}>
                      <Cctv size={14} className="opacity-50" />
                      <span className="truncate">{alarm.src || '---'}</span>
                    </div>
                    <div className="text-[13px] font-medium text-t2 group-hover/row:text-white transition-colors truncate" title={alarm.connectorName}>
                      {alarm.connectorName || '---'}
                    </div>
                    <div className="text-[12px] font-mono text-t3 group-hover/row:text-white transition-colors truncate" title={alarm.ipadress}>
                      {alarm.ipadress || '---'}
                    </div>
                  </div>
                ))}

                {isFetchingMore && (
                  <div className="p-10 flex flex-col items-center justify-center gap-3 text-psim-orange">
                    <RefreshCcw size={24} className="animate-spin" />
                    <span className="text-[11px] font-heading font-bold uppercase tracking-[0.2em]">Đang đồng bộ dữ liệu...</span>
                  </div>
                )}
                
                {!hasMore && modalAlarms.length > 0 && (
                  <div className="py-12 flex flex-col items-center justify-center gap-4 opacity-30">
                    <div className="h-px w-24 bg-white/20" />
                    <span className="text-[10px] font-heading font-bold uppercase tracking-[0.3em]">Hết danh sách sự kiện</span>
                    <div className="h-px w-24 bg-white/20" />
                  </div>
                )}

                {modalAlarms.length === 0 && !isFetchingMore && (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-40 gap-6">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-white flex items-center justify-center">
                       <Activity size={40} />
                    </div>
                    <span className="text-[14px] font-heading font-bold uppercase tracking-[0.4em]">Trống dữ liệu</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
            <span><span className="text-psim-red">●</span> {dailyAlarmCount} alarms active</span>
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
            onClick={() => setShowLegend(!showLegend)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl border transition-all",
              showLegend ? "bg-psim-orange border-psim-orange text-white shadow-[0_0_15px_rgba(255,107,0,0.3)]" : "border-white/10 bg-white/5 text-t3 hover:text-white"
            )}
            title="Bật/Tắt chú thích"
          >
            <Activity size={18} />
          </button>
          <div className="flex-1" />
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
          {/* Zoom Controls Overlay */}
          {activeMapUrl && (
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-50">
              <div className="flex flex-col bg-[#161b2e]/90 border border-white/10 rounded-lg overflow-hidden shadow-2xl backdrop-blur-md">
                <button 
                  onClick={handleZoomIn}
                  className="w-10 h-10 flex items-center justify-center text-t-2 hover:text-white hover:bg-psim-orange transition-all"
                  title="Phóng to"
                >
                  <ZoomIn size={20} />
                </button>
                <div className="h-px bg-white/10 mx-2" />
                <button 
                  onClick={handleZoomOut}
                  className="w-10 h-10 flex items-center justify-center text-t-2 hover:text-white hover:bg-psim-orange transition-all"
                  title="Thu nhỏ"
                >
                  <ZoomOut size={20} />
                </button>
              </div>
              <button 
                onClick={handleResetZoom}
                className="w-10 h-10 bg-[#161b2e]/90 border border-white/10 rounded-lg flex items-center justify-center text-t-2 hover:text-white hover:bg-psim-orange transition-all shadow-2xl backdrop-blur-md"
                title="Reset (100%)"
              >
                <Maximize2 size={20} />
              </button>
            </div>
          )}

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
                 {markers.map((m: any) => {
                   const alarmForMarker = alarmsBySource.get(m.CameraName);
                   return (
                     <div 
                       key={m.Id}
                       className="absolute cursor-pointer group/marker z-10"
                       style={{ 
                         left: `${m.PosX}%`, 
                         top: `${m.PosY}%`,
                         transform: `translate(-50%, -50%)`
                       }}
                       onClick={() => {
                         if (alarmForMarker) {
                           setDismissedAlarmIds(prev => {
                             const next = new Set(prev);
                             next.add(alarmForMarker.id);
                             return next;
                           });
                         }
                       }}
                     >
                       <div className="relative flex flex-col items-center">
                          {/* Camera Label (Visible on hover or if alarming) */}
                          <div className={cn(
                            "bg-white border border-black/10 rounded px-2 py-0.5 mb-3 whitespace-nowrap shadow-xl z-30 transition-opacity pointer-events-none text-[9px] font-bold text-black uppercase",
                            alarmForMarker ? "opacity-100" : "opacity-0 group-hover/marker:opacity-100"
                          )}>
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
                              "w-10 h-10 rounded-xl border-2 flex items-center justify-center bg-[#1a1f2e] text-white shadow-2xl transition-all group-hover/marker:scale-110",
                              alarmForMarker ? alarmStyles[alarmForMarker.pri] : "border-psim-accent/50"
                            )}>
                              <Cctv size={22} className="-rotate-90" />
                            </div>
                          </div>
                       </div>
                     </div>
                   );
                 })}
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
                    <input 
                      className="w-full bg-black/40 border border-white/5 rounded-xl h-9 pl-10 text-[11px] text-white outline-none focus:border-psim-orange/30 transition-all select-text" 
                      placeholder="Tìm kiếm vị trí..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
                    {isLoadingTree ? (
                      <div className="py-10 flex flex-col items-center gap-2 opacity-40">
                        <RefreshCcw size={20} className="animate-spin text-psim-orange" />
                        <span className="text-[10px] font-bold uppercase">Syncing...</span>
                      </div>
                    ) : filteredMapTree.length === 0 ? (
                      <div className="py-10 text-center text-[10px] text-t3 font-bold uppercase tracking-widest opacity-50">
                        Không tìm thấy kết quả
                      </div>
                    ) : (
                      filteredMapTree.map((node: MapTreeNode) => (
                        <TreeItem 
                          key={node.Id} 
                          node={node} 
                          level={0} 
                          selectedId={selectedMapId} 
                          onSelect={(n) => {
                            setSelectedMapId(n.Id);
                            setSelectedMapName(n.Name);
                            setActiveMapMapUrl(n.MapImagePath);
                            localStorage.setItem('lastSelectedMapId', n.Id);
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
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-psim-accent/10 text-psim-accent rounded border border-psim-accent/20">{dailyAlarmCount} ALERTS</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
            {latestAlarms.map((alarm) => (
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
                <div className="text-[12px] font-bold leading-tight group-hover:text-psim-accent transition-colors text-t1">
                  {alarm.title}
                </div>
              </div>
            ))}
            {latestAlarms.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-20 gap-3">
                <Activity size={32} />
                <span className="text-[10px] font-bold uppercase tracking-widest">No active events</span>
              </div>
            )}
          </div>
          <button 
            onClick={handleOpenModal}
            className="m-4 h-11 text-[10px] font-black border border-white/10 hover:border-psim-orange/50 hover:bg-psim-orange/5 rounded-xl transition-all text-t2 flex items-center justify-center gap-2 uppercase tracking-widest group"
          >
            Xem thêm <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 3. PAGE WRAPPER (This is the component to be exported and used in routes) ---

export function MapView() {
  return <MapViewInternal />;
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
