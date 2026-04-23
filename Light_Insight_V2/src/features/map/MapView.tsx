import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Map as MapIcon,
  Search,
  Activity,
  Cctv,
  RefreshCcw,
  X
} from 'lucide-react';
import { mapApi } from '@/lib/map-api';
import type { MapTreeNode as APIMapTreeNode, Alarm } from '@/types';
import { useAlarmStream } from '@/features/alarms/AlarmStreamProvider';

import { normalizeApiAlarm } from '@/features/alarms/alarm-mapper';
import { useCameraStatus } from './useCameraStatus';

import { ImageMapCanvas } from './components/ImageMapCanvas';
import { GeoMapCanvas } from './components/GeoMapCanvas';
import { buildMapTree, type MapTreeNode, toPositionRequest } from './utils';

// --- HELPER FUNCTIONS ---

function findFirstMap(nodes: MapTreeNode[]): APIMapTreeNode | null {
  for (const node of nodes) {
    if (node.map.mapImagePath || node.map.type === 'Geo') {
      return node.map;
    }
    if (node.children && node.children.length > 0) {
      const foundInChild = findFirstMap(node.children);
      if (foundInChild) return foundInChild;
    }
  }
  return null;
}

function findMapById(nodes: MapTreeNode[], id: string): APIMapTreeNode | null {
  for (const node of nodes) {
    if (node.map.Id === id) return node.map;
    if (node.children && node.children.length > 0) {
      const found = findMapById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function filterMapTree(nodes: MapTreeNode[], query: string): MapTreeNode[] {
  if (!query) return nodes;
  const lowerQuery = query.toLowerCase();

  return nodes.map(node => {
    const isMatch = node.map.Name.toLowerCase().includes(lowerQuery);
    if (node.children && node.children.length > 0) {
      const filteredChildren = filterMapTree(node.children, query);
      if (isMatch || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
    } else if (isMatch) {
      return node;
    }
    return null;
  }).filter(Boolean) as MapTreeNode[];
}

function MapViewInternal() {
  const { alarms: allAlarms } = useAlarmStream();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [activeMap, setActiveMap] = useState<APIMapTreeNode | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { summary: cameraSummary, statusMap: cameraStatusMap } = useCameraStatus(selectedMapId);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAlarms, setModalAlarms] = useState<Alarm[]>([]);
  const [modalPage, setModalPage] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Tree Fetching
  const { data: mapTreeResponse, isLoading: isLoadingTree } = useQuery({
    queryKey: ['map-tree-view'],
    queryFn: mapApi.getAllTree
  });
  const rawMaps = mapTreeResponse?.Data || [];
  const mapTree = useMemo(() => buildMapTree(rawMaps), [rawMaps]);

  // Options & Detail Fetching
  const { data: mapOptions } = useQuery({ queryKey: ['map-options'], queryFn: mapApi.getOptions });
  const { data: mapDetailResponse } = useQuery({
    queryKey: ['map-detail-view', selectedMapId],
    queryFn: () => mapApi.getById(selectedMapId!),
    enabled: !!selectedMapId
  });
  const mapDetail = mapDetailResponse?.Data;

  const markers = useMemo(() => {
    if (!mapDetail?.cameras || !Array.isArray(mapDetail.cameras)) return [];
    return mapDetail.cameras
      .filter(c => c != null)
      .map(c => toPositionRequest(c));
  }, [mapDetail]);

  const { data: historicalAlarmsResponse } = useQuery({
    queryKey: ['map-historical-alarms', selectedMapId],
    queryFn: () => mapApi.getMilestoneAlarms(selectedMapId!, 0, 20),
    enabled: !!selectedMapId,
    select: (res) => (res.Data || []).map((p: any) => normalizeApiAlarm(p))
  });
  const historicalAlarms = historicalAlarmsResponse || [];

  const fetchModalAlarms = useCallback(async (page: number, append = false) => {
    if (!selectedMapId) return;
    setIsFetchingMore(true);
    try {
      const res = await mapApi.getMilestoneAlarms(selectedMapId, page, 20);
      const newAlarms = (res.Data || []).map((p: any) => normalizeApiAlarm(p));
      setHasMore(newAlarms.length === 20);
      setModalAlarms(prev => append ? [...prev, ...newAlarms] : newAlarms);
      setModalPage(page);
    } catch (error) { console.error(error); } finally { setIsFetchingMore(false); }
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
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) void fetchModalAlarms(modalPage + 1, true);
  };

  useEffect(() => {
    if (!selectedMapId && !isLoadingTree && mapTree.length > 0) {
      const savedMapId = localStorage.getItem('lastSelectedMapId');
      let targetMap = savedMapId ? findMapById(mapTree, savedMapId) : null;
      if (!targetMap) targetMap = findFirstMap(mapTree);
      if (targetMap) {
        setSelectedMapId(targetMap.Id);
        setActiveMap(targetMap);
        if (!savedMapId) localStorage.setItem('lastSelectedMapId', targetMap.Id);
      }
    }
  }, [mapTree, isLoadingTree, selectedMapId]);

  const cameraNamesOnActiveMap = useMemo(() => new Set(markers.map(m => m.CameraName)), [markers]);
  const mapAlarms = useMemo(() => {
    const realtimeMapAlarms = allAlarms.filter(a => a.src && cameraNamesOnActiveMap.has(a.src));
    const combined = [...realtimeMapAlarms, ...historicalAlarms];
    const uniqueMap = new Map<string, Alarm>();
    combined.forEach(a => { if (!uniqueMap.has(a.id)) uniqueMap.set(a.id, a); });
    return Array.from(uniqueMap.values());
  }, [allAlarms, historicalAlarms, cameraNamesOnActiveMap]);

  const latestAlarms = useMemo(() => mapAlarms.slice(0, 6), [mapAlarms]);
  const [dailyAlarmCount, setDailyAlarmCount] = useState(0);
  const [dailyCriticalCount, setDailyCriticalCount] = useState(0);
  const processedAlarmsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedMapId) return;
    const today = new Date().toLocaleDateString('en-CA');
    const storageKey = `map_alarms_daily_${selectedMapId}`;
    if (localStorage.getItem(`map_alarms_date_${selectedMapId}`) !== today) {
      localStorage.setItem(`map_alarms_date_${selectedMapId}`, today);
      localStorage.setItem(storageKey + '_total', '0');
      localStorage.setItem(storageKey + '_critical', '0');
      setDailyAlarmCount(0); setDailyCriticalCount(0); processedAlarmsRef.current.clear();
    } else {
      setDailyAlarmCount(parseInt(localStorage.getItem(storageKey + '_total') || '0', 10));
      setDailyCriticalCount(parseInt(localStorage.getItem(storageKey + '_critical') || '0', 10));
    }
    let newTotal = parseInt(localStorage.getItem(storageKey + '_total') || '0', 10);
    let newCritical = parseInt(localStorage.getItem(storageKey + '_critical') || '0', 10);
    let updated = false;
    allAlarms.forEach(alarm => {
      if (alarm.isNew && alarm.src && cameraNamesOnActiveMap.has(alarm.src) && !processedAlarmsRef.current.has(alarm.id)) {
        processedAlarmsRef.current.add(alarm.id); newTotal += 1; if (alarm.pri === 'critical') newCritical += 1; updated = true;
      }
    });
    if (updated) {
      localStorage.setItem(storageKey + '_total', newTotal.toString());
      localStorage.setItem(storageKey + '_critical', newCritical.toString());
      setDailyAlarmCount(newTotal); setDailyCriticalCount(newCritical);
    }
  }, [allAlarms, selectedMapId, cameraNamesOnActiveMap]);

  const stats = [
    { label: 'ACTIVE ALARMS', val: dailyAlarmCount.toString(), sub: `${dailyCriticalCount} critical`, color: 'text-psim-red' },
    { label: 'CAMERA ACTIVE', val: cameraSummary ? cameraSummary.GlobalOnline.toString() : '-', sub: `/ ${cameraSummary ? cameraSummary.GlobalTotal : '-'} total`, color: cameraSummary && cameraSummary.GlobalOnline < cameraSummary.GlobalTotal ? 'text-psim-orange' : 'text-psim-green' },
    { label: 'GUARDS ON DUTY', val: '0', sub: 'Night Shift', color: 'text-psim-orange' },
    { label: 'ACCESS EVENTS/H', val: '0', sub: '↑ normal', color: 'text-psim-accent' },
    { label: 'LPR SCAN/H', val: '0', sub: '2 mismatch', color: 'text-teal' },
  ];

  const [isExpanded, setIsExpanded] = useState(true);
  const [toolbarPos, setToolbarPos] = useState({ x: 20, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: toolbarPos.x, startY: toolbarPos.y });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [dismissedAlarmIds, setDismissedAlarmIds] = useState<Set<string>>(new Set());
  const scheduledAlarmsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mapAlarms.forEach(alarm => {
      if (!scheduledAlarmsRef.current.has(alarm.id)) {
        scheduledAlarmsRef.current.add(alarm.id);
        setTimeout(() => setDismissedAlarmIds(prev => new Set(prev).add(alarm.id)), 15000);
      }
    });
  }, [mapAlarms]);

  const alarmsBySource = useMemo(() => {
    const priorityOrder: { [key: string]: number } = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };
    const map = new Map<string, Alarm>();
    [...mapAlarms].filter(a => !dismissedAlarmIds.has(a.id)).sort((a, b) => (priorityOrder[a.pri] || 5) - (priorityOrder[b.pri] || 5)).forEach(a => { if (a.src && !map.has(a.src)) map.set(a.src, a); });
    return map;
  }, [mapAlarms, dismissedAlarmIds]);

  const handleDragStart = (e: React.MouseEvent) => { e.preventDefault(); setIsDragging(true); dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, startX: toolbarPos.x, startY: toolbarPos.y }; };
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isDragging && toolbarRef.current) {
        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current.mouseY;

        const parent = toolbarRef.current.parentElement;
        if (!parent) return;
        const parentRect = parent.getBoundingClientRect();
        const toolbarRect = toolbarRef.current.getBoundingClientRect();

        // Calculate next position
        let nextX = dragStartRef.current.startX - dx;
        let nextY = dragStartRef.current.startY + dy;

        // Constrain to parent bounds with 8px padding
        const maxX = parentRect.width - toolbarRect.width - 8;
        const maxY = parentRect.height - toolbarRect.height - 8;

        nextX = Math.max(8, Math.min(maxX, nextX));
        nextY = Math.max(8, Math.min(maxY, nextY));

        setToolbarPos({ x: nextX, y: nextY });
      }
    };
    const handleUp = () => setIsDragging(false);
    if (isDragging) { window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleUp); }
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isDragging]);

  const filteredMapTree = useMemo(() => filterMapTree(mapTree, searchQuery), [mapTree, searchQuery]);

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans select-none">
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-[1200px] h-[80vh] bg-[#0a0f1d] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-psim-orange/10 flex items-center justify-center text-psim-orange shadow-inner"><Activity size={24} /></div><div><h2 className="text-xl font-heading font-bold uppercase tracking-widest text-white leading-none mb-1">Nhật ký sự kiện</h2><p className="text-[11px] font-bold text-psim-orange uppercase tracking-tighter opacity-70">Bản đồ: {activeMap?.Name}</p></div></div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-psim-red hover:text-white flex items-center justify-center transition-all group"><X size={20} className="group-hover:rotate-90 transition-transform duration-300 text-t3 group-hover:text-white" /></button>
            </div>
            <div ref={modalScrollRef} onScroll={handleModalScroll} className="flex-1 overflow-y-auto custom-scrollbar bg-[#05070a]/50">
              <div className="sticky top-0 z-20 grid grid-cols-[120px_120px_1fr_200px_150px_150px] gap-6 px-8 py-4 bg-[#161b2e] border-b border-white/10 text-[10px] font-heading font-bold uppercase tracking-widest text-t3"><div>Thời gian</div><div>Mức độ</div><div>Nội dung sự kiện</div><div>Nguồn</div><div>Hệ thống</div><div>Địa chỉ IP</div></div>
              <div className="flex flex-col min-h-full">
                {modalAlarms.map((alarm, idx) => (
                  <div key={alarm.id + idx} className="grid grid-cols-[120px_120px_1fr_200px_150px_150px] gap-6 px-8 py-4 border-b border-white/[0.03] hover:bg-white/[0.03] transition-all items-center group/row">
                    <div className="text-[12px] font-mono text-t2 font-semibold group-hover/row:text-white transition-colors">{alarm.time}</div>
                    <div><span className={cn("text-[10px] font-heading font-bold px-3 py-1 rounded-lg uppercase tracking-wider border inline-block text-center min-w-[80px]", alarm.pri === 'critical' ? "border-psim-red/40 bg-psim-red/10 text-psim-red" : alarm.pri === 'high' ? "border-psim-orange/40 bg-psim-orange/10 text-psim-orange" : alarm.pri === 'medium' ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-500" : "border-psim-green/40 bg-psim-green/10 text-psim-green")}>{alarm.pri}</span></div>
                    <div className="text-[14px] font-medium text-white/90 group-hover/row:text-psim-accent transition-colors truncate" title={alarm.title}>{alarm.title}</div>
                    <div className="text-[13px] font-medium text-t2 group-hover/row:text-white transition-colors truncate flex items-center gap-2" title={alarm.src}><Cctv size={14} className="opacity-50" /><span className="truncate">{alarm.src || '---'}</span></div>
                    <div className="text-[13px] font-medium text-t2 group-hover/row:text-white transition-colors truncate" title={alarm.connectorName}>{alarm.connectorName || '---'}</div>
                    <div className="text-[12px] font-mono text-t3 group-hover/row:text-white transition-colors truncate" title={alarm.ipadress}>{alarm.ipadress || '---'}</div>
                  </div>
                ))}
                {isFetchingMore && <div className="p-10 flex flex-col items-center justify-center gap-3 text-psim-orange"><RefreshCcw size={24} className="animate-spin" /><span className="text-[11px] font-heading font-bold uppercase tracking-[0.2em]">Đang đồng bộ dữ liệu...</span></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-3 py-3 border-b border-border-dim bg-bg0/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-[16px] font-semibold uppercase tracking-tight text-white">Situational Map</h1>
            {activeMap?.Name && <div className="flex items-center h-6 px-3 bg-psim-orange/10 border border-psim-orange/20 rounded text-psim-orange text-[10px] font-bold uppercase tracking-widest animate-in fade-in zoom-in-95 duration-300">{activeMap.Name}</div>}
          </div>
          <div className="text-[10px] text-t2 font-mono flex gap-4">
            <span><span className="text-psim-red">●</span> {dailyAlarmCount} alarms active</span>
            <span>{cameraSummary ? `${cameraSummary.GlobalOnline}/${cameraSummary.GlobalTotal}` : '--/--'} cameras online</span>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-px bg-border-dim border border-border-dim rounded overflow-hidden">
          {stats.map((s, i) => (
            <div key={i} className="bg-bg0/40 p-3 flex flex-col gap-1 hover:bg-bg1/60 transition-colors cursor-default">
              <div className="text-[9px] font-mono text-t2 tracking-widest">{s.label}</div>
              <div className="flex items-baseline gap-2"><span className={cn("text-2xl font-heading font-bold leading-none", s.color)}>{s.val}</span><span className="text-[10px] text-t2 font-mono">{s.sub}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-14 border-r border-white/5 flex flex-col items-center py-6 gap-4 bg-[#0a0f1d]/40">
          <button onClick={() => setShowLegend(!showLegend)} className={cn("w-9 h-9 flex items-center justify-center rounded-xl border transition-all", showLegend ? "bg-psim-orange border-psim-orange text-white shadow-[0_0_15px_rgba(255,107,0,0.3)]" : "border-white/10 bg-white/5 text-t3 hover:text-white")} title="Bật/Tắt chú thích"><Activity size={18} /></button>
        </div>

        <div className="relative flex-1 flex overflow-hidden">
          {!activeMap ? (
            <div className="w-full h-full bg-[#05070a] flex items-center justify-center opacity-20 grayscale pointer-events-none">
              <div className="flex items-center justify-center flex-col gap-4"><MapIcon size={64} className="text-white" /><span className="text-[12px] font-black uppercase tracking-[0.3em] text-white">Vui lòng chọn bản đồ hệ thống</span></div>
            </div>
          ) : activeMap.type === 'Geo' ? (
            <GeoMapCanvas
              key={activeMap.Id}
              activeMap={activeMap}
              geoStyleUrl={mapOptions?.Data?.geoStyleUrl}
              markers={markers}
              alarmsBySource={alarmsBySource}
              cameraStatusMap={cameraStatusMap}
              onMarkerClick={(a) => setDismissedAlarmIds(prev => new Set(prev).add(a.id))}
              showLegend={showLegend}
            />
          ) : (
            <ImageMapCanvas
              key={activeMap.Id}
              activeMapUrl={activeMap.mapImagePath || ''}
              activeMapName={activeMap.Name}
              markers={markers}
              alarmsBySource={alarmsBySource}
              cameraStatusMap={cameraStatusMap}
              onMarkerClick={(a) => setDismissedAlarmIds(prev => new Set(prev).add(a.id))}
              showLegend={showLegend}
            />
          )}

          <div ref={toolbarRef} style={{ right: `${toolbarPos.x}px`, top: `${toolbarPos.y}px` }} className={cn("absolute z-50 flex flex-col bg-[#0a0f1d]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden", isExpanded ? "rounded-2xl min-w-[280px]" : "rounded-xl w-12")}>
            <div className={cn("flex items-center border-white/5 bg-white/[0.03]", isExpanded ? "justify-between px-4 py-3 border-b" : "flex-col py-4 gap-4")}>
              <div onMouseDown={handleDragStart} className="flex items-center justify-center cursor-move min-w-[24px] min-h-[24px]">
                {isExpanded ? (
                  <span className="text-[14px] font-semibold text-white/90 tracking-tight">Hệ thống bản đồ</span>
                ) : (
                  <MapIcon size={20} className="text-white opacity-80" />
                )}
              </div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-psim-orange hover:scale-110 transition-transform"
                title={isExpanded ? "Thu gọn" : "Mở rộng"}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            {isExpanded && (
              <div className="p-2 flex flex-col gap-2 max-h-[500px]">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={12} />
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl h-9 pl-9.5 text-[12px] text-white/90 placeholder:text-[12px] placeholder:text-white/30 outline-none focus:border-psim-orange/30 transition-all font-normal"
                    placeholder="Tìm kiếm vị trí..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                  {isLoadingTree ? <RefreshCcw className="animate-spin mx-auto opacity-40" /> : filteredMapTree.map(node => (<TreeItem key={node.map.Id} node={node} level={0} selectedId={selectedMapId} onSelect={(n) => { setSelectedMapId(n.Id); setActiveMap(n); localStorage.setItem('lastSelectedMapId', n.Id); }} />))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-[320px] border-l border-white/5 bg-[#0a0f1d]/60 flex flex-col overflow-hidden backdrop-blur-lg">
          <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-psim-accent animate-pulse" /><span className="text-[11px] font-black uppercase text-white">Live Event</span></div></div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
            {latestAlarms.map((alarm) => (
              <div key={alarm.id} className="p-2.5 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer relative overflow-hidden flex flex-col gap-1.5">
                <div className={cn("absolute left-0 top-0 bottom-0 w-1", alarm.pri === 'critical' ? "bg-psim-red" : alarm.pri === 'high' ? "bg-psim-orange" : alarm.pri === 'medium' ? "bg-psim-yellow" : "bg-psim-green")} />
                <div className="flex items-start justify-between gap-2 pl-1"><div className="text-[11px] font-bold text-white uppercase truncate">{alarm.title}</div><span className={cn("text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase", alarm.pri === 'critical' ? "bg-psim-red text-white" : alarm.pri === 'high' ? "bg-psim-orange text-white" : alarm.pri === 'medium' ? "bg-psim-yellow text-black" : "bg-psim-green text-white")}>{alarm.pri}</span></div>
                <div className="flex items-center justify-between gap-2 border-t border-white/[0.03] pt-1.5 pl-1"><div className="flex items-center gap-1 text-[9px] text-t3 truncate"><Cctv size={10} /><span className="truncate">{alarm.src || 'Unknown'}</span></div><div className="text-[8px] font-mono text-t3">{alarm.time}</div></div>
              </div>
            ))}
          </div>
          <button onClick={handleOpenModal} className="m-4 h-11 text-[10px] font-black border border-white/10 hover:border-psim-orange/50 rounded-xl transition-all text-t2 uppercase">Xem thêm</button>
        </div>
      </div>
    </div>
  );
}

export function MapView() { return <MapViewInternal />; }

function TreeItem({ node, level, selectedId, onSelect }: { node: MapTreeNode, level: number, selectedId: string | null, onSelect: (n: APIMapTreeNode) => void }) {
  const [isOpen, setIsExpanded] = useState(true);
  const isSelected = selectedId === node.map.Id;
  return (
    <div className="flex flex-col">
      <div onClick={() => onSelect(node.map)} style={{ paddingLeft: `${level * 16 + 8}px` }} className={cn("flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer transition-all", isSelected ? "bg-psim-orange/10 text-psim-orange" : "hover:bg-white/[0.04] text-t2 hover:text-white")}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          {node.children.length > 0 ? (<button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isOpen); }} className="w-4 h-4 flex items-center justify-center">{isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</button>) : (<div className="w-4" />)}
          <span className="text-[12px] font-medium truncate">{node.map.Name}</span>
        </div>
        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-psim-orange shadow-[0_0_8px_rgba(255,107,0,0.8)]" />}
      </div>
      {node.children.length > 0 && isOpen && (<div className="flex flex-col">{node.children.map(child => (<TreeItem key={child.map.Id} node={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} />))}</div>)}
    </div>
  );
}
