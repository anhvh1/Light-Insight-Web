import { useState, useEffect, useRef, useTransition, useCallback } from 'react';
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
  CheckCircle2,
  Layers,
  Video,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { mapApi } from '@/lib/map-api';
import { priorityApi } from '@/lib/priority-api';
import { ImageUploadWizard } from './ImageUploadWizard';
import type { MapTreeNode } from '@/types';

// --- SUB-COMPONENTS ---

interface TabContainerProps {
  activeTab: 'map' | 'device';
  onTabChange: (tab: 'map' | 'device') => void;
  children: React.ReactNode;
}

function TabContainer({ activeTab, onTabChange, children }: TabContainerProps) {
  return (
    <div className="w-72 flex flex-col gap-0 shrink-0 overflow-hidden h-full bg-bg1 border border-border-dim rounded-xl">
      {/* Tab Headers */}
      <div className="flex border-b border-white/5 shrink-0">
        <button
          onClick={() => onTabChange('map')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2",
            activeTab === 'map' 
              ? "text-psim-orange border-psim-orange bg-psim-orange/5" 
              : "text-t-2 border-transparent hover:text-t-1 hover:bg-white/[0.02]"
          )}
        >
          <Layers size={14} />
          Bản đồ
        </button>
        <button
          onClick={() => onTabChange('device')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2",
            activeTab === 'device' 
              ? "text-psim-orange border-psim-orange bg-psim-orange/5" 
              : "text-t-2 border-transparent hover:text-t-1 hover:bg-white/[0.02]"
          )}
        >
          <Video size={14} />
          Thiết bị
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}

