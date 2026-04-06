import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  RefreshCcw, 
  Map as MapIcon, 
  Edit2, 
  Trash2, 
  Upload, 
  X, 
  Cctv,
  CheckCircle2
} from 'lucide-react';
import { mapApi } from '@/lib/map-api';
import type { MapTreeNode } from '@/types';

interface MapManagementSectionProps {
  actualConnectors: any[];
}

export function MapManagementSection({ actualConnectors }: MapManagementSectionProps) {
  const queryClient = useQueryClient();
  
  // --- STATES ---
  const [isCreateMapModalOpen, setIsCreateMapModalOpen] = useState(false);
  const [newMapData, setNewMapData] = useState<{ Name: string; Code: string; ParentId: string | null }>({
    Name: '',
    Code: '',
    ParentId: null
  });
  const [editingMapData, setEditingMapData] = useState<{ Id: string; Name: string; Code: string; ParentId: string | null } | null>(null);
  const [mapToDelete, setMapToDelete] = useState<{ id: string; name: string } | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedVmsId, setSelectedVmsId] = useState<number | null>(null);
  const [placedDevices, setPlacedDevices] = useState<{ 
    id: string; 
    name: string; 
    x: number; 
    y: number; 
    mapId: string; 
    rotation: number;
    vmsId: number;
  }[]>([]);
  const [draggingDevice, setDraggingDevice] = useState<{ id: string; name: string; vmsId: number } | null>(null);
  const [movingDeviceId, setMovingDeviceId] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [rotatingDeviceId, setRotatingDeviceId] = useState<string | null>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [responseModal, setResponseModal] = useState<{ isOpen: boolean; status: number; message: string }>({
    isOpen: false,
    status: 0,
    message: ''
  });

  // --- API DATA FETCHING ---
  const { data: mapTreeResponse, isLoading: isLoadingMapTree } = useQuery({
    queryKey: ['map-tree'],
    queryFn: mapApi.getAllTree
  });
  const mapTree = mapTreeResponse?.Data || [];

  const { data: camerasResponse, isLoading: isLoadingCameras } = useQuery({
    queryKey: ['cameras', selectedVmsId],
    queryFn: () => mapApi.getCameras(selectedVmsId!),
    enabled: !!selectedVmsId
  });
  const cameras = camerasResponse?.Data || [];

  const { data: markersResponse } = useQuery({
    queryKey: ['map-markers', selectedMapId],
    queryFn: () => mapApi.getMarkers(selectedMapId!),
    enabled: !!selectedMapId
  });

  useEffect(() => {
    if (markersResponse?.Data) {
      const markers = markersResponse.Data.map((m: any) => ({
        id: m.CameraId,
        name: m.CameraName,
        x: m.PosX,
        y: m.PosY,
        mapId: m.MapId,
        rotation: m.Rotation || 0,
        vmsId: m.VmsId || 0
      }));
      setPlacedDevices(prev => {
        const otherMapsMarkers = prev.filter(d => d.mapId !== selectedMapId);
        return [...otherMapsMarkers, ...markers];
      });
    }
  }, [markersResponse, selectedMapId]);

  // --- MUTATIONS ---
  const createMapMutation = useMutation({
    mutationFn: mapApi.createMap,
    onSuccess: (res) => {
      setResponseModal({ isOpen: true, status: res.Status, message: res.Message || 'Tạo thành công' });
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['map-tree'] });
        setIsCreateMapModalOpen(false);
        setNewMapData({ Name: '', Code: '', ParentId: null });
      }
    }
  });

  const saveMarkersMutation = useMutation({
    mutationFn: mapApi.saveMarkers,
    onSuccess: (res) => {
      setResponseModal({ isOpen: true, status: res.Status, message: res.Message || 'Lưu thành công' });
    }
  });

  // --- HELPER FUNCTIONS ---
  const flattenMapTree = (nodes: MapTreeNode[], depth = 0): { id: string; name: string; depth: number }[] => {
    let result: { id: string; name: string; depth: number }[] = [];
    nodes.forEach(node => {
      result.push({ id: node.Id, name: node.Name, depth });
      if (node.Children && node.Children.length > 0) {
        result = [...result, ...flattenMapTree(node.Children, depth + 1)];
      }
    });
    return result;
  };
  const flatMaps = flattenMapTree(mapTree);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMapImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (e: React.DragEvent, device: { Id: string; Name: string; vmsId: number }) => {
    setDraggingDevice(device);
    e.dataTransfer.setData('deviceId', device.Id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left - mapOffset.x) / (rect.width * zoomScale)) * 100;
    const y = ((e.clientY - rect.top - mapOffset.y) / (rect.height * zoomScale)) * 100;

    if (draggingDevice && selectedMapId) {
      if (placedDevices.some(d => d.id === draggingDevice.Id && d.mapId === selectedMapId)) return;
      setPlacedDevices(prev => [...prev, {
        id: draggingDevice.Id, name: draggingDevice.Name, x, y, mapId: selectedMapId, rotation: 0, vmsId: draggingDevice.vmsId
      }]);
      setDraggingDevice(null);
    } else if (movingDeviceId) {
      setPlacedDevices(prev => prev.map(d => (d.id === movingDeviceId && d.mapId === selectedMapId) ? { ...d, x, y } : d));
      setMovingDeviceId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!selectedMapId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (isPanning) {
      setMapOffset(prev => ({ x: prev.x + (e.clientX - lastMousePos.x), y: prev.y + (e.clientY - lastMousePos.y) }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }
    if (movingDeviceId) {
      const x = ((e.clientX - rect.left - mapOffset.x) / (rect.width * zoomScale)) * 100;
      const y = ((e.clientY - rect.top - mapOffset.y) / (rect.height * zoomScale)) * 100;
      setPlacedDevices(prev => prev.map(d => (d.id === movingDeviceId && d.mapId === selectedMapId) ? { ...d, x, y } : d));
    } else if (rotatingDeviceId) {
      const device = placedDevices.find(d => d.id === rotatingDeviceId && d.mapId === selectedMapId);
      if (device) {
        const deviceScreenX = rect.left + mapOffset.x + (device.x / 100) * rect.width * zoomScale;
        const deviceScreenY = rect.top + mapOffset.y + (device.y / 100) * rect.height * zoomScale;
        const angle = Math.atan2(e.clientY - deviceScreenY, e.clientX - deviceScreenX) * (180 / Math.PI);
        setPlacedDevices(prev => prev.map(d => (d.id === rotatingDeviceId && d.mapId === selectedMapId) ? { ...d, rotation: angle + 90 } : d));
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!mapImage) return;
    const zoomSpeed = 0.1;
    const delta = e.deltaY < 0 ? 1 : -1;
    const oldScale = zoomScale;
    const newScale = Math.min(10, Math.max(0.1, oldScale + delta * zoomSpeed * oldScale));
    if (newScale !== oldScale) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setZoomScale(newScale);
      setMapOffset({ 
        x: mouseX - (mouseX - mapOffset.x) * (newScale / oldScale),
        y: mouseY - (mouseY - mapOffset.y) * (newScale / oldScale)
      });
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h2 className="text-[18px] font-heading font-bold text-t0 uppercase tracking-tight">Bố cục bản đồ</h2>
          <p className="text-[11px] text-t-2">Tạo bản đồ và đặt camera để theo dõi.</p>
        </div>
        <button 
          onClick={() => setIsCreateMapModalOpen(true)}
          className="bg-psim-orange text-white font-bold text-[11px] uppercase tracking-wider gap-2 h-9 px-5 rounded-md flex items-center shadow-lg shadow-psim-orange/20 hover:scale-[1.02] transition-all"
        >
          <Plus size={16} /> Tạo bản đồ
        </button>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 flex flex-col gap-4 shrink-0 overflow-hidden h-full">
          <div className="bg-bg1 border border-border-dim rounded-xl p-4 flex flex-col gap-3 flex-1 overflow-hidden min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">Bản đồ</h3>
              <button onClick={() => queryClient.invalidateQueries({ queryKey: ['map-tree'] })} className="p-1 hover:bg-white/5 rounded text-t-2">
                <RefreshCcw size={12} className={isLoadingMapTree ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-t-2" size={13} />
              <input 
                className="w-full bg-black/20 border border-white/10 rounded-lg h-9 pl-9 pr-4 text-[11px] text-white outline-none focus:border-psim-orange/50 transition-all"
                placeholder="Tìm theo tên bản đồ"
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin pr-1 flex-1">
              {flatMaps.filter(m => m.name.toLowerCase().includes(mapSearch.toLowerCase())).map((map) => (
                <div 
                  key={map.id} 
                  onClick={() => {
                    setSelectedMapId(map.id);
                    const findNode = (nodes: MapTreeNode[], id: string): MapTreeNode | null => {
                      for (const node of nodes) {
                        if (node.Id === id) return node;
                        if (node.Children) {
                          const found = findNode(node.Children, id);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    const node = findNode(mapTree, map.id);
                    setMapImage(node?.MapImagePath || null);
                  }}
                  className={cn(
                    "p-3 bg-white/5 border rounded-lg transition-all group cursor-pointer shrink-0",
                    selectedMapId === map.id ? "border-psim-orange shadow-lg shadow-psim-orange/10 bg-psim-orange/5" : "border-white/5 hover:border-psim-orange/30"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div style={{ paddingLeft: `${map.depth * 12}px` }}>
                      <div className={cn("text-[12px] font-bold transition-colors", selectedMapId === map.id ? "text-psim-orange" : "text-t-1 group-hover:text-white")}>{map.name}</div>
                      <div className="text-[9px] text-t-2 font-mono uppercase">Level {map.depth + 1}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg1 border border-border-dim rounded-xl p-4 flex flex-col gap-3 h-[200px] shrink-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">Thiết bị</h3>
              <select 
                className="bg-black/40 border border-white/10 rounded h-7 px-2 text-[10px] text-white outline-none focus:border-psim-orange/50 min-w-[100px]"
                value={selectedVmsId || ''}
                onChange={(e) => setSelectedVmsId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="" className="bg-[#161b2e]">-- Hệ thống --</option>
                {actualConnectors.map((c: any) => (<option key={c.Id} value={c.VmsID} className="bg-[#161b2e]">{c.VmsName}</option>))}
              </select>
            </div>
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-t-2" size={13} />
              <input className="w-full bg-black/20 border border-white/10 rounded-lg h-9 pl-9 pr-4 text-[11px] text-white outline-none focus:border-psim-orange/50" placeholder="Tìm theo tên thiết bị" value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin pr-1 flex-1">
              {isLoadingCameras ? (
                <div className="py-10 text-center animate-pulse flex flex-col items-center gap-2">
                  <RefreshCcw className="animate-spin text-psim-orange" size={16} /><span className="text-[10px] text-t-2 uppercase font-bold">Đang tải...</span>
                </div>
              ) : (
                cameras.filter(cam => cam.Name?.toLowerCase().includes(deviceSearch.toLowerCase())).map((cam, i) => {
                  const isPlaced = placedDevices.some(d => d.id === cam.Id && d.mapId === selectedMapId);
                  return (
                    <div key={cam.Id || i} draggable={!isPlaced} onDragStart={(e) => handleDragStart(e, { Id: cam.Id, Name: cam.Name, vmsId: selectedVmsId! })} className={cn("p-3 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between", isPlaced ? "opacity-40 grayscale cursor-not-allowed border-dashed" : "hover:border-psim-accent/30 cursor-move")}>
                      <div className="text-[11px] font-bold text-t-1 uppercase truncate">{cam.Name}</div>
                      {isPlaced && <CheckCircle2 size={12} className="text-psim-green" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-bg1 border border-border-dim rounded-xl flex flex-col overflow-hidden relative shadow-inner h-full">
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-white uppercase">{flatMaps.find(m => m.id === selectedMapId)?.name || 'Chưa chọn bản đồ'}</span>
              <span className="bg-psim-orange/20 text-psim-orange text-[9px] font-bold px-1.5 py-0.5 rounded border border-psim-orange/30">ẢNH</span>
            </div>
            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()} className="h-8 px-3 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-t-2 uppercase flex items-center gap-2 hover:bg-white/10 transition-all"><Upload size={12} /> Tải ảnh</button>
              <button 
                disabled={!mapImage || placedDevices.filter(d => d.mapId === selectedMapId).length === 0 || saveMarkersMutation.isPending} 
                onClick={() => {
                  const markers = placedDevices.filter(d => d.mapId === selectedMapId).map(d => ({ CameraId: d.id, CameraName: d.name, PosX: d.x, PosY: d.y, Icon: 'Cctv', VmsId: d.vmsId, Rotation: d.rotation }));
                  saveMarkersMutation.mutate({ MapId: selectedMapId!, Markers: markers });
                }}
                className={cn("h-8 px-3 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-2", (!mapImage || placedDevices.filter(d => d.mapId === selectedMapId).length === 0 || saveMarkersMutation.isPending) ? "bg-white/5 border border-white/5 opacity-30 cursor-not-allowed" : "bg-psim-orange text-white shadow-lg shadow-psim-orange/20 hover:scale-[1.02]")}
              >
                {saveMarkersMutation.isPending && <RefreshCcw size={12} className="animate-spin" />} Lưu vị trí
              </button>
            </div>
          </div>

          <div 
            className={cn("flex-1 bg-black/40 relative overflow-hidden select-none", isPanning ? "cursor-grabbing" : "cursor-grab")}
            onWheel={handleWheel} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onMouseDown={(e) => { if (e.button === 0 && !movingDeviceId && !rotatingDeviceId) { setIsPanning(true); setLastMousePos({ x: e.clientX, y: e.clientY }); } }} onMouseMove={handleCanvasMouseMove} onMouseUp={() => { setMovingDeviceId(null); setRotatingDeviceId(null); setIsPanning(false); }} onMouseLeave={() => setIsPanning(false)}
          >
            {mapImage ? (
              <div className="w-full h-full flex items-center justify-center relative origin-center" style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${zoomScale})` }}>
                <div className="relative max-w-full max-h-full">
                  <img src={mapImage} className="max-w-full max-h-full object-contain" />
                  {placedDevices.filter(d => d.mapId === selectedMapId).map((device) => (
                    <div key={device.id} style={{ left: `${device.x}%`, top: `${device.y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 group/device pointer-events-auto z-10">
                      <div className="relative flex flex-col items-center">
                        <div className="bg-white border border-black/10 rounded px-2 py-0.5 mb-3 whitespace-nowrap shadow-xl z-30 pointer-events-none text-[9px] font-bold text-black uppercase">{device.name}</div>
                        <div className="relative w-10 h-10 flex items-center justify-center" style={{ transform: `rotate(${device.rotation}deg)` }}>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 pointer-events-none">
                            <div className="relative -top-[100px]">
                              <svg width="140" height="100" viewBox="0 0 140 100" className="opacity-60"><path d="M70 100 L0 0 L140 0 Z" fill="rgba(0, 194, 255, 0.2)" stroke="rgba(0, 194, 255, 0.4)" strokeWidth="1" /></svg>
                              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-psim-red rounded-full border-2 border-white cursor-pointer pointer-events-auto hover:scale-125" onMouseDown={(e) => { e.stopPropagation(); setRotatingDeviceId(device.id); }} />
                            </div>
                          </div>
                          <div className={cn("w-10 h-10 bg-[#1a1f2e] text-white rounded-xl flex items-center justify-center border border-white/20 cursor-move", movingDeviceId === device.id && "border-psim-orange")} onMouseDown={(e) => { e.stopPropagation(); setMovingDeviceId(device.id); }}><Cctv size={22} className="-rotate-90" /></div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setPlacedDevices(prev => prev.filter(d => !(d.id === device.id && d.mapId === selectedMapId))); }} className="absolute -top-4 -right-4 w-6 h-6 bg-psim-red text-white rounded-full flex items-center justify-center opacity-0 group-hover/device:opacity-100 transition-opacity"><X size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 opacity-20"><MapIcon size={48} /><p className="text-[11px] uppercase tracking-widest font-medium">Chưa có ảnh bản đồ</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
