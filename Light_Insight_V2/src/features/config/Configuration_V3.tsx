import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Zap, 
  ClipboardList, 
  Plug2, 
  BellRing, 
  ShieldCheck,
  RefreshCcw,
  Activity,
  Globe,
  Database,
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Filter,
  Search,
  Car,
  Key,
  Flame,
  ShieldAlert,
  X,
  Check,
  Shield,
  UserPlus,
  Lock,
  SearchIcon,
  MoreVertical,
  CheckCircle2,
  Eye,
  EyeOff,
  Map as MapIcon,
  Upload,
  User,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StatusPill } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { priorityApi } from '@/lib/priority-api';
import { mapApi } from '@/lib/map-api';
import { authApi } from '@/lib/auth-api';
import type { Priority, MapTreeNode } from '@/types';

type ConfigSection = 'roles' | 'rules' | 'sop' | 'connectors' | 'escalation' | 'notif' | 'priority' | 'map_management';

const ROLES_DATA = [
  { 
    id: 'admin', 
    name: '🔴 Admin', 
    desc: 'Toàn quyền hệ thống', 
    borderColor: 'border-[#ff3b5c]/25', 
    textColor: 'text-psim-red', 
    perms: [
      { text: 'Xem tất cả dữ liệu', type: 'allow' },
      { text: 'Cấu hình rule & SOP', type: 'allow' },
      { text: 'Quản lý user & role', type: 'allow' },
      { text: 'Xem audit log', type: 'allow' },
      { text: 'Xuất báo cáo mọi loại', type: 'allow' }
    ] 
  },
  { 
    id: 'supervisor', 
    name: '🟠 Supervisor', 
    desc: 'Trưởng ca / Giám sát', 
    borderColor: 'border-[#ff8c00]/20', 
    textColor: 'text-psim-orange', 
    perms: [
      { text: 'Xem tất cả alarm & incident', type: 'allow' },
      { text: 'Escalate & override SOP', type: 'allow' },
      { text: 'Xem analytics & report', type: 'allow' },
      { text: 'Không được cấu hình rule', type: 'deny' },
      { text: 'Không xóa audit log', type: 'deny' }
    ] 
  },
  { 
    id: 'operator', 
    name: '🔵 Operator', 
    desc: 'Nhân viên trực ca', 
    borderColor: 'border-[#00c2ff]/20', 
    textColor: 'text-psim-accent', 
    perms: [
      { text: 'Xem & xử lý alarm/incident', type: 'allow' },
      { text: 'Thực hiện SOP checklist', type: 'allow' },
      { text: 'Giao việc guard', type: 'allow' },
      { text: 'Không xem analytics chi tiết', type: 'deny' },
      { text: 'Không cấu hình hệ thống', type: 'deny' }
    ] 
  },
  { 
    id: 'viewer', 
    name: '⚪ Viewer', 
    desc: 'Ban quản lý / Xem', 
    borderColor: 'border-white/10', 
    textColor: 'text-t-1', 
    perms: [
      { text: 'Xem dashboard & report', type: 'allow' },
      { text: 'Xem camera live (read only)', type: 'allow' },
      { text: 'Không xử lý alarm', type: 'deny' },
      { text: 'Không xem audit log', type: 'deny' }
    ] 
  },
];