interface MapTabProps {
  isLoading: boolean;
  mapSearch: string;
  onMapSearchChange: (val: string) => void;
  flatMaps: any[];
  selectedMapId: string | null;
  onMapSelect: (id: string) => void;
  onRefresh: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

function MapTab({ 
  isLoading, 
  mapSearch, 
  onMapSearchChange, 
  flatMaps, 
  selectedMapId, 
  onMapSelect, 
  onRefresh,
  onEdit,
  onDelete
}: MapTabProps) {
  return (
    <div className="p-4 flex flex-col gap-3 flex-1 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-[10px] font-bold text-t-2 uppercase tracking-widest">Danh sách bản đồ</h3>
        <button onClick={onRefresh} className="p-1 hover:bg-white/5 rounded text-t-2 transition-colors">
          <RefreshCcw size={12} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-t-2" size={13} />
        <input 
          className="w-full bg-black/20 border border-white/10 rounded-lg h-9 pl-9 pr-4 text-[11px] text-white outline-none focus:border-psim-orange/50 transition-all"
          placeholder="Tìm theo tên bản đồ"
          value={mapSearch}
          onChange={(e) => onMapSearchChange(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin pr-1 flex-1">
        {flatMaps.filter(m => m.name.toLowerCase().includes(mapSearch.toLowerCase())).map((map) => (
          <div 
            key={map.id} 
            onClick={() => onMapSelect(map.id)}
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
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(map.id);
                  }}
                  className="p-1 hover:bg-white/10 rounded text-psim-orange"
                >
                  <Edit2 size={12} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(map.id, map.name);
                  }}
                  className="p-1 hover:bg-white/10 rounded text-psim-red"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {flatMaps.length === 0 && !isLoading && (
          <div className="py-10 text-center opacity-20 text-[10px] uppercase font-bold tracking-widest">Chưa có bản đồ</div>
        )}
      </div>
    </div>
  );
}

interface DeviceTabProps {
  isLoading: boolean;
  isLoadingConnectors: boolean;
  selectedSystemKey: string | null;
  onSystemChange: (key: string | null) => void;
  actualConnectors: any[];
  deviceSearch: string;
  onDeviceSearchChange: (val: string) => void;
  cameras: any[];
  placedDevices: any[];
  selectedMapId: string | null;
  onDragStart: (e: React.DragEvent, device: any) => void;
}

function DeviceTab({
  isLoading,
  isLoadingConnectors,
  selectedSystemKey,
  onSystemChange,
  actualConnectors,
  deviceSearch,
  onDeviceSearchChange,
  cameras,
  placedDevices,
  selectedMapId,
  onDragStart
}: DeviceTabProps) {
  return (
    <div className="p-4 flex flex-col gap-3 flex-1 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-[10px] font-bold text-t-2 uppercase tracking-widest">Kho thiết bị</h3>
        <select 
          className="bg-black/40 border border-white/10 rounded h-7 px-2 text-[10px] text-white outline-none focus:border-psim-orange/50 transition-all cursor-pointer min-w-[150px]"
          value={selectedSystemKey || ''}
          onChange={(e) => onSystemChange(e.target.value || null)}
          disabled={isLoadingConnectors}
        >
          <option value="" className="bg-[#161b2e]">{isLoadingConnectors ? 'Đang tải...' : '-- Hệ thống --'}</option>
          {actualConnectors.map((c: any) => (
            <option key={c.Id} value={c.Id} className="bg-[#161b2e]">
              {c.Name}
            </option>
          ))}
        </select>
      </div>
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-t-2" size={13} />
        <input 
          className="w-full bg-black/20 border border-white/10 rounded-lg h-9 pl-9 pr-4 text-[11px] text-white outline-none focus:border-psim-orange/50 transition-all" 
          placeholder="Tìm theo tên thiết bị" 
          value={deviceSearch} 
          onChange={(e) => onDeviceSearchChange(e.target.value)} 
        />
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin pr-1 flex-1">
        {isLoading ? (
          <div className="py-10 text-center animate-pulse flex flex-col items-center gap-2">
            <RefreshCcw className="animate-spin text-psim-orange" size={16} />
            <span className="text-[10px] text-t-2 uppercase font-bold">Đang tải...</span>
          </div>
        ) : (
          cameras.filter(cam => cam.Name?.toLowerCase().includes(deviceSearch.toLowerCase())).map((cam, i) => {
            const isPlaced = placedDevices.some(d => d.id === cam.Id && d.mapId === selectedMapId);
            return (
              <div 
                key={cam.Id || i} 
                draggable={!isPlaced} 
                onDragStart={(e) => onDragStart(e, { 
                  id: String(cam.Id || ''), 
                  name: String(cam.Name || ''), 
                })} 
                className={cn(
                  "p-3 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between transition-all", 
                  isPlaced 
                    ? "opacity-40 grayscale cursor-not-allowed border-dashed" 
                    : "hover:border-psim-accent/30 cursor-move hover:bg-white/[0.08]"
                )}
              >
                <div className="text-[11px] font-bold text-t-1 uppercase truncate pr-2">{cam.Name}</div>
                {isPlaced && <CheckCircle2 size={12} className="text-psim-green shrink-0" />}
              </div>
            );
          })
        )}
        {cameras.length === 0 && !isLoading && (
          <div className="py-10 text-center opacity-20 text-[10px] uppercase font-bold tracking-widest">
            {selectedSystemKey ? "Không tìm thấy thiết bị" : "Vui lòng chọn hệ thống"}
          </div>
        )}
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---

export function MapManagementSection() {
  const queryClient = useQueryClient();
  
  // --- STATES ---
  const [activeSidebarTab, setActiveSidebarTab] = useState<'map' | 'device'>('map');
  const [isCreateMapModalOpen, setIsCreateMapModalOpen] = useState(false);
  const [newMapData, setNewMapData] = useState<{ Name: string; Code: string; ParentId: string | null }>({
    Name: '',
    Code: '',
    ParentId: null
  });
  const [editingMapData, setEditingMapData] = useState<{ Id: string; Name: string; Code: string; ParentId: string | null } | null>(null);
  const [mapToDelete, setMapToDelete] = useState<{ id: string; name: string } | null>(null);
  const [imageToDeleteId, setImageToDeleteId] = useState<string | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedSystemKey, setSelectedSystemKey] = useState<string | null>(null);
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
  const [rotatingDeviceId, setRotatingDeviceId] = useState<string | null>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [isUploadWizardOpen, setIsUploadWizardOpen] = useState(false);
  const [showDownloadManual, setShowDownloadManual] = useState<{ isOpen: boolean; url: string }>({ isOpen: false, url: '' });
  const [responseModal, setResponseModal] = useState<{ isOpen: boolean; status: number; message: string }>({
    isOpen: false,
    status: 0,
    message: ''
  });
  
  // Refs for robust Start-Delta dragging logic
  const panningStartRef = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 });
  const deviceStartRef = useRef({ mouseX: 0, mouseY: 0, deviceX: 0, deviceY: 0 });
  const mapOffsetRef = useRef({ x: 0, y: 0 });
  const zoomScaleRef = useRef(1);

  // Sync mapOffset and zoomScale to refs for use in stable handlers
  // These are calculated frequently in wheel events, so we keep this pattern for performance.
  useEffect(() => { mapOffsetRef.current = mapOffset; }, [mapOffset]);
  useEffect(() => { zoomScaleRef.current = zoomScale; }, [zoomScale]);

  // --- API DATA FETCHING ---
  const { data: connectorsResponse, isLoading: isLoadingConnectors } = useQuery({
    queryKey: ['connectors-list'],
    queryFn: priorityApi.getAllConnectors,
  });
  const actualConnectors = connectorsResponse?.Data || [];

  const { data: mapTreeResponse, isLoading: isLoadingMapTree } = useQuery({
    queryKey: ['map-tree'],
    queryFn: mapApi.getAllTree
  });
  const mapTree = mapTreeResponse?.Data || [];

  const { data: devicesResponse, isLoading: isLoadingDevices } = useQuery({
    queryKey: ['devices', selectedSystemKey],
    queryFn: () => mapApi.getAllDevices(selectedSystemKey!),
    enabled: !!selectedSystemKey
  });
  const cameras = (devicesResponse?.Data || []).filter(d => d.Type === 1);

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

  // Main event handler setup
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 1. Panning Logic
      if (isPanning) {
        const dx = e.clientX - panningStartRef.current.mouseX;
        const dy = e.clientY - panningStartRef.current.mouseY;
        setMapOffset({ 
          x: panningStartRef.current.offsetX + dx, 
          y: panningStartRef.current.offsetY + dy 
        });
        return;
      }

      const canvas = document.getElementById('map-canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      // 2. Device Moving Logic
      if (movingDeviceId && selectedMapId) {
        const dx = e.clientX - deviceStartRef.current.mouseX;
        const dy = e.clientY - deviceStartRef.current.mouseY;
        const dxPercent = (dx / (rect.width * zoomScale)) * 100;
        const dyPercent = (dy / (rect.height * zoomScale)) * 100;
        const newX = deviceStartRef.current.deviceX + dxPercent;
        const newY = deviceStartRef.current.deviceY + dyPercent;
        
        setPlacedDevices(prev => prev.map(d => 
          (d.id === movingDeviceId && d.mapId === selectedMapId) 
          ? { ...d, x: newX, y: newY } 
          : d
        ));
        return;
      }

      // 3. Device Rotating Logic
      if (rotatingDeviceId && selectedMapId) {
        setPlacedDevices(prev => {
          const device = prev.find(d => d.id === rotatingDeviceId && d.mapId === selectedMapId);
          if (!device) return prev;
          
          const deviceScreenX = rect.left + mapOffset.x + (device.x / 100) * rect.width * zoomScale;
          const deviceScreenY = rect.top + mapOffset.y + (device.y / 100) * rect.height * zoomScale;
          const angle = Math.atan2(e.clientY - deviceScreenY, e.clientX - deviceScreenX) * (180 / Math.PI);
          
          return prev.map(d => 
            (d.id === rotatingDeviceId && d.mapId === selectedMapId) 
            ? { ...d, rotation: angle + 90 } 
            : d
          );
        });
      }
    };

    const handleGlobalMouseUp = () => {
      if (isPanning) setIsPanning(false);
      if (movingDeviceId) setMovingDeviceId(null);
      if (rotatingDeviceId) setRotatingDeviceId(null);
    };

    // Add event listeners
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning, movingDeviceId, rotatingDeviceId, selectedMapId, zoomScale, mapOffset]);
  

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

  const handleZoomIn = () => {
    setZoomScale(prev => Math.min(10, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoomScale(prev => Math.max(0.1, prev - 0.2));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setMapOffset({ x: 0, y: 0 });
  };

  const [_isPending, startTransition] = useTransition();

  const handleDownloadSample = () => {
    startTransition(async () => {
      try {
        // Gọi trực tiếp API trả về dữ liệu file (Blob)
        const response = await mapApi.downloadSampleImage();
        
        // Dữ liệu blob nằm trong response.data khi dùng axios với responseType: 'blob'
        const blob = response.data;
        const objectUrl = URL.createObjectURL(blob);

        // Kích hoạt tải xuống ngầm
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = 'light-insight-sample-map.png';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // Dọn dẹp bộ nhớ
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(objectUrl);
        }, 100);

        setResponseModal({ isOpen: true, status: 1, message: 'Đã tải ảnh mẫu thành công.' });

      } catch (error) {
        console.error("Download Image Error:", error);
        setResponseModal({ 
          isOpen: true, 
          status: -1, 
          message: 'Lỗi khi tải file ảnh từ máy chủ.' 
        });
      }
    });
  };

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

  const updateMapMutation = useMutation({
    mutationFn: mapApi.updateMap,
    onSuccess: (res) => {
      setResponseModal({ isOpen: true, status: res.Status, message: res.Message || 'Cập nhật thành công' });
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['map-tree'] });
        setEditingMapData(null);
      }
    }
  });

  const deleteMapMutation = useMutation({
    mutationFn: mapApi.deleteMap,
    onSuccess: (res) => {
      setResponseModal({ isOpen: true, status: res.Status, message: res.Message || 'Xóa thành công' });
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['map-tree'] });
        setMapToDelete(null);
        setSelectedMapId(null);
        setMapImage(null);
      }
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: mapApi.deleteImage,
    onSuccess: (res) => {
      setResponseModal({ isOpen: true, status: res.Status, message: res.Message || 'Xóa ảnh thành công' });
      if (res.Status === 1) {
        setMapImage(null);
        setImageToDeleteId(null);
        queryClient.invalidateQueries({ queryKey: ['map-tree'] });
      }
    }
  });

  const saveMarkersMutation = useMutation({
    mutationFn: mapApi.saveMarkers,
    onSuccess: (res) => {
      setResponseModal({ isOpen: true, status: res.Status, message: res.Message || 'Lưu thành công' });
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: ({ id, file }: { id: string, file: File }) => mapApi.uploadImage(id, file),
    onSuccess: (res) => {
      setResponseModal({ isOpen: true, status: res.Status, message: res.Message || 'Tải ảnh thành công' });
      if (res.Status === 1 && res.Data) {
        setMapImage(res.Data);
        queryClient.invalidateQueries({ queryKey: ['map-tree'] });
      }
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

  const findNodeById = (nodes: MapTreeNode[], id: string): MapTreeNode | null => {
    for (const node of nodes) {
      if (node.Id === id) return node;
      if (node.Children) {
        const found = findNodeById(node.Children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleWizardConfirm = (file: File) => {
    if (selectedMapId) {
      uploadImageMutation.mutate({ id: selectedMapId, file }, {
        onSuccess: (res) => {
          if (res.Status === 1) setIsUploadWizardOpen(false);
        }
      });
      // Update local preview immediately for UX
      const reader = new FileReader();
      reader.onloadend = () => setMapImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (e: React.DragEvent, device: { id: string; name: string }) => {
    const connector = actualConnectors.find(c => c.Id === selectedSystemKey);
    const vmsId = connector?.VmsID || 0;
    setDraggingDevice({ ...device, vmsId });
    e.dataTransfer.setData('deviceId', device.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left - mapOffsetRef.current.x) / (rect.width * zoomScaleRef.current)) * 100;
    const y = ((e.clientY - rect.top - mapOffsetRef.current.y) / (rect.height * zoomScaleRef.current)) * 100;

    if (draggingDevice && selectedMapId) {
      if (placedDevices.some(d => d.id === draggingDevice.id && d.mapId === selectedMapId)) return;
      
      const newDeviceId = String(draggingDevice.id || ''); // Ensure ID is a string, with fallback
      const newDeviceName = String(draggingDevice.name || ''); // Ensure name is a string, with fallback

      // Only proceed if a valid ID is present
      if (!newDeviceId) {
          console.warn("Attempted to drop a device with an invalid or empty ID.");
          return;
      }

      setPlacedDevices(prev => [...prev, {
        id: newDeviceId,
        name: newDeviceName,
        x, 
        y, 
        mapId: selectedMapId, 
        rotation: 0, 
        vmsId: draggingDevice.vmsId 
      }]);
      setDraggingDevice(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-[14px] font-heading font-bold text-t0">Thiết lập map</h2>
          <p className="text-[12px] text-t-2 mt-1">Tạo bản đồ và đặt camera để theo dõi.</p>
        </div>
        <button 
          onClick={() => setIsCreateMapModalOpen(true)}
          className="bg-psim-accent2 text-white font-bold text-[11px] uppercase tracking-wider gap-2 h-8 px-4 rounded flex items-center shadow-lg shadow-psim-accent2/20 hover:scale-[1.02] transition-all"
        >
          <Plus size={16} /> Tạo bản đồ
        </button>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Tabbed Sidebar */}
        <TabContainer activeTab={activeSidebarTab} onTabChange={setActiveSidebarTab}>
          {activeSidebarTab === 'map' ? (
            <MapTab 
              isLoading={isLoadingMapTree}
              mapSearch={mapSearch}
              onMapSearchChange={setMapSearch}
              flatMaps={flatMaps}
              selectedMapId={selectedMapId}
              onMapSelect={(id) => {
                setSelectedMapId(id);
                const node = findNodeById(mapTree, id);
                setMapImage(node?.MapImagePath || null);
              }}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['map-tree'] })}
              onEdit={(id) => {
                const node = findNodeById(mapTree, id);
                if (node) {
                  setEditingMapData({
                    Id: node.Id,
                    Name: node.Name,
                    Code: node.Code,
                    ParentId: node.ParentId
                  });
                }
              }}
              onDelete={(id, name) => setMapToDelete({ id, name })}
            />
          ) : (
            <DeviceTab 
              isLoading={isLoadingDevices}
              isLoadingConnectors={isLoadingConnectors}
              selectedSystemKey={selectedSystemKey}
              onSystemChange={setSelectedSystemKey}
              actualConnectors={actualConnectors}
              deviceSearch={deviceSearch}
              onDeviceSearchChange={setDeviceSearch}
              cameras={cameras}
              placedDevices={placedDevices}
              selectedMapId={selectedMapId}
              onDragStart={handleDragStart}
            />
          )}
        </TabContainer>

        {/* Canvas Area */}
        <div className="flex-1 bg-bg1 border border-border-dim rounded-xl flex flex-col overflow-hidden relative shadow-inner h-full">
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-white uppercase">{flatMaps.find(m => m.id === selectedMapId)?.name || 'Chưa chọn bản đồ'}</span>
              <span className="bg-psim-orange/20 text-psim-orange text-[9px] font-bold px-1.5 py-0.5 rounded border border-psim-orange/30">ẢNH</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleDownloadSample}
                className="h-8 px-3 rounded text-[10px] font-bold text-psim-orange uppercase flex items-center gap-2 bg-psim-orange/10 border border-psim-orange/20 hover:bg-psim-orange/20 transition-all"
              >
                <Download size={12} /> Ảnh mẫu
              </button>
              <button 
                disabled={!selectedMapId || uploadImageMutation.isPending}
                onClick={() => setIsUploadWizardOpen(true)} 
                className={cn(
                  "h-8 px-3 rounded text-[10px] font-bold text-t-2 uppercase flex items-center gap-2 transition-all",
                  (!selectedMapId || uploadImageMutation.isPending) ? "bg-white/5 border border-white/5 opacity-30 cursor-not-allowed" : "bg-white/5 border border-white/10 hover:bg-white/10"
                )}
              >
                {uploadImageMutation.isPending ? <RefreshCcw size={12} className="animate-spin" /> : <Upload size={12} />} Tải ảnh
              </button>
              <button 
                disabled={!selectedMapId || deleteImageMutation.isPending || !mapImage}
                onClick={() => setImageToDeleteId(selectedMapId)}
                className={cn(
                  "h-8 px-3 rounded text-[10px] font-bold text-psim-red uppercase flex items-center gap-2 transition-all bg-psim-red/5 border",
                  (!selectedMapId || deleteImageMutation.isPending || !mapImage) ? "border-transparent opacity-30 cursor-not-allowed" : "border-psim-red/20 hover:bg-psim-red/10"
                )}
              >
                <Trash2 size={12} /> Xóa ảnh
              </button>
              <button 
                disabled={!mapImage || placedDevices.filter(d => d.mapId === selectedMapId).length === 0 || saveMarkersMutation.isPending} 
                onClick={() => {
                  const selectedConnector = actualConnectors.find(c => c.Id === selectedSystemKey);
                  const currentVmsId = selectedConnector?.VmsID || 0;
                  const markers = placedDevices.filter(d => d.mapId === selectedMapId).map(d => ({ 
                    CameraId: d.id, 
                    CameraName: d.name, 
                    PosX: d.x, 
                    PosY: d.y, 
                    Icon: 'Cctv', 
                    VmsId: d.vmsId || currentVmsId, 
                    Rotation: d.rotation 
                  }));
                  saveMarkersMutation.mutate({ MapId: selectedMapId!, Markers: markers });
                }}
                className={cn("h-8 px-3 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-2", (!mapImage || placedDevices.filter(d => d.mapId === selectedMapId).length === 0 || saveMarkersMutation.isPending) ? "bg-white/5 border border-white/5 opacity-30 cursor-not-allowed" : "bg-psim-orange text-white shadow-lg shadow-psim-orange/20 hover:scale-[1.02]")}
              >
                {saveMarkersMutation.isPending && <RefreshCcw size={12} className="animate-spin" />} Lưu vị trí
              </button>
            </div>
          </div>

          <div 
            id="map-canvas"
            className={cn(
              "flex-1 bg-black/40 relative overflow-hidden select-none", 
              isPanning ? "cursor-grabbing" : (mapImage ? "cursor-grab" : "cursor-default")
            )}
            onWheel={handleWheel} 
            onDragOver={(e) => e.preventDefault()} 
            onDrop={handleDrop} 
            onMouseDown={(e) => { 
              if (e.button === 0 && !movingDeviceId && !rotatingDeviceId && mapImage) { 
                e.preventDefault();
                panningStartRef.current = { 
                  mouseX: e.clientX, 
                  mouseY: e.clientY, 
                  offsetX: mapOffset.x, 
                  offsetY: mapOffset.y 
                };
                setIsPanning(true); 
              } 
            }} 
          >
            {/* Zoom Controls Overlay */}
            {mapImage && (
              <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-50">
                <div className="flex flex-col bg-[#161b2e]/90 border border-white/10 rounded-lg overflow-hidden shadow-2xl backdrop-blur-md">
                  <button 
                    onClick={handleZoomIn}
                    className="w-10 h-10 flex items-center justify-center text-t-2 hover:text-white hover:bg-psim-orange transition-all"
                    title="Phóng to"
                  >
                    <ZoomIn size={20} />
                  </button>
                  <div className="h-px bg-white/5 mx-2" />
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
            {mapImage ? (
              <div className="w-full h-full flex items-center justify-center relative origin-center" style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${zoomScale})` }}>
                <div className="relative max-w-full max-h-full">
                  <img 
                    src={mapImage} 
                    className="max-w-full max-h-full object-contain" 
                    draggable="false"
                    onDragStart={(e) => e.preventDefault()}
                  />
                  {placedDevices.filter(d => d.mapId === selectedMapId).map((device) => (
                    <div key={device.id} style={{ left: `${device.x}%`, top: `${device.y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 group/device pointer-events-auto z-10">
                      <div className="relative flex flex-col items-center">
                        <div className="bg-white border border-black/10 rounded px-2 py-0.5 mb-3 whitespace-nowrap shadow-xl z-30 pointer-events-none text-[9px] font-bold text-black uppercase">{device.name}</div>
                        <div className="relative w-10 h-10 flex items-center justify-center" style={{ transform: `rotate(${device.rotation}deg)` }}>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 pointer-events-none">
                            <div className="relative -top-[100px]">
                              <svg width="140" height="100" viewBox="0 0 140 100" className="opacity-60"><path d="M70 100 L0 0 L140 0 Z" fill="rgba(0, 194, 255, 0.2)" stroke="rgba(0, 194, 255, 0.4)" strokeWidth="1" /></svg>
                              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-psim-red rounded-full border-2 border-white cursor-pointer pointer-events-auto hover:scale-125" 
                            onMouseDown={(e) => { 
                              e.stopPropagation();
                              setRotatingDeviceId(device.id);
                            }} 
                          />
                        </div>
                      </div>
                      <div 
                        className={cn("w-10 h-10 bg-[#1a1f2e] text-white rounded-xl flex items-center justify-center border border-white/20 cursor-move", movingDeviceId === device.id && "border-psim-orange")} 
                        onMouseDown={(e) => { 
                          e.stopPropagation(); 
                          deviceStartRef.current = {
                            mouseX: e.clientX,
                            mouseY: e.clientY,
                            deviceX: device.x,
                            deviceY: device.y
                          };
                          setMovingDeviceId(device.id); 
                        }}
                      >
                        <Cctv size={22} className="-rotate-90" />
                      </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setPlacedDevices(prev => prev.filter(d => !(d.id === device.id && d.mapId === selectedMapId))); }} className="absolute -top-4 -right-4 w-6 h-6 bg-psim-red text-white rounded-full flex items-center justify-center opacity-0 group-hover/device:opacity-100 transition-opacity"><X size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-20"><MapIcon size={48} /><p className="text-[11px] uppercase tracking-widest font-medium">Chưa có ảnh bản đồ</p></div>
            )}
          </div>
        </div>
      </div>

      {/* --- CREATE MAP MODAL --- */}
      {isCreateMapModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 animate-in fade-in duration-200" onClick={() => setIsCreateMapModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#161b2e] border border-white/10 rounded-xl shadow-2xl p-8 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-[18px] font-bold text-white uppercase tracking-tight">Tạo bản đồ mới</h3>
                <p className="text-[11px] text-t-2 mt-1">Thêm bản đồ vào hệ thống phân cấp.</p>
              </div>
              <button onClick={() => setIsCreateMapModalOpen(false)} className="text-t-2 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1 text-white">Tên bản đồ</label>
                <input 
                  className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-orange/50 transition-all"
                  placeholder="Ví dụ: Tòa nhà A - Tầng 1"
                  value={newMapData.Name}
                  onChange={(e) => setNewMapData({...newMapData, Name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1 text-white">Mã bản đồ</label>
                <input 
                  className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-orange/50 transition-all font-mono"
                  placeholder="Ví dụ: MAP_001"
                  value={newMapData.Code}
                  onChange={(e) => setNewMapData({...newMapData, Code: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1 text-white">Bản đồ cha</label>
                <select 
                  className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-orange/50 transition-all appearance-none cursor-pointer"
                  value={newMapData.ParentId || ''}
                  onChange={(e) => setNewMapData({...newMapData, ParentId: e.target.value || null})}
                >
                  <option value="" className="bg-[#161b2e]">-- Không có (Bản đồ gốc) --</option>
                  {flatMaps.map((map) => (
                    <option key={map.id} value={map.id} className="bg-[#161b2e]">
                      {'\u00A0'.repeat(map.depth * 4)}{map.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-10 flex gap-3">
              <button 
                onClick={() => setIsCreateMapModalOpen(false)}
                className="flex-1 h-11 rounded-lg text-[11px] font-bold text-t-2 uppercase border border-white/10 hover:bg-white/5 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => createMapMutation.mutate(newMapData)}
                disabled={createMapMutation.isPending || !newMapData.Name || !newMapData.Code}
                className="flex-1 h-11 bg-psim-orange text-white rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-psim-orange/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMapMutation.isPending && <RefreshCcw size={14} className="animate-spin" />}
                Tạo bản đồ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MAP MODAL --- */}
      {editingMapData && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 animate-in fade-in duration-200" onClick={() => setEditingMapData(null)} />
          <div className="relative w-full max-w-md bg-[#161b2e] border border-white/10 rounded-xl shadow-2xl p-8 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-[18px] font-bold text-white uppercase tracking-tight">Chỉnh sửa bản đồ</h3>
                <p className="text-[11px] text-psim-orange mt-1 font-mono uppercase">ID: {editingMapData.Id}</p>
              </div>
              <button onClick={() => setEditingMapData(null)} className="text-t-2 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1 text-white">Tên bản đồ</label>
                <input 
                  className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-orange/50 transition-all"
                  value={editingMapData.Name}
                  onChange={(e) => setEditingMapData({...editingMapData, Name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1 text-white">Mã bản đồ</label>
                <input 
                  className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-orange/50 transition-all font-mono"
                  value={editingMapData.Code}
                  onChange={(e) => setEditingMapData({...editingMapData, Code: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1 text-white">Bản đồ cha</label>
                <select 
                  className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-orange/50 transition-all appearance-none cursor-pointer"
                  value={editingMapData.ParentId || ''}
                  onChange={(e) => setEditingMapData({...editingMapData, ParentId: e.target.value || null})}
                >
                  <option value="" className="bg-[#161b2e]">-- Không có (Bản đồ gốc) --</option>
                  {flatMaps.filter(m => m.id !== editingMapData.Id).map((map) => (
                    <option key={map.id} value={map.id} className="bg-[#161b2e]">
                      {'\u00A0'.repeat(map.depth * 4)}{map.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-10 flex gap-3">
              <button 
                onClick={() => setEditingMapData(null)}
                className="flex-1 h-11 rounded-lg text-[11px] font-bold text-t-2 uppercase border border-white/10 hover:bg-white/5 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => updateMapMutation.mutate(editingMapData)}
                disabled={updateMapMutation.isPending || !editingMapData.Name || !editingMapData.Code}
                className="flex-1 h-11 bg-psim-orange text-white rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-psim-orange/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updateMapMutation.isPending && <RefreshCcw size={14} className="animate-spin" />}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE MAP CONFIRMATION MODAL --- */}
      {mapToDelete && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setMapToDelete(null)} />
          <div className="relative w-full max-w-sm bg-[#161b2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-psim-red/20 text-psim-red flex items-center justify-center mb-6 shadow-lg shadow-psim-red/10 animate-pulse">
                <Trash2 size={40} />
              </div>

              <h3 className="text-[18px] font-bold text-white uppercase tracking-tight mb-2">
                Xác nhận xóa bản đồ
              </h3>

              <p className="text-[13px] text-t-2 leading-relaxed mb-8 px-4">
                Bạn có chắc chắn muốn xóa bản đồ <span className="text-white font-bold">"{mapToDelete.name}"</span>? Hành động này sẽ gỡ bỏ bản đồ khỏi hệ thống phân cấp.
              </p>

              <div className="w-full flex gap-3">
                <button 
                  onClick={() => setMapToDelete(null)}
                  className="flex-1 h-12 rounded-xl text-[12px] font-bold text-t-2 uppercase border border-white/10 hover:bg-white/5 transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => deleteMapMutation.mutate(mapToDelete.id)}
                  disabled={deleteMapMutation.isPending}
                  className="flex-[2] h-12 bg-psim-red text-white rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-psim-red/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteMapMutation.isPending && <RefreshCcw size={14} className="animate-spin" />}
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE IMAGE CONFIRMATION MODAL --- */}
      {imageToDeleteId && (
        <div className="fixed inset-0 z-[11500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setImageToDeleteId(null)} />
          <div className="relative w-full max-w-sm bg-[#161b2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-psim-red/20 text-psim-red flex items-center justify-center mb-6 shadow-lg shadow-psim-red/10 animate-pulse">
                <ImageIcon size={40} />
              </div>

              <h3 className="text-[18px] font-bold text-white uppercase tracking-tight mb-2">
                Xác nhận xóa ảnh
              </h3>

              <p className="text-[13px] text-t-2 leading-relaxed mb-8 px-4">
                Bạn có chắc chắn muốn gỡ bỏ hình ảnh của bản đồ này? Các thiết bị đã đặt trên bản đồ vẫn sẽ được giữ lại.
              </p>

              <div className="w-full flex gap-3">
                <button 
                  onClick={() => setImageToDeleteId(null)}
                  className="flex-1 h-12 rounded-xl text-[12px] font-bold text-t-2 uppercase border border-white/10 hover:bg-white/5 transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => deleteImageMutation.mutate(imageToDeleteId)}
                  disabled={deleteImageMutation.isPending}
                  className="flex-[2] h-12 bg-psim-red text-white rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-psim-red/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteImageMutation.isPending && <RefreshCcw size={14} className="animate-spin" />}
                  Xác nhận xóa ảnh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- RESPONSE MODAL --- */}
      {responseModal.isOpen && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setResponseModal(prev => ({ ...prev, isOpen: false }))} />
          <div className="relative w-full max-w-sm bg-[#161b2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg animate-in zoom-in-50 duration-300",
                responseModal.status === 1 ? "bg-psim-green/20 text-psim-green shadow-psim-green/10" : "bg-psim-red/20 text-psim-red shadow-psim-red/10"
              )}>
                {responseModal.status === 1 ? <CheckCircle2 size={40} /> : <X size={40} />}
              </div>

              <h3 className="text-[18px] font-bold text-white uppercase tracking-tight mb-2">
                Thông báo
              </h3>

              <p className="text-[13px] text-t-2 leading-relaxed mb-8">
                {responseModal.message}
              </p>

              <button 
                onClick={() => setResponseModal(prev => ({ ...prev, isOpen: false }))}
                className={cn(
                  "w-full h-12 rounded-xl text-[12px] font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]",
                  responseModal.status === 1 ? "bg-psim-green text-bg0 shadow-lg shadow-psim-green/20" : "bg-psim-red text-white shadow-lg shadow-psim-red/20"
                )}
              >
                Xác nhận (OK)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- IMAGE UPLOAD WIZARD --- */}
      {isUploadWizardOpen && (
        <ImageUploadWizard 
          onConfirm={handleWizardConfirm}
          onCancel={() => setIsUploadWizardOpen(false)}
          isUploading={uploadImageMutation.isPending}
        />
      )}

      {/* --- MANUAL DOWNLOAD MODAL (CORS FALLBACK) --- */}
      {showDownloadManual.isOpen && (
        <div className="fixed inset-0 z-[13000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowDownloadManual({ isOpen: false, url: '' })} />
          <div className="relative w-full max-w-md bg-[#161b2e] border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-psim-orange/20 text-psim-orange flex items-center justify-center mb-6">
                <Download size={32} />
              </div>
              <h3 className="text-[18px] font-bold text-white uppercase tracking-tight mb-2">Tải ảnh mẫu thủ công</h3>
              <p className="text-[13px] text-t-2 leading-relaxed mb-8">
                Do giới hạn bảo mật trình duyệt, bạn vui lòng thực hiện các bước sau:<br/>
                <span className="text-white font-bold">1. Click vào nút "Mở ảnh" bên dưới</span><br/>
                <span className="text-white font-bold">2. Chuột phải vào ảnh chọn "Lưu hình ảnh thành..."</span>
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <a 
                  href={showDownloadManual.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full h-12 bg-psim-orange text-white rounded-xl font-bold uppercase text-[12px] flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
                >
                  <ImageIcon size={18} /> Mở ảnh trong tab mới
                </a>
                <button 
                  onClick={() => setShowDownloadManual({ isOpen: false, url: '' })}
                  className="w-full h-12 border border-white/10 text-t-2 rounded-xl font-bold uppercase text-[12px] hover:bg-white/5 transition-all"
                >
                  Đóng lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

