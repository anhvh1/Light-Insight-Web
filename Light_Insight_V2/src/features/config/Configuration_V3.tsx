import { useState, useEffect } from 'react';
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
  Database,
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Search,
  ShieldAlert,
  X,
  Check
} from 'lucide-react';
import { StatusPill } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { priorityApi } from '@/lib/priority-api';
import type { Priority } from '@/types';

type ConfigSection = 'roles' | 'rules' | 'sop' | 'connectors' | 'escalation' | 'notif' | 'priority';

const CONNECTORS = [
  {
    name: 'Milestone XProtect',
    desc: 'Corporate v2024.1 · REST + MIP SDK',
    latency: '18ms',
    stats: '47 / 52 Cameras',
    load: 142,
    status: 'ONLINE',
    health: 90,
    color: 'text-psim-green',
    borderColor: 'border-psim-green/20'
  },
  {
    name: 'BioStar2 ACS',
    desc: 'Suprema · REST API · :443',
    latency: '32ms',
    stats: '24 / 24 Doors',
    load: 18,
    status: 'ONLINE',
    health: 100,
    color: 'text-psim-accent',
    borderColor: 'border-psim-accent/20'
  },
  {
    name: 'Futech LPR',
    desc: 'Parking · REST API · :8080',
    latency: '87ms',
    stats: '2 / 2 Barriers',
    load: 6,
    status: 'SLOW',
    health: 65,
    color: 'text-psim-orange',
    borderColor: 'border-psim-orange/20',
    warn: true
  },
  {
    name: 'BMS Portal',
    desc: 'REST API · Webhook · :443',
    latency: '45ms',
    stats: '8 / 8 Zones',
    load: 4,
    status: 'ONLINE',
    health: 100,
    color: 'text-purple',
    borderColor: 'border-purple/20'
  }
];