export function Configuration_V3() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<ConfigSection>('roles');
  
  // --- USER MANAGEMENT STATES ---
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPageSize] = useState(10);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- API DATA FETCHING ---
  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users-list', userSearch, userPage, userPageSize],
    queryFn: () => authApi.getUsers(userSearch, userPage, userPageSize),
  });

  const { data: rolesResponse } = useQuery({
    queryKey: ['roles-list'],
    queryFn: () => authApi.getRoles(),
  });
  const allRoles = rolesResponse?.Data || [];

  const allUsers = usersResponse?.Data || [];
  const totalUsers = usersResponse?.TotalRow || 0;

  // Lọc local cho Role và Status
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchRole = !roleFilter || u.RoleName?.toLowerCase() === roleFilter.toLowerCase();
      const matchStatus = !statusFilter || u.Status?.toLowerCase() === statusFilter.toLowerCase();
      return matchRole && matchStatus;
    });
  }, [allUsers, roleFilter, statusFilter]);

  const { data: priorities = [] } = useQuery({
    queryKey: ['priority-levels'],
    queryFn: priorityApi.getPriorityLevels,
    initialData: [
      { ID: 1, PriorityName: 'LOW' },
      { ID: 2, PriorityName: 'MEDIUM' },
      { ID: 3, PriorityName: 'HIGH' },
      { ID: 4, PriorityName: 'CRITICAL' }
    ]
  });

  const { data: allEventsResponse } = useQuery({
    queryKey: ['analytics-events'],
    queryFn: priorityApi.getAnalyticsEvents,
  });
  const allEvents = allEventsResponse?.Data || [];

  const { data: mappingsResponse, isLoading: isLoadingMappings } = useQuery({
    queryKey: ['priority-mappings'],
    queryFn: priorityApi.getAllMappings,
  });
  const mappings = mappingsResponse?.Data || [];

  // --- API MUTATIONS ---
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      setResponseModal({
        isOpen: true,
        status: res.Status,
        message: res.Message || (res.Status === 1 ? 'Đăng ký thành công.' : 'Có lỗi xảy ra')
      });
      
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['users-list'] });
        setIsAddUserDialogOpen(false);
        setNewUserData({
          username: '',
          password: '',
          name: '',
          email: '',
          phone: '',
          roleId: '',
          status: 'Active'
        });
      }
    },
    onError: (err: any) => {
      setResponseModal({
        isOpen: true,
        status: -1,
        message: err.response?.data?.Message || 'Lỗi kết nối hệ thống'
      });
    }
  });

  const insertMutation = useMutation({
    mutationFn: priorityApi.insertMapping,
    onSuccess: (res) => {
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['priority-mappings'] });
        setIsDialogOpen(false);
        setBasket([]);
      } else {
        alert(res.Message);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: priorityApi.deleteMapping,
    onSuccess: (res) => {
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['priority-mappings'] });
      } else {
        alert(res.Message);
      }
    }
  });

  const [responseModal, setResponseModal] = useState<{ isOpen: boolean; status: number; message: string }>({
    isOpen: false,
    status: 0,
    message: ''
  });

  const { data: connectorsResponse, isLoading: isLoadingConnectors } = useQuery({
    queryKey: ['connectors-list'],
    queryFn: priorityApi.getAllConnectors,
  });
  const actualConnectors = connectorsResponse?.Data || [];

  const connectorMutation = useMutation({
    mutationFn: priorityApi.insertConnector,
    onSuccess: (res) => {
      setResponseModal({
        isOpen: true,
        status: res.Status,
        message: res.Message || (res.Status === 1 ? 'Thêm connector thành công.' : 'Có lỗi xảy ra')
      });
      
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['connectors-list'] });
        setIsConnectorDialogOpen(false);
        setNewConnector({ name: '', vmsId: 0, ip: '', port: '', username: '', password: '' });
      }
    },
    onError: (err: any) => {
      setResponseModal({
        isOpen: true,
        status: -1,
        message: err.response?.data?.Message || 'Lỗi kết nối hệ thống'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { ID: number; PriorityID: number } }) => 
      priorityApi.updateMapping(id, data),
    onSuccess: (res) => {
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['priority-mappings'] });
        setEditingMapping(null);
      } else {
        alert(res.Message);
      }
    }
  });

  const { data: vmsListResponse } = useQuery({
    queryKey: ['vms-list'],
    queryFn: priorityApi.getAllVMS,
  });
  const vmsList = vmsListResponse?.Data || [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateMapModalOpen, setIsCreateMapModalOpen] = useState(false);
  const [newMapData, setNewMapData] = useState<{ Name: string; Code: string; ParentId: string | null }>({
    Name: '',
    Code: '',
    ParentId: null
  });

  const [editingMapData, setEditingMapData] = useState<{ Id: string; Name: string; Code: string; ParentId: string | null } | null>(null);
  const [mapToDelete, setMapToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: mapTreeResponse, isLoading: isLoadingMapTree } = useQuery({
    queryKey: ['map-tree'],
    queryFn: mapApi.getAllTree,
    enabled: activeSection === 'map_management' || isCreateMapModalOpen
  });
  const mapTree = mapTreeResponse?.Data || [];

  // Flatten map tree for select
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

  const createMapMutation = useMutation({
    mutationFn: mapApi.createMap,
    onSuccess: (res) => {
      setResponseModal({
        isOpen: true,
        status: res.Status,
        message: res.Message || (res.Status === 1 ? 'Tạo bản đồ thành công.' : 'Có lỗi xảy ra')
      });
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
      setResponseModal({
        isOpen: true,
        status: res.Status,
        message: res.Message || (res.Status === 1 ? 'Cập nhật bản đồ thành công.' : 'Có lỗi xảy ra')
      });
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['map-tree'] });
        setEditingMapData(null);
      }
    }
  });

  const deleteMapMutation = useMutation({
    mutationFn: mapApi.deleteMap,
    onSuccess: (res) => {
      setResponseModal({
        isOpen: true,
        status: res.Status,
        message: res.Message || (res.Status === 1 ? 'Xóa bản đồ thành công.' : 'Có lỗi xảy ra')
      });
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['map-tree'] });
        setMapToDelete(null);
      }
    }
  });

  const [isConnectorDialogOpen, setIsConnectorDialogOpen] = useState(false);
  const [newConnector, setNewConnector] = useState({
    name: '',
    vmsId: 0,
    ip: '',
    port: '',
    username: '',
    password: ''
  });
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    roleId: '',
    status: 'Active'
  });
  const [basket, setBasket] = useState<string[]>([]);
  const [selectedPriorityId, setSelectedPriorityId] = useState<number>(2);
  const [modalSearch, setModalSearch] = useState('');
  const [mapSearch, setMapSearch] = useState('');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedVmsId, setSelectedVmsId] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [editingMapping, setEditingMapping] = useState<{ id: number; name: string; currentPriorityId: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMapImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const navItems = [
    { id: 'roles', label: 'User & Roles', icon: Users, group: 'Admin' },
    { id: 'rules', label: 'Rule & Alarm Config', icon: Zap, group: 'Admin' },
    { id: 'priority', label: 'Alarm Priority V3', icon: Sliders, group: 'Admin' },
    { id: 'sop', label: 'SOP Builder', icon: ClipboardList, group: 'Admin' },
    { id: 'connectors', label: 'Connectors', icon: Plug2, group: 'Admin' },
    { id: 'map_management', label: 'Map Management', icon: MapIcon, group: 'Admin' },
    { id: 'escalation', label: 'Escalation Rules', icon: ShieldCheck, group: 'Hệ thống' },
    { id: 'notif', label: 'Notifications', icon: BellRing, group: 'Hệ thống' },
  ];

  // --- RENDER MAP MANAGEMENT (Based on image.png) ---
  const renderMapManagement = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-500 w-full overflow-hidden">
      {/* Top Header */}

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
        {/* Left Sidebar: Maps & Cameras */}
        <div className="w-72 flex flex-col gap-4 shrink-0 overflow-hidden h-full">
          {/* Section: Bản đồ */}
          <div className="bg-bg1 border border-border-dim rounded-xl p-4 flex flex-col gap-3 flex-1 overflow-hidden min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">Bản đồ</h3>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['map-tree'] })}
                className="p-1 hover:bg-white/5 rounded transition-colors text-t-2"
              >
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
              {flatMaps.filter(m => m.name.toLowerCase().includes(mapSearch.toLowerCase())).map((map, i) => (
                <div 
                  key={map.id} 
                  onClick={() => {
                    setSelectedMapId(map.id);
                    // Find node in tree to get MapImagePath
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
                    if (node && node.MapImagePath) {
                      setMapImage(node.MapImagePath);
                    } else {
                      setMapImage(null);
                    }
                  }}
                  className={cn(
                    "p-3 bg-white/5 border rounded-lg transition-all group cursor-pointer shrink-0",
                    selectedMapId === map.id ? "border-psim-orange shadow-lg shadow-psim-orange/10 bg-psim-orange/5" : "border-white/5 hover:border-psim-orange/30"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div style={{ paddingLeft: `${map.depth * 12}px` }}>
                      <div className={cn(
                        "text-[12px] font-bold transition-colors",
                        selectedMapId === map.id ? "text-psim-orange" : "text-t-1 group-hover:text-white"
                      )}>{map.name}</div>
                      <div className="text-[9px] text-t-2 font-mono uppercase">Level {map.depth + 1}</div>
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
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
                          if (node) {
                            setEditingMapData({
                              Id: node.Id,
                              Name: node.Name,
                              Code: node.Code,
                              ParentId: node.ParentId
                            });
                          }
                        }}
                        className="p-1 hover:bg-white/10 rounded text-psim-orange"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setMapToDelete({ id: map.id, name: map.name });
                        }}
                        className="p-1 hover:bg-white/10 rounded text-psim-red"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {flatMaps.length === 0 && !isLoadingMapTree && (
                <div className="py-10 text-center opacity-20 text-[10px] uppercase font-bold tracking-widest">Chưa có bản đồ</div>
              )}
            </div>
          </div>

          {/* Section: Camera */}
          <div className="bg-bg1 border border-border-dim rounded-xl p-4 flex flex-col gap-3 h-[200px] shrink-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">Thiết bị</h3>
              <select 
                className="bg-black/40 border border-white/10 rounded h-7 px-2 text-[10px] text-white outline-none focus:border-psim-orange/50 transition-all cursor-pointer min-w-[100px]"
                value={selectedVmsId || ''}
                onChange={(e) => setSelectedVmsId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="" className="bg-[#161b2e]">-- Hệ thống --</option>
                {vmsList.map((vms) => (
                  <option key={vms.VmsId} value={vms.VmsId} className="bg-[#161b2e]">
                    {vms.VmsName}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-t-2" size={13} />
              <input 
                className="w-full bg-black/20 border border-white/10 rounded-lg h-9 pl-9 pr-4 text-[11px] text-white outline-none focus:border-psim-orange/50 transition-all"
                placeholder="Tìm theo mã hoặc IP"
              />
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin pr-1 flex-1">
              {[
                { name: 'Gate 54', ip: '192.168.100.54' },
                { name: 'Store 20', ip: '192.168.100.20' }
              ].map((cam, i) => (
                <div key={i} className="p-2.5 bg-white/5 border border-white/5 rounded-lg hover:border-psim-accent/30 transition-all cursor-move active:scale-95 shrink-0">
                  <div className="text-[11px] font-bold text-t-1 uppercase tracking-tight">{cam.name}</div>
                  <div className="text-[9px] text-t-2 font-mono">IP: {cam.ip}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Main Area: Map Canvas */}
        <div className="flex-1 bg-bg1 border border-border-dim rounded-xl flex flex-col overflow-hidden relative shadow-inner h-full">
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-white uppercase tracking-tight truncate max-w-[200px]">
                  {flatMaps.find(m => m.id === selectedMapId)?.name || 'Chưa chọn bản đồ'}
                </span>
                <span className="bg-psim-orange/20 text-psim-orange text-[9px] font-bold px-1.5 py-0.5 rounded border border-psim-orange/30 shrink-0">ẢNH</span>
              </div>
              <span className="text-[10px] text-t-2 mt-0.5">Bản đồ ảnh với thu phóng.</span>
            </div>
            <div className="flex gap-2">
              {mapImage && (
                <div className="flex border border-white/10 rounded overflow-hidden mr-2">
                  <button 
                    onClick={() => setZoomScale(prev => Math.max(0.1, prev - 0.1))}
                    className="w-8 h-8 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border-r border-white/10"
                    title="Thu nhỏ"
                  >
                    -
                  </button>
                  <div className="px-2 h-8 bg-black/20 flex items-center justify-center text-[10px] font-mono text-white min-w-[50px]">
                    {Math.round(zoomScale * 100)}%
                  </div>
                  <button 
                    onClick={() => setZoomScale(prev => Math.min(5, prev + 0.1))}
                    className="w-8 h-8 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center"
                    title="Phóng to"
                  >
                    +
                  </button>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-t-2 uppercase flex items-center gap-2 hover:bg-white/10 transition-all"
              >
                <Upload size={12} /> Tải ảnh
              </button>
              <button disabled={!mapImage} className="h-8 px-3 rounded bg-white/5 border border-white/5 text-[10px] font-bold text-t-2 uppercase opacity-30 cursor-not-allowed">
                Lưu vị trí
              </button>
            </div>
          </div>

          <div 
            className="flex-1 flex flex-col items-center justify-center bg-black/40 relative group overflow-hidden"
            onWheel={(e) => {
              if (mapImage) {
                if (e.deltaY < 0) setZoomScale(prev => Math.min(5, prev + 0.1));
                else setZoomScale(prev => Math.max(0.1, prev - 0.1));
              }
            }}
          >
            {mapImage ? (
              <div 
                className="w-full h-full flex items-center justify-center transition-transform duration-200"
                style={{ transform: `scale(${zoomScale})` }}
              >
                <img src={mapImage} alt="Map Floorplan" className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-500" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 opacity-20 group-hover:opacity-40 transition-all">
                <MapIcon size={48} strokeWidth={1} className="text-white" />
                <p className="text-[11px] text-white font-medium uppercase tracking-widest">Chưa có ảnh bản đồ</p>
              </div>
            )}
            
            <div className="absolute inset-4 border border-dashed border-white/5 rounded-2xl pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (isDialogOpen || editingMapping || isCreateMapModalOpen || isConnectorDialogOpen || editingMapData || isConnectorDialogOpen || isAddUserDialogOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [isDialogOpen, editingMapping, isCreateMapModalOpen, isConnectorDialogOpen, editingMapData, isConnectorDialogOpen, isAddUserDialogOpen]);

  const handleSaveConfig = () => {
    insertMutation.mutate({
      PriorityID: selectedPriorityId,
      AnalyticsEvents: basket
    });
  };

  const handleUpdateConfig = (newPriorityId: number) => {
    if (editingMapping) {
      updateMutation.mutate({
        id: editingMapping.id,
        data: { ID: editingMapping.id, PriorityID: newPriorityId }
      });
    }
  };

  const handleDeleteMapping = (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa cấu hình này?')) {
      deleteMutation.mutate(id);
    }
  };

  const getUserGradient = (name: string) => {
    const chars = (name || 'US').split(' ').map(n => n[0]).join('');
    const sum = chars.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const grads = [
      'from-psim-accent2 to-blue-600',
      'from-psim-orange to-psim-red',
      'from-psim-red to-purple-600',
      'from-psim-green to-teal-600',
      'from-purple-500 to-indigo-600'
    ];
    return grads[sum % grads.length];
  };

  const handleRegisterUser = () => {
    if (!newUserData.username || !newUserData.password || !newUserData.roleId) {
      alert('Vui lòng điền đầy đủ các trường bắt buộc (*)');
      return;
    }
    registerMutation.mutate({
      Username: newUserData.username,
      Password: newUserData.password,
      Name: newUserData.name,
      Email: newUserData.email,
      PhoneNumber: newUserData.phone,
      Status: newUserData.status,
      RoleId: newUserData.roleId
    });
  };

  // --- RENDER ROLES & USERS (4.1) ---
  const renderRoles = () => (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500 w-full h-full max-h-full overflow-hidden">
      {/* Header Section */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[14px] font-heading font-bold text-t0 uppercase">User & Role Management (4.1)</h2>
          <div className="h-3 w-[1px] bg-border-dim mx-1"></div>
        </div>
        <button 
          onClick={() => setIsAddUserDialogOpen(true)}
          className="bg-psim-accent2 text-white font-bold text-[11px] uppercase tracking-wider gap-2 h-8 px-4 rounded flex items-center shadow-lg shadow-psim-accent2/20 hover:scale-[1.02] transition-all"
        >
          <Plus size={14} /> Thêm user
        </button>
      </div>

      {/* Role Grid */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        {ROLES_DATA.map(role => (
          <div key={role.id} className={cn("bg-bg-2 border rounded-lg p-4 flex flex-col gap-3 shadow-sm hover:border-white/10 transition-all", role.borderColor)}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className={cn("text-[13px] font-bold tracking-tight uppercase font-heading", role.textColor)}>{role.name}</h3>
                <p className="text-[11px] text-t-2 mt-0.5">{role.desc}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              {role.perms.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-t-1">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", p.type === 'allow' ? "bg-psim-green" : "bg-psim-red")} />
                  <span className="opacity-80">{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User Section Header */}
      <div className="mt-2 flex items-center justify-between border-b border-border-dim pb-2 shrink-0">
        <h3 className="text-[12px] font-bold text-t0 uppercase tracking-widest font-heading">Danh sách Users</h3>
        <div className="flex gap-2 relative">
           <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t-2" size={13} />
              <input 
                className="bg-bg2 border border-border-dim rounded h-7 pl-8 pr-3 text-[10px] text-t-1 w-56 focus:border-psim-accent2/50 outline-none transition-all" 
                placeholder="Tìm tên" 
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
              />
           </div>
           <button 
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={cn(
              "h-7 w-7 rounded bg-bg2 border border-border-dim flex items-center justify-center transition-colors",
              (roleFilter || statusFilter) ? "text-psim-accent2 border-psim-accent2/30" : "text-t-2 hover:text-t-1"
            )}
           >
            <Filter size={13} />
           </button>

           {/* Filter Menu */}
           {showFilterMenu && (
             <div className="absolute top-9 right-0 w-56 bg-[#161b2e] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Filter size={14} className="text-psim-accent2" /> Bộ lọc
                    </span>
                    <button onClick={() => setShowFilterMenu(false)} className="text-t-2 hover:text-white"><X size={14} /></button>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest mb-1.5 block px-1">Role</label>
                    <select 
                      className="w-full bg-black/30 border border-white/10 rounded-lg h-9 px-3 text-[11px] text-white outline-none focus:border-psim-accent2/50 transition-all appearance-none cursor-pointer"
                      value={roleFilter || ''}
                      onChange={(e) => setRoleFilter(e.target.value || null)}
                    >
                      <option value="" className="bg-[#161b2e]">Tất cả Role</option>
                      {allRoles.map((r: any) => (
                        <option key={r.Id} value={r.Name} className="bg-[#161b2e]">{r.Name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest mb-1.5 block px-1">Trạng thái</label>
                    <select 
                      className="w-full bg-black/30 border border-white/10 rounded-lg h-9 px-3 text-[11px] text-white outline-none focus:border-psim-accent2/50 transition-all appearance-none cursor-pointer"
                      value={statusFilter || ''}
                      onChange={(e) => setStatusFilter(e.target.value || null)}
                    >
                      <option value="" className="bg-[#161b2e]">Tất cả trạng thái</option>
                      <option value="Active" className="bg-[#161b2e]">Active</option>
                      <option value="Inactive" className="bg-[#161b2e]">Inactive</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-white/5 mt-1 flex items-center justify-between">
                    <button 
                      onClick={() => { setRoleFilter(null); setStatusFilter(null); }}
                      className="text-[10px] px-4 py-1.5 font-bold bg-psim-red rounded-md hover:bg-red-400 transition-all uppercase tracking-tight"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* User Table - Fixed Header, Scrollable Body */}
      <div className="flex-1 flex flex-col min-h-0 bg-transparent border border-border-dim shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-bg4 scrollbar-track-transparent">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#121929] border-b border-border-dim">
                <th className="py-2 px-6 text-[9px] font-mono text-t-2 uppercase tracking-widest w-[25%]">Tên / Username</th>
                <th className="py-2 px-4 text-[9px] font-mono text-t-2 uppercase tracking-widest w-[20%]">Email / Phone</th>
                <th className="py-2 px-4 text-[9px] font-mono text-t-2 uppercase tracking-widest w-[12%] text-center">Role</th>
                <th className="py-2 px-4 text-[9px] font-mono text-t-2 uppercase tracking-widest w-[12%] text-center">Trạng thái</th>
                <th className="py-2 px-4 text-[9px] font-mono text-t-2 uppercase tracking-widest w-[20%] text-center whitespace-nowrap">Đăng nhập</th>
                <th className="py-2 px-6 text-[9px] font-mono text-t-2 uppercase tracking-widest w-[11%] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dim/30">
              {isLoadingUsers ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <RefreshCcw className="animate-spin text-psim-accent2 mx-auto mb-3" />
                    <span className="text-[10px] text-t-2 font-mono uppercase">Đang tải...</span>
                  </td>
                </tr>
              ) : filteredUsers.map((u, i) => (
                <tr key={i} className="hover:bg-psim-accent2/[0.03] transition-colors group h-10 bg-bg0">
                  <td className="py-1 px-6">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold text-white shadow-md shrink-0 uppercase bg-gradient-to-br",
                        getUserGradient(u.Name || u.Username)
                      )}>
                        {(u.Name || u.Username || 'US').slice(0, 2)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="font-bold text-[11px] text-t-1 group-hover:text-psim-accent2 transition-colors uppercase truncate leading-tight">
                          {u.Name || u.Username}
                        </div>
                        <div className="text-[8px] text-t-2 font-mono opacity-50 truncate">@{u.Username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-1 px-4">
                    <div className="flex flex-col min-w-0">
                      <div className="text-[10px] text-t-2 font-mono truncate lowercase">{u.Email || 'No email'}</div>
                      <div className="text-[8px] text-t-2 font-mono opacity-50">{u.PhoneNumber || '--'}</div>
                    </div>
                  </td>
                  <td className="py-1 px-4 text-center">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tight border",
                      u.RoleName === 'Admin' ? "bg-psim-red/10 text-psim-red border-psim-red/20" :
                      u.RoleName === 'Supervisor' ? "bg-psim-orange/10 text-psim-orange border-psim-orange/20" :
                      u.RoleName === 'Operator' ? "bg-psim-accent2/10 text-psim-accent2 border-psim-accent2/20" :
                      "bg-bg3 text-t-2 border-border-dim"
                    )}>
                      {u.RoleName}
                    </span>
                  </td>
                  <td className="py-1 px-4 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest",
                      u.Status?.toLowerCase() === 'active' ? "text-psim-green" : "text-psim-orange"
                    )}>
                      <span className={cn("w-1 h-1 rounded-full", u.Status?.toLowerCase() === 'active' ? "bg-psim-green animate-pulse shadow-[0_0_6px_var(--color-psim-green)]" : "bg-psim-orange")} />
                      {u.Status}
                    </span>
                  </td>
                  <td className="py-1 px-4 text-[9px] font-mono text-t-2 uppercase text-center whitespace-nowrap">
                    {u.LastLogin ? new Date(u.LastLogin).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--/--'}
                  </td>
                  <td className="py-1 px-6 text-right whitespace-nowrap">
                    <button className="px-2 py-0.5 bg-bg-4 border border-border-dim rounded text-[9px] font-bold text-t-1 uppercase hover:bg-bg3 hover:text-psim-accent2 transition-all shadow-sm">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoadingUsers && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center opacity-30">
                    <UserPlus size={40} className="mx-auto mb-4" />
                    <p className="text-[12px] uppercase font-bold tracking-widest">Không tìm thấy người dùng nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar - Slimmer */}
        <div className="bg-[#121929]/50 border-t border-border-dim px-6 py-2 flex items-center justify-between shrink-0">
            <div className="text-[10px] text-t-2 font-mono">
              Hiển thị <span className="text-t-1">{(userPage-1)*userPageSize + 1}</span> - <span className="text-t-1">{Math.min(userPage*userPageSize, totalUsers)}</span> / <span className="text-psim-accent2">{totalUsers}</span>
            </div>
            <div className="flex gap-1.5">
               <button 
                disabled={userPage === 1}
                onClick={() => setUserPage(p => p - 1)}
                className="w-6 h-6 rounded bg-bg2 border border-border-dim flex items-center justify-center text-t-2 hover:text-t-1 disabled:opacity-30 disabled:hover:text-t-2 transition-colors"
               >
                 <ChevronLeft size={14} />
               </button>
               <div className="flex items-center px-2 text-[10px] font-bold text-white bg-bg3 border border-border-dim rounded min-w-[24px] justify-center">
                  {userPage}
               </div>
               <button 
                disabled={userPage * userPageSize >= totalUsers}
                onClick={() => setUserPage(p => p + 1)}
                className="w-6 h-6 rounded bg-bg2 border border-border-dim flex items-center justify-center text-t-2 hover:text-t-1 disabled:opacity-30 disabled:hover:text-t-2 transition-colors"
               >
                 <ChevronRight size={14} />
               </button>
            </div>
        </div>
      </div>
    </div>
  );

  const renderPriorityTable = () => {
    const tableData = mappings.flatMap(m => 
      m.AnalyticsEvents.map(evtName => ({
        mappingId: m.ID,
        label: evtName,
        priority: m.PriorityName.toLowerCase() as Priority,
        priorityId: m.PriorityID
      }))
    ).reverse();

    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full h-full overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[18px] font-heading font-bold text-t0 text-white uppercase tracking-tight">Alarm Priority Management (Live API)</h2>
            <p className="text-[12px] text-t-2 mt-1">Quản lý các quy tắc phân loại mức độ nghiêm trọng cho từng sự kiện AI</p>
          </div>
          <button 
            onClick={() => { setBasket([]); setIsDialogOpen(true); }}
            className="bg-psim-accent text-bg0 font-bold text-[11px] uppercase tracking-wider gap-2 h-10 px-6 rounded-md flex items-center shadow-lg shadow-psim-accent/20 hover:scale-[1.02] transition-all"
          >
            <Plus size={16} /> Tạo cấu hình mới
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-[#0d1220] border border-border-dim rounded-lg overflow-hidden shadow-sm flex flex-col">
          {isLoadingMappings ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
               <RefreshCcw className="animate-spin text-psim-accent" />
               <span className="text-t-2 font-mono text-[11px] uppercase tracking-widest">Đang tải...</span>
            </div>
          ) : (
            <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-psim-accent/30 scrollbar-track-transparent hover:scrollbar-thumb-psim-accent/50">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#121929] border-b border-border-dim">
                    <th className="py-4 px-6 text-[10px] font-mono text-t-2 uppercase tracking-widest w-16 text-center">STT</th>
                    <th className="py-4 px-2 text-[10px] font-mono text-t-2 uppercase tracking-widest">Analytics Event Name</th>
                    <th className="py-4 px-4 text-[10px] font-mono text-t-2 uppercase tracking-widest w-48 text-center">Assigned Priority</th>
                    <th className="py-4 px-6 text-[10px] font-mono text-t-2 uppercase tracking-widest w-24 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dim/30">
                  {tableData.map((c, index) => (
                    <tr key={`${c.mappingId}-${index}`} className="hover:bg-psim-accent/[0.02] transition-colors group h-16 bg-[#0d1220]">
                      <td className="py-3 px-6 font-mono text-[11px] text-t-2 text-center opacity-50">{index + 1}</td>
                      <td className="py-3 px-2">
                        <div className="font-bold text-[13px] text-t-1 group-hover:text-psim-accent transition-colors uppercase whitespace-nowrap overflow-hidden text-ellipsis">{c.label}</div>
                        {/* <div className="text-[9px] font-mono text-t-2 mt-1 opacity-40 uppercase tracking-tighter">Mapping ID: #{c.mappingId}</div> */}
                      </td>
                      <td className="py-3 px-4 text-center">
                         <div className="flex justify-center">
                            <StatusPill priority={c.priority} className="w-32 shadow-lg uppercase" />
                         </div>
                      </td>
                      <td className="py-3 px-6 text-right">
                         <div className="flex justify-end gap-1.5 opacity-20 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-2">
                            <button 
                              className="w-9 h-9 rounded bg-bg2 border border-border-dim flex items-center justify-center text-t-2 hover:text-psim-accent transition-colors shadow-sm"
                              onClick={() => setEditingMapping({ id: c.mappingId, name: c.label, currentPriorityId: c.priorityId })}
                              title="Đổi Priority"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="w-9 h-9 rounded bg-bg2 border border-border-dim flex items-center justify-center text-t-2 hover:text-psim-red transition-colors"
                              onClick={() => handleDeleteMapping(c.mappingId)}
                              title="Xóa"
                            >
                              <Trash2 size={14} />
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {tableData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-32 text-center">
                         <div className="flex flex-col items-center gap-4 opacity-20">
                            <Zap size={48} />
                            <span className="text-[12px] uppercase font-bold tracking-[0.2em]">Chưa có cấu hình nào</span>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: ''
  });

  const deleteConnectorMutation = useMutation({
    mutationFn: priorityApi.deleteConnector,
    onSuccess: (res) => {
      setResponseModal({
        isOpen: true,
        status: res.Status,
        message: res.Message || (res.Status === 1 ? 'Xóa connector thành công.' : 'Có lỗi xảy ra khi xóa')
      });
      if (res.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['connectors-list'] });
        setDeleteConfirmModal({ isOpen: false, id: '', name: '' });
      }
    }
  });

  const [isViewingDetails, setIsViewingDetails] = useState(false);

  const handleOpenDetails = (connector: any) => {
    setNewConnector({
      name: connector.VmsName,
      vmsId: connector.VmsID || 0,
      ip: connector.IpServer,
      port: connector.Port.toString(),
      username: connector.Username,
      password: connector.Password
    });
    setIsViewingDetails(true);
    setIsConnectorDialogOpen(true);
  };

  const handleOpenAdd = () => {
    setNewConnector({ name: '', vmsId: 0, ip: '', port: '', username: '', password: '' });
    setIsViewingDetails(false);
    setIsConnectorDialogOpen(true);
  };

  const renderConnectors = () => (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-[18px] font-heading font-bold text-t0 uppercase tracking-tight">VMS & Device Connectors (4.3)</h2>
          <p className="text-[12px] text-t-2 mt-1">Trạng thái kết nối API tới các hệ thống ngoại vi</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleOpenAdd}
            className="px-4 py-1.5 bg-bg2 border border-border-dim rounded text-[11px] font-bold text-t-1 hover:bg-bg3 transition-colors"
          >
            + Thêm Connector
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-bg4">
        {isLoadingConnectors ? (
          <div className="py-24 text-center animate-pulse flex flex-col items-center gap-3">
             <RefreshCcw className="animate-spin text-psim-accent" />
             <span className="text-t-2 font-mono text-[11px] uppercase tracking-widest">Đang tải...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pb-6">
            {actualConnectors.map((c: any, i: number) => (
              <div key={c.Id || i} className="bg-bg1 border border-border-dim rounded-xl p-5 flex flex-col gap-4 shadow-sm hover:border-psim-accent/30 transition-all border-psim-accent/10">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-[14px] font-bold tracking-tight text-white">{c.VmsName}</h3>
                    <p className="text-[10px] font-mono mt-1 opacity-60 uppercase text-t-2">
                      {c.IpServer}:{c.Port} · {c.Username}
                    </p>
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold px-2 py-0.5 rounded border uppercase",
                    c.Status === 'Connected' ? "bg-psim-green/10 text-psim-green border-psim-green/30" : "bg-psim-orange/10 text-psim-orange border-psim-orange/30"
                  )}>
                    {c.Status}
                  </span>
                </div>
                <div className="pt-2">
                  <div className="flex justify-between mb-1.5 font-mono">
                      <span className="text-[9px] font-bold text-t-2 uppercase">Hệ thống</span>
                      <span className="text-[9px] font-bold text-t-1">{c.VmsName}</span>
                  </div>
                  <Progress value={c.Status === 'Connected' ? 100 : 0} className="h-1 bg-bg3" indicatorClassName={c.Status === 'Connected' ? "bg-psim-green" : "bg-psim-orange"} />
                </div>
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => handleOpenDetails(c)}
                    className="flex-1 h-8 rounded bg-bg2 border border-border-dim text-[10px] font-bold uppercase hover:bg-bg3 transition-colors text-t-1"
                  >
                    Chi tiết
                  </button>
                  <button 
                    onClick={() => {
                      setDeleteConfirmModal({
                        isOpen: true,
                        id: c.Id,
                        name: c.VmsName
                      });
                    }}
                    className="flex-1 h-8 rounded bg-bg2 border border-red-900/30 text-[10px] font-bold uppercase hover:bg-psim-red/10 hover:text-psim-red transition-colors text-t-2"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
            {actualConnectors.length === 0 && (
              <div className="col-span-2 py-20 text-center opacity-30 border-2 border-dashed border-white/5 rounded-xl">
                 <Plug2 size={40} className="mx-auto mb-4" />
                 <p className="text-[12px] uppercase font-bold tracking-widest">Chưa có kết nối nào</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg0 overflow-hidden relative">
      {/* Header */}
      <div className="h-14 border-b border-border-dim bg-bg0/50 flex items-center px-6 shrink-0">
        <h1 className="font-heading text-[16px] font-bold text-t0 uppercase tracking-tight">Configuration & Administration</h1>
        <div className="ml-auto text-[10px] text-t-2 font-mono uppercase tracking-widest bg-bg2 px-3 py-1 rounded border border-border-dim text-white">
          Admin Mode — SuperUser
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[240px] border-r border-border-dim bg-bg0 flex flex-col p-4 gap-6 shrink-0 bg-bg-1">
          <div>
            <div className="text-[10px] font-bold text-t-2 uppercase tracking-[0.2em] mb-3 px-2">Nhóm 4 — Quản trị</div>
            <div className="flex flex-col gap-0.5">
              {navItems.filter(i => i.group === 'Admin').map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-all group",
                    activeSection === item.id ? "bg-psim-accent/15 text-psim-accent" : "text-t-2 hover:bg-bg2 hover:text-t-1"
                  )}
                >
                  <item.icon size={16} className={cn(activeSection === item.id ? "text-psim-accent" : "text-t-2 group-hover:text-t-1")} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-t-2 uppercase tracking-[0.2em] mb-3 px-2">Hệ thống</div>
            <div className="flex flex-col gap-0.5">
              {navItems.filter(i => i.group === 'Hệ thống').map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-all group",
                    activeSection === item.id ? "bg-psim-accent/15 text-psim-accent" : "text-t-2 hover:bg-bg2 hover:text-t-1"
                  )}
                >
                  <item.icon size={16} className={cn(activeSection === item.id ? "text-psim-accent" : "text-t-2 group-hover:text-t-1")} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-4 bg-bg2/50 border border-border-dim rounded-lg">
             <div className="flex items-center gap-2 mb-2">
                <Database size={14} className="text-psim-accent" />
                <span className="text-[10px] font-bold uppercase tracking-tight text-t-1">System Storage</span>
             </div>
             <div className="flex justify-between mb-1 text-[9px] font-mono">
                <span className="text-t-2">48TB / 64TB</span>
                <span className="text-psim-orange">75%</span>
             </div>
             <Progress value={75} className="h-1 bg-bg3" indicatorClassName="bg-psim-orange" />
          </div>
        </div>

        {/* Content Area */}
        <div className={cn(
          "flex-1 bg-bg0/10 scrollbar-thin scrollbar-thumb-bg4",
          activeSection === 'map_management' ? "overflow-hidden p-6" : "overflow-y-auto p-8"
        )}>
          <div className="w-full h-full">
            {activeSection === 'roles' && renderRoles()}
            {activeSection === 'priority' && renderPriorityTable()}
            {activeSection === 'connectors' && renderConnectors()}
            {activeSection === 'map_management' && renderMapManagement()}
            {activeSection !== 'priority' && activeSection !== 'connectors' && activeSection !== 'roles' && activeSection !== 'map_management' && (
              <div className="flex flex-col items-center justify-center py-24 opacity-20 gap-4">
                <ShieldAlert size={48} strokeWidth={1} />
                <div className="text-center">
                  <h3 className="text-[14px] font-bold uppercase tracking-widest text-white text-center">Under Construction</h3>
                  <p className="text-[11px] mt-1 italic text-white text-center">Mục "{navItems.find(i => i.id === activeSection)?.label}" đang được phát triển...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- CREATE MODAL --- */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 animate-in fade-in duration-300" onClick={() => setIsDialogOpen(false)} />
          <div className="relative w-full max-w-5xl bg-[#0d1220] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-[18px] font-bold text-white uppercase tracking-tight flex items-center gap-3">
                  <Sliders className="text-psim-accent" size={20} /> Thiết lập Priority hàng loạt
                </h3>
                <p className="text-[11px] text-t-2 mt-1">Chọn loại cảnh báo và áp dụng mức độ ưu tiên chung.</p>
                
                {/* Connected Systems List */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest self-center">Hệ thống:</span>
                  {isLoadingConnectors ? (
                    <span className="text-[9px] text-t-2 animate-pulse">Đang tải...</span>
                  ) : actualConnectors.map((c: any) => (
                    <div key={c.Id} className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      <div className={cn("w-1 h-1 rounded-full", c.Status === 'Connected' ? "bg-psim-green shadow-[0_0_4px_var(--color-psim-green)]" : "bg-psim-orange")} />
                      <span className="text-[9px] font-bold text-t-1 uppercase">{c.VmsName}</span>
                    </div>
                  ))}
                  {actualConnectors.length === 0 && !isLoadingConnectors && <span className="text-[9px] text-psim-red italic uppercase opacity-50">Chưa có kết nối</span>}
                </div>
              </div>
              <button onClick={() => setIsDialogOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-t-2 hover:text-white transition-colors shrink-0"><X size={20} /></button>
            </div>

            <div className="flex flex-col h-[550px] p-6 gap-6">
              {/* Top Control Bar (Search & Title) */}
              <div className="flex flex-col gap-4">
                <div className="text-center">
                  <h4 className="text-[13px] font-bold text-white uppercase tracking-[0.2em]">Lựa chọn các Alarms chưa cấu hình</h4>
                  <div className="h-0.5 w-12 bg-psim-accent mx-auto mt-1 rounded-full opacity-50" />
                </div>

                <div className="flex justify-center">
                  <div className="relative w-full max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-t-2" size={14} />
                    <input 
                      className="w-full bg-[#121929] border border-white/10 rounded-lg h-10 pl-10 pr-4 text-[12px] text-white outline-none focus:border-psim-accent/50 transition-all shadow-inner placeholder:text-t-2/50"
                      placeholder="Tìm kiếm sự kiện AI..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Alarm Grid Area */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-psim-accent/20 scrollbar-track-transparent hover:scrollbar-thumb-psim-accent/40 pr-2">
                <div className="grid grid-cols-3 gap-3">
                  {(() => {
                    const configuredEvents = new Set(mappings.flatMap(m => m.AnalyticsEvents));
                    const unconfiguredEvents = allEvents.filter(a => !configuredEvents.has(a.Name));
                    
                    return unconfiguredEvents
                      .filter((a: any) => a.Name.toLowerCase().includes(modalSearch.toLowerCase()))
                      .map((event: any) => (
                        <div 
                          key={event.ID}
                          onClick={() => {
                            if (basket.includes(event.Name)) setBasket(prev => prev.filter(x => x !== event.Name));
                            else setBasket(prev => [...prev, event.Name]);
                          }}
                          className={cn(
                            "p-3.5 rounded-lg border transition-all cursor-pointer flex gap-3 items-start group relative",
                            basket.includes(event.Name) 
                              ? "bg-psim-accent/10 border-psim-accent shadow-[0_0_15px_rgba(0,194,255,0.1)]" 
                              : "bg-[#121929] border-white/5 hover:bg-[#1a2236] hover:border-white/10"
                          )}
                        >
                          <div className={cn(
                            "w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors mt-0.5 shrink-0", 
                            basket.includes(event.Name) 
                              ? "bg-psim-accent border-psim-accent text-[#070b14]" 
                              : "bg-[#1a2236] border-white/10 group-hover:border-psim-accent/50"
                          )}>
                            {basket.includes(event.Name) && <Check size={12} strokeWidth={4} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[12px] text-t-1 group-hover:text-white leading-tight uppercase truncate">{event.Name}</div>
                          </div>
                          
                          {/* Selected Indicator Badge */}
                          {basket.includes(event.Name) && (
                            <div className="absolute -top-1.5 -right-1.5 bg-psim-accent text-[#070b14] text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg uppercase">
                              Selected
                            </div>
                          )}
                        </div>
                      ));
                  })()}
                </div>
                
                {allEvents.filter((a: any) => a.Name.toLowerCase().includes(modalSearch.toLowerCase())).length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                    <Search size={48} />
                    <p className="text-[12px] font-bold uppercase mt-4 tracking-widest">Không tìm thấy alarm nào</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-t-2 uppercase tracking-widest text-white">Thiết lập Priority:</span>
                  <span className="bg-psim-accent/20 text-psim-accent text-[9px] font-bold px-2 py-0.5 rounded border border-psim-accent/30 uppercase">
                    {basket.length} items selected
                  </span>
                </div>
                <div className="flex gap-2">
                  {priorities.map((p: any) => (
                    <button
                      key={p.ID}
                      onClick={() => setSelectedPriorityId(p.ID)}
                      className={cn(
                        "px-4 py-2 rounded text-[11px] font-bold border transition-all flex items-center gap-2",
                        selectedPriorityId === p.ID 
                          ? `${p.PriorityName === 'CRITICAL' ? 'bg-psim-red text-white border-transparent' : p.PriorityName === 'HIGH' ? 'bg-psim-orange text-white border-transparent' : p.PriorityName === 'MEDIUM' ? 'bg-psim-yellow text-bg0 border-transparent' : 'bg-bg4 text-t-1 border-white/20'} scale-105 shadow-xl` 
                          : "bg-[#121929] text-t-2 border-white/5 hover:border-white/20"
                      )}
                    >
                      ● {p.PriorityName}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setIsDialogOpen(false)} className="px-8 py-3 text-[11px] font-bold text-t-2 uppercase hover:text-white transition-colors">Hủy bỏ</button>
                <button 
                  onClick={handleSaveConfig} 
                  disabled={basket.length === 0 || insertMutation.isPending} 
                  className="px-12 py-3 bg-psim-accent text-bg0 font-bold text-[12px] uppercase tracking-wider rounded shadow-xl shadow-psim-accent/20 disabled:opacity-30 flex items-center gap-2 transition-all hover:scale-[1.02]"
                >
                  {insertMutation.isPending && <RefreshCcw size={14} className="animate-spin" />}
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- QUICK EDIT MODAL (UPDATE) --- */}
      {editingMapping && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 animate-in fade-in duration-200" onClick={() => setEditingMapping(null)} />
          <div className="relative w-full max-w-md bg-[#161b2e] border border-white/10 rounded-xl shadow-2xl p-6 animate-in zoom-in-95 duration-150">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h3 className="text-[16px] font-bold text-white uppercase tracking-tight">Cập nhật Priority</h3>
                   <p className="text-[11px] text-psim-accent font-mono mt-1 uppercase">{editingMapping.name}</p>
                </div>
                <button onClick={() => setEditingMapping(null)} className="text-t-2 hover:text-white"><X size={18} /></button>
             </div>

             <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Chọn mức độ mới</span>
                <div className="grid grid-cols-1 gap-2">
                   {priorities.map(p => (
                     <button
                       key={p.ID}
                       onClick={() => handleUpdateConfig(p.ID)}
                       disabled={updateMutation.isPending}
                       className={cn(
                         "flex items-center justify-between px-4 py-3 rounded-lg border transition-all group",
                         editingMapping.currentPriorityId === p.ID 
                           ? "bg-white/5 border-psim-accent/50" 
                           : "bg-black/20 border-white/5 hover:border-white/20"
                       )}
                     >
                        <div className="flex items-center gap-3">
                           <div className={cn("w-2 h-2 rounded-full", 
                             p.PriorityName === 'CRITICAL' ? 'bg-psim-red' : 
                             p.PriorityName === 'HIGH' ? 'bg-psim-orange' : 
                             p.PriorityName === 'MEDIUM' ? 'bg-psim-yellow' : 'bg-t2'
                           )} />
                           <span className={cn("text-[12px] font-bold", 
                             editingMapping.currentPriorityId === p.ID ? "text-white" : "text-t-2 group-hover:text-t-1"
                           )}>{p.PriorityName}</span>
                        </div>
                        {editingMapping.currentPriorityId === p.ID && <Check size={14} className="text-psim-accent" />}
                        {updateMutation.isPending && <RefreshCcw size={14} className="animate-spin opacity-50" />}
                     </button>
                   ))}
                </div>
             </div>

             <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setEditingMapping(null)}
                  className="px-6 py-2 text-[11px] font-bold text-t-2 uppercase hover:text-white transition-colors"
                >
                  Đóng
                </button>
             </div>
          </div>
        </div>
      )}
      {/* --- ADD CONNECTOR MODAL --- */}
      {isConnectorDialogOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 animate-in fade-in duration-200" onClick={() => setIsConnectorDialogOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#161b2e] border border-white/10 rounded-xl shadow-2xl p-8 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-[18px] font-bold text-white uppercase tracking-tight">
                  {isViewingDetails ? 'Chi tiết Connector' : 'Thêm Connector Mới'}
                </h3>
                <p className="text-[11px] text-t-2 mt-1">
                  {isViewingDetails ? 'Thông tin cấu hình hệ thống hiện tại' : 'Kết nối hệ thống ngoại vi (VMS, ACS, LPR...)'}
                </p>
              </div>
              <button onClick={() => setIsConnectorDialogOpen(false)} className="text-t-2 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Chọn hệ thống VMS</label>
                <select 
                  className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-accent/50 transition-all appearance-none cursor-pointer"
                  value={newConnector.vmsId}
                  onChange={(e) => {
                    const selectedVms = vmsList.find(v => v.VmsId === parseInt(e.target.value));
                    setNewConnector({
                      ...newConnector, 
                      vmsId: parseInt(e.target.value),
                      name: selectedVms?.VmsName || ''
                    });
                  }}
                >
                  <option value={0} disabled className="bg-[#161b2e]">-- Chọn VMS --</option>
                  {vmsList
                    .filter(vms => !actualConnectors.some((c: any) => c.VmsName === vms.VmsName))
                    .map((vms) => (
                      <option key={vms.VmsId} value={vms.VmsId} className="bg-[#161b2e]">
                        {vms.VmsName}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">IP Server</label>
                  <input 
                    className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-accent/50 transition-all font-mono"
                    placeholder="192.168.1.100"
                    value={newConnector.ip}
                    onChange={(e) => setNewConnector({...newConnector, ip: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Port</label>
                  <input 
                    className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-accent/50 transition-all font-mono"
                    placeholder="8080"
                    value={newConnector.port}
                    onChange={(e) => setNewConnector({...newConnector, port: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Tài khoản</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                  <input 
                    className="w-full bg-black/20 border border-white/10 rounded-lg h-11 pl-11 pr-4 text-[13px] text-white outline-none focus:border-psim-accent/50 transition-all"
                    placeholder="admin"
                    value={newConnector.username}
                    onChange={(e) => setNewConnector({...newConnector, username: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-black/20 border border-white/10 rounded-lg h-11 pl-11 pr-11 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all"
                    placeholder="••••••••"
                    value={newConnector.password}
                    onChange={(e) => setNewConnector({...newConnector, password: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-t-2 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-3">
              <button 
                onClick={() => setIsConnectorDialogOpen(false)}
                className="flex-1 h-10 rounded-lg text-[11px] font-bold text-t-2 uppercase border border-white/10 hover:bg-white/5 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => connectorMutation.mutate({
                  IpServer: newConnector.ip,
                  Port: parseInt(newConnector.port),
                  Username: newConnector.username,
                  Password: newConnector.password,
                  VMSID: newConnector.vmsId
                })}
                disabled={connectorMutation.isPending || newConnector.vmsId === 0 || !newConnector.ip}
                className="flex-1 h-10 bg-psim-accent text-bg0 rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-psim-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connectorMutation.isPending && <RefreshCcw size={14} className="animate-spin" />}
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setDeleteConfirmModal(prev => ({ ...prev, isOpen: false }))} />
          <div className="relative w-full max-sm bg-[#161b2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-psim-red/20 text-psim-red flex items-center justify-center mb-6 shadow-lg shadow-psim-red/10 animate-pulse">
                <Trash2 size={40} />
              </div>
              
              <h3 className="text-[18px] font-bold text-white uppercase tracking-tight mb-2">
                Xác nhận xóa
              </h3>
              
              <p className="text-[13px] text-t-2 leading-relaxed mb-8 px-4">
                Bạn có chắc chắn muốn gỡ bỏ connector <span className="text-white font-bold">"{deleteConfirmModal.name}"</span>?
              </p>
              
              <div className="w-full flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 h-12 rounded-xl text-[12px] font-bold text-t-2 uppercase border border-white/10 hover:bg-white/5 transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => deleteConnectorMutation.mutate(deleteConfirmModal.id)}
                  disabled={deleteConnectorMutation.isPending}
                  className="flex-[2] h-12 bg-psim-red text-white rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-psim-red/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteConnectorMutation.isPending && <RefreshCcw size={14} className="animate-spin" />}
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- RESPONSE NOTIFICATION MODAL --- */}
      {responseModal.isOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setResponseModal(prev => ({ ...prev, isOpen: false }))} />
          <div className="relative w-full max-w-sm bg-[#161b2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg",
                responseModal.status === 1 ? "bg-psim-green/20 text-psim-green shadow-psim-green/10" : "bg-psim-red/20 text-psim-red shadow-psim-red/10"
              )}>
                {responseModal.status === 1 ? <CheckCircle2 size={40} /> : <ShieldAlert size={40} />}
              </div>
              
              <h3 className="text-[18px] font-bold text-white uppercase tracking-tight mb-2">
                {responseModal.status === 1 ? 'Thành công' : 'Thông báo lỗi'}
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

      {/* --- ADD USER MODAL --- */}
      {isAddUserDialogOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 animate-in fade-in duration-200" onClick={() => setIsAddUserDialogOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#161b2e] border border-white/10 rounded-xl shadow-2xl p-8 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-[18px] font-bold text-white uppercase tracking-tight">Thêm Người Dùng Mới</h3>
                <p className="text-[11px] text-t-2 mt-1">Cấp tài khoản truy cập hệ thống Light Insight</p>
              </div>
              <button onClick={() => setIsAddUserDialogOpen(false)} className="text-t-2 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Tài khoản (Username) <span className="text-psim-red">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                    <input 
                      className="w-full bg-black/20 border border-white/10 rounded-lg h-11 pl-11 pr-4 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all font-mono"
                      placeholder="vd: hung.tran"
                      value={newUserData.username}
                      onChange={(e) => setNewUserData({...newUserData, username: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Mật khẩu <span className="text-psim-red">*</span></label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-black/20 border border-white/10 rounded-lg h-11 pl-11 pr-11 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all"
                      placeholder="••••••••"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-t-2 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Họ và tên</label>
                <input 
                  className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all"
                  placeholder="vd: Trần Hùng"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Email liên hệ</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                  <input 
                    className="w-full bg-black/20 border border-white/10 rounded-lg h-11 pl-11 pr-4 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all"
                    placeholder="hung.tran@lightjsc.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-2" size={16} />
                    <input 
                      className="w-full bg-black/20 border border-white/10 rounded-lg h-11 pl-11 pr-4 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all font-mono"
                      placeholder="0987..."
                      value={newUserData.phone}
                      onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Vai trò (Role) <span className="text-psim-red">*</span></label>
                  <select 
                    className="w-full bg-black/20 border border-white/10 rounded-lg h-11 px-4 text-[13px] text-white outline-none focus:border-psim-accent2/50 transition-all appearance-none cursor-pointer"
                    value={newUserData.roleId}
                    onChange={(e) => setNewUserData({...newUserData, roleId: e.target.value})}
                  >
                    <option value="" disabled className="bg-[#161b2e]">-- Chọn vai trò --</option>
                    {allRoles.map((r: any) => (
                      <option key={r.Id} value={r.Id} className="bg-[#161b2e]">{r.Name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-t-2 uppercase tracking-widest px-1">Trạng thái</label>
                <div className="flex gap-4 p-1">
                  <button 
                    onClick={() => setNewUserData({...newUserData, status: 'Active'})}
                    className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-bold transition-all", newUserData.status === 'Active' ? "bg-psim-green/20 border-psim-green text-psim-green" : "bg-black/20 border-white/10 text-t-2")}
                  >
                    <div className={cn("w-2 h-2 rounded-full", newUserData.status === 'Active' ? "bg-psim-green" : "bg-t2")} /> Active
                  </button>
                  <button 
                    onClick={() => setNewUserData({...newUserData, status: 'Inactive'})}
                    className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-bold transition-all", newUserData.status === 'Inactive' ? "bg-psim-red/20 border-psim-red text-psim-red" : "bg-black/20 border-white/10 text-t-2")}
                  >
                    <div className={cn("w-2 h-2 rounded-full", newUserData.status === 'Inactive' ? "bg-psim-red" : "bg-t2")} /> Inactive
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3 border-t border-white/5 pt-8">
              <button 
                onClick={() => setIsAddUserDialogOpen(false)}
                className="flex-1 h-11 rounded-xl text-[11px] font-bold text-t-2 uppercase border border-white/10 hover:bg-white/5 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleRegisterUser}
                disabled={registerMutation.isPending}
                className="flex-[2] h-11 bg-psim-accent2 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-psim-accent2/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {registerMutation.isPending && <RefreshCcw size={14} className="animate-spin" />}
                Tạo người dùng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