export function Configuration_V3() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<ConfigSection>('roles');
  
  // --- API DATA FETCHING ---
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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [basket, setBasket] = useState<string[]>([]);
  const [selectedPriorityId, setSelectedPriorityId] = useState<number>(2);
  const [modalSearch, setModalSearch] = useState('');
  
  // State cho việc chỉnh sửa nhanh (Update)
  const [editingMapping, setEditingMapping] = useState<{ id: number; name: string; currentPriorityId: number } | null>(null);

  const navItems = [
    { id: 'roles', label: 'User & Roles', icon: Users, group: 'Admin' },
    { id: 'rules', label: 'Rule & Alarm Config', icon: Zap, group: 'Admin' },
    { id: 'priority', label: 'Alarm Priority', icon: Sliders, group: 'Admin' },
    { id: 'sop', label: 'SOP Builder', icon: ClipboardList, group: 'Admin' },
    { id: 'connectors', label: 'Connectors', icon: Plug2, group: 'Admin' },
    { id: 'escalation', label: 'Escalation Rules', icon: ShieldCheck, group: 'Hệ thống' },
    { id: 'notif', label: 'Notifications', icon: BellRing, group: 'Hệ thống' },
  ];

  useEffect(() => {
    if (isDialogOpen || editingMapping) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [isDialogOpen, editingMapping]);

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

  const renderPriorityTable = () => {
    const tableData = mappings.flatMap(m => 
      m.AnalyticsEvents.map(evtName => ({
        mappingId: m.ID,
        label: evtName,
        priority: m.PriorityName.toLowerCase() as Priority,
        priorityId: m.PriorityID
      }))
    );

    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-heading font-bold text-t0 text-white uppercase tracking-tight">Alarm Priority Management (Live API)</h2>
            <p className="text-[12px] text-t2 mt-1">Quản lý các quy tắc phân loại mức độ nghiêm trọng cho từng sự kiện AI</p>
          </div>
          <button 
            onClick={() => { setBasket([]); setIsDialogOpen(true); }}
            className="bg-psim-accent text-bg0 font-bold text-[11px] uppercase tracking-wider gap-2 h-10 px-6 rounded-md flex items-center shadow-lg shadow-psim-accent/20 hover:scale-[1.02] transition-all"
          >
            <Plus size={16} /> Tạo cấu hình mới
          </button>
        </div>

        <div className="bg-[#0d1220] border border-border-dim rounded-lg overflow-hidden shadow-sm">
          {isLoadingMappings ? (
            <div className="py-24 text-center animate-pulse flex flex-col items-center gap-3">
               <RefreshCcw className="animate-spin text-psim-accent" />
               <span className="text-t2 font-mono text-[11px] uppercase tracking-widest">Đang đồng bộ dữ liệu API...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#121929] border-b border-border-dim">
                  <th className="py-4 px-6 text-[10px] font-mono text-t2 uppercase tracking-widest w-16 text-center">STT</th>
                  <th className="py-4 px-2 text-[10px] font-mono text-t2 uppercase tracking-widest">Analytics Event Name</th>
                  <th className="py-4 px-4 text-[10px] font-mono text-t2 uppercase tracking-widest w-48 text-center">Assigned Priority</th>
                  <th className="py-4 px-6 text-[10px] font-mono text-t2 uppercase tracking-widest w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dim/30">
                {tableData.map((c, index) => (
                  <tr key={`${c.mappingId}-${index}`} className="hover:bg-psim-accent/2 transition-colors group h-16 bg-[#0d1220]">
                    <td className="py-3 px-6 font-mono text-[11px] text-t2 text-center opacity-50">{index + 1}</td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-[13px] text-t1 group-hover:text-psim-accent transition-colors uppercase whitespace-nowrap overflow-hidden text-ellipsis">{c.label}</div>
                      <div className="text-[9px] font-mono text-t2 mt-1 opacity-40 uppercase tracking-tighter">Mapping ID: #{c.mappingId}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                       <div className="flex justify-center">
                          <StatusPill priority={c.priority} className="w-32 shadow-lg uppercase" />
                       </div>
                    </td>
                    <td className="py-3 px-6 text-right">
                       <div className="flex justify-end gap-1.5 opacity-20 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-2">
                          <button 
                            className="w-9 h-9 rounded bg-bg2 border border-border-dim flex items-center justify-center text-t2 hover:text-psim-accent transition-colors shadow-sm"
                            onClick={() => setEditingMapping({ id: c.mappingId, name: c.label, currentPriorityId: c.priorityId })}
                            title="Đổi Priority"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="w-9 h-9 rounded bg-bg2 border border-border-dim flex items-center justify-center text-t2 hover:text-psim-red transition-colors"
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
                          <span className="text-[12px] uppercase font-bold tracking-[0.2em]">Hệ thống chưa có cấu hình nào</span>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const renderConnectors = () => (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-heading font-bold text-t0">VMS & Device Connectors (4.3)</h2>
          <p className="text-[12px] text-t2">Trạng thái kết nối API tới các hệ thống ngoại vi</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-1.5 bg-bg2 border border-border-dim rounded text-[11px] font-bold text-t1 hover:bg-bg3 transition-colors">+ Thêm Connector</button>
          <button className="px-4 py-1.5 bg-bg2 border border-border-dim rounded text-[11px] font-bold text-t1 hover:bg-bg3 transition-colors flex items-center gap-2">
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {CONNECTORS.map((c, i) => (
          <div key={i} className={cn("bg-bg1 border border-border-dim rounded-xl p-5 flex flex-col gap-4 shadow-sm hover:border-psim-accent/30 transition-all", c.borderColor)}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className={cn("text-[14px] font-bold tracking-tight", c.color)}>{c.name}</h3>
                <p className="text-[10px] font-mono mt-1 opacity-60 uppercase">{c.desc}</p>
              </div>
              <span className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded border uppercase",
                c.status === 'ONLINE' ? "bg-psim-green/10 text-psim-green border-psim-green/30" : "bg-psim-orange/10 text-psim-orange border-psim-orange/30"
              )}>
                {c.status}
              </span>
            </div>
            <div className="pt-2">
               <div className="flex justify-between mb-1.5 font-mono">
                  <span className="text-[9px] font-bold text-t2 uppercase">Health</span>
                  <span className="text-[9px] font-bold text-t1">{c.health}%</span>
               </div>
               <Progress value={c.health} className="h-1 bg-bg3" indicatorClassName={c.warn ? "bg-psim-orange" : "bg-psim-accent"} />
            </div>
            <div className="flex gap-2 mt-2">
               <button className="flex-1 h-8 rounded bg-bg2 border border-border-dim text-[10px] font-bold uppercase hover:bg-bg3 transition-colors">Cấu hình</button>
               <button className="flex-1 h-8 rounded bg-bg2 border border-border-dim text-[10px] font-bold uppercase hover:bg-bg3 transition-colors">Kết nối</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg0 overflow-hidden relative">
      {/* Header */}
      <div className="h-14 border-b border-border-dim bg-bg0/50 flex items-center px-6 shrink-0">
        <h1 className="font-heading text-[16px] font-bold text-t0 uppercase tracking-tight">Configuration & Administration</h1>
        <div className="ml-auto text-[10px] text-t2 font-mono uppercase tracking-widest bg-bg2 px-3 py-1 rounded border border-border-dim text-white">
          Admin Mode — SuperUser
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-60 border-r border-border-dim bg-bg0 flex flex-col p-4 gap-6 shrink-0">
          <div>
            <div className="text-[10px] font-bold text-t2 uppercase tracking-[0.2em] mb-3 px-2">Nhóm 4 — Quản trị</div>
            <div className="flex flex-col gap-0.5">
              {navItems.filter(i => i.group === 'Admin').map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-all group",
                    activeSection === item.id ? "bg-psim-accent/15 text-psim-accent" : "text-t2 hover:bg-bg2 hover:text-t1"
                  )}
                >
                  <item.icon size={16} className={cn(activeSection === item.id ? "text-psim-accent" : "text-t2 group-hover:text-t1")} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-t2 uppercase tracking-[0.2em] mb-3 px-2">Hệ thống</div>
            <div className="flex flex-col gap-0.5">
              {navItems.filter(i => i.group === 'Hệ thống').map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-all group",
                    activeSection === item.id ? "bg-psim-accent/15 text-psim-accent" : "text-t2 hover:bg-bg2 hover:text-t1"
                  )}
                >
                  <item.icon size={16} className={cn(activeSection === item.id ? "text-psim-accent" : "text-t2 group-hover:text-t1")} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-4 bg-bg2/50 border border-border-dim rounded-lg">
             <div className="flex items-center gap-2 mb-2">
                <Database size={14} className="text-psim-accent" />
                <span className="text-[10px] font-bold uppercase tracking-tight text-t1">System Storage</span>
             </div>
             <div className="flex justify-between mb-1 text-[9px] font-mono">
                <span className="text-t2">48TB / 64TB</span>
                <span className="text-psim-orange">75%</span>
             </div>
             <Progress value={75} className="h-1 bg-bg3" indicatorClassName="bg-psim-orange" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-bg0/10 scrollbar-thin scrollbar-thumb-bg4">
          <div className="max-w-[1100px]">
            {activeSection === 'priority' && renderPriorityTable()}
            {activeSection === 'connectors' && renderConnectors()}
            {activeSection !== 'priority' && activeSection !== 'connectors' && (
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
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 animate-in fade-in duration-300" onClick={() => setIsDialogOpen(false)} />
          <div className="relative w-full max-w-6xl bg-[#0d1220] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 bg-white/2 flex items-center justify-between">
              <div>
                <h3 className="text-[18px] font-bold text-white uppercase tracking-tight flex items-center gap-3">
                  <Sliders className="text-psim-accent" size={20} /> Thiết lập Priority hàng loạt
                </h3>
                <p className="text-[11px] text-t2 mt-1">Chọn loại cảnh báo và áp dụng mức độ ưu tiên chung.</p>
              </div>
              <button onClick={() => setIsDialogOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-t2 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="flex h-[550px]">
              <div className="w-72 border-r border-white/5 bg-black/40 p-6 flex flex-col gap-6">
                <div className="space-y-3 text-white">
                  <label className="text-[10px] font-bold text-t2 uppercase tracking-widest">Tìm kiếm nhanh</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-t2" size={14} />
                    <input 
                      className="w-full bg-[#121929] border border-white/10 rounded-md h-10 pl-10 pr-3 text-[12px] text-white outline-none focus:border-psim-accent/50"
                      placeholder="Nhập tên sự kiện..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-auto pt-5 border-t border-white/5 flex flex-col gap-3 overflow-hidden text-white">
                  <div className="text-[10px] text-t2 font-bold uppercase flex justify-between"><span>Đã chọn</span><span className="text-psim-accent">{basket.length}</span></div>
                  <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-bg4">
                    {basket.map(name => (
                      <span key={name} className="flex items-center gap-2 bg-[#1a2236] border border-white/10 px-2 py-1 rounded text-[9px] text-t1 font-mono uppercase group">
                        {name} 
                        <X size={12} className="cursor-pointer hover:text-psim-red" onClick={() => setBasket(prev => prev.filter(x => x !== name))} />
                      </span>
                    ))}
                    {basket.length === 0 && <span className="text-[10px] text-t2 italic opacity-30 py-4 text-center w-full uppercase">Chưa chọn alarm nào</span>}
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 bg-white/1 overflow-y-auto scrollbar-thin scrollbar-thumb-bg4">
                <div className="grid grid-cols-2 gap-3">
                  {allEvents.filter(a => a.Name.toLowerCase().includes(modalSearch.toLowerCase())).map(event => (
                    <div 
                      key={event.ID}
                      onClick={() => {
                        if (basket.includes(event.Name)) setBasket(prev => prev.filter(x => x !== event.Name));
                        else setBasket(prev => [...prev, event.Name]);
                      }}
                      className={cn(
                        "p-4 rounded-lg border transition-all cursor-pointer flex gap-4 items-start group",
                        basket.includes(event.Name) ? "bg-psim-accent/10 border-psim-accent/50 shadow-xl" : "bg-[#121929] border-white/5 hover:bg-[#1a2236]"
                      )}
                    >
                      <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors mt-0.5 shrink-0", basket.includes(event.Name) ? "bg-psim-accent border-psim-accent text-[#070b14]" : "bg-[#1a2236] border-white/10 group-hover:border-psim-accent/50")}>
                        {basket.includes(event.Name) && <Plus size={14} strokeWidth={3} className="rotate-45" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[13px] text-t1 group-hover:text-white leading-tight uppercase whitespace-nowrap overflow-hidden text-ellipsis">{event.Name}</div>
                        <div className="text-[9px] font-mono text-t2 uppercase mt-1 opacity-50 truncate">{event.ID}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-white/2 flex items-center justify-between">
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-t2 uppercase tracking-widest text-white">Chọn mức Priority áp dụng chung:</span>
                <div className="flex gap-2">
                  {priorities.map(p => (
                    <button
                      key={p.ID}
                      onClick={() => setSelectedPriorityId(p.ID)}
                      className={cn(
                        "px-4 py-2 rounded text-[11px] font-bold border transition-all flex items-center gap-2",
                        selectedPriorityId === p.ID 
                          ? `${p.PriorityName === 'CRITICAL' ? 'bg-psim-red text-white border-transparent' : p.PriorityName === 'HIGH' ? 'bg-psim-orange text-white border-transparent' : p.PriorityName === 'MEDIUM' ? 'bg-psim-yellow text-bg0 border-transparent' : 'bg-bg4 text-t1 border-white/20'} scale-105 shadow-xl` 
                          : "bg-[#121929] text-t2 border-white/5 hover:border-white/20"
                      )}
                    >
                      ● {p.PriorityName}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setIsDialogOpen(false)} className="px-8 py-3 text-[11px] font-bold text-t2 uppercase hover:text-white transition-colors">Hủy bỏ</button>
                <button 
                  onClick={handleSaveConfig} 
                  disabled={basket.length === 0 || insertMutation.isPending} 
                  className="px-12 py-3 bg-psim-accent text-bg0 font-bold text-[12px] uppercase tracking-wider rounded shadow-xl shadow-psim-accent/20 disabled:opacity-30 flex items-center gap-2 transition-all hover:scale-[1.02]"
                >
                  {insertMutation.isPending && <RefreshCcw size={14} className="animate-spin" />}
                  Lưu cấu hình mới
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- QUICK EDIT MODAL (UPDATE) --- */}
      {editingMapping && (
        <div className="fixed inset-0 z-9998 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 animate-in fade-in duration-200" onClick={() => setEditingMapping(null)} />
          <div className="relative w-full max-w-md bg-[#161b2e] border border-white/10 rounded-xl shadow-2xl p-6 animate-in zoom-in-95 duration-150">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h3 className="text-[16px] font-bold text-white uppercase tracking-tight">Cập nhật Priority</h3>
                   <p className="text-[11px] text-psim-accent font-mono mt-1 uppercase">{editingMapping.name}</p>
                </div>
                <button onClick={() => setEditingMapping(null)} className="text-t2 hover:text-white"><X size={18} /></button>
             </div>

             <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-t2 uppercase tracking-widest px-1">Chọn mức độ mới</span>
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
                             editingMapping.currentPriorityId === p.ID ? "text-white" : "text-t2 group-hover:text-t1"
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
                  className="px-6 py-2 text-[11px] font-bold text-t2 uppercase hover:text-white transition-colors"
                >
                  Đóng
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
