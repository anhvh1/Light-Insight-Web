import { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { StatusPill } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import type { Priority } from '@/types';

type ConfigSection = 'roles' | 'rules' | 'sop' | 'connectors' | 'escalation' | 'notif' | 'priority';

const ALARM_MASTER_DATA = [
  { id: 'AI_MOTION', label: 'Motion Detected', group: 'VMS & AI', desc: 'Phát hiện chuyển động trong vùng cấm' },
  { id: 'AI_LOITER', label: 'Loitering', group: 'VMS & AI', desc: 'Lảng vảng quá thời gian quy định' },
  { id: 'AI_WRONG_DIR', label: 'Wrong Direction', group: 'VMS & AI', desc: 'Di chuyển ngược chiều' },
  { id: 'AI_PARK_VIO', label: 'Parking Violation', group: 'VMS & AI', desc: 'Đỗ xe sai vị trí / quá giờ' },
  { id: 'LPR_BLACKLIST', label: 'Blacklisted Plate', group: 'LPR', desc: 'Biển số nằm trong danh sách đen' },
  { id: 'LPR_UNREG', label: 'Unregistered Vehicle', group: 'LPR', desc: 'Xe chưa đăng ký đi vào' },
  { id: 'ACS_FORCED', label: 'Door Forced Open', group: 'Access Control', desc: 'Cửa bị phá khóa cưỡng bức' },
  { id: 'ACS_DENIED', label: 'Access Denied (3x)', group: 'Access Control', desc: 'Từ chối quẹt thẻ quá 3 lần' },
  { id: 'FIRE_ALARM', label: 'Fire Alarm', group: 'Fire & Safety', desc: 'Tín hiệu báo cháy trung tâm' },
  { id: 'SMOKE_DET', label: 'Smoke Detected', group: 'Fire & Safety', desc: 'Phát hiện khói khu vực server' },
  { id: 'BMS_OFFLINE', label: 'Device Offline', group: 'BMS', desc: 'Thiết bị hạ tầng mất kết nối' },
];

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

interface ConfigEntry {
  alarmId: string;
  priority: Priority;
}

export function Configuration_V3() {
  const [activeSection, setActiveSection] = useState<ConfigSection>('priority');
  
  // State chính cho Priority
  const [configs, setConfigs] = useState<ConfigEntry[]>([
    { alarmId: 'FIRE_ALARM', priority: 'critical' },
    { alarmId: 'ACS_FORCED', priority: 'critical' },
    { alarmId: 'LPR_BLACKLIST', priority: 'high' },
    { alarmId: 'AI_MOTION', priority: 'medium' },
    { alarmId: 'BMS_OFFLINE', priority: 'low' },
  ]);

  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  
  // State trong Modal
  const [basket, setBasket] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<Priority>('medium');
  const [modalSearch, setModalSearch] = useState('');
  const [modalGroupFilter, setModalGroupFilter] = useState('all');

  const groups = Array.from(new Set(ALARM_MASTER_DATA.map(a => a.group)));

  const navItems = [
    { id: 'roles', label: 'User & Roles', icon: Users, group: 'Admin' },
    { id: 'rules', label: 'Rule & Alarm Config', icon: Zap, group: 'Admin' },
    { id: 'priority', label: 'Alarm Priority', icon: Sliders, group: 'Admin' },
    { id: 'sop', label: 'SOP Builder', icon: ClipboardList, group: 'Admin' },
    { id: 'connectors', label: 'Connectors', icon: Plug2, group: 'Admin' },
    { id: 'escalation', label: 'Escalation Rules', icon: ShieldCheck, group: 'Hệ thống' },
    { id: 'notif', label: 'Notifications', icon: BellRing, group: 'Hệ thống' },
  ];

  const handleDelete = (id: string) => {
    setConfigs(prev => prev.filter(c => c.alarmId !== id));
  };

  const handleSaveConfig = () => {
    const newConfigs = basket.map(id => ({ alarmId: id, priority: selectedPriority }));
    setConfigs(prev => {
      const filtered = prev.filter(p => !basket.includes(p.alarmId));
      return [...filtered, ...newConfigs];
    });
    setBasket([]);
    setShowModal(false);
  };

  useEffect(() => {
    if (showModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [showModal]);

  const renderPriorityV3 = () => {
    const filteredConfigs = configs.filter(c => {
      if (groupFilter === 'all') return true;
      const alarm = ALARM_MASTER_DATA.find(a => a.id === c.alarmId);
      return alarm?.group === groupFilter;
    });

    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-heading font-bold text-t0">Alarm Priority Management</h2>
            <p className="text-[12px] text-t2">Quy trình thiết lập Priority hàng loạt sử dụng Tailwind Native Engine</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-psim-accent text-bg0 font-bold text-[11px] uppercase tracking-wider gap-2 h-9 px-6 rounded-md flex items-center shadow-lg shadow-psim-accent/20 hover:scale-[1.02] transition-transform"
          >
            <Plus size={16} /> Tạo cấu hình
          </button>
        </div>

        {/* Toolbar Lọc */}
        <div className="flex items-center gap-3 p-3 bg-bg1 border border-border-dim rounded-lg">
           {/* <div className="flex items-center gap-2 text-t2">
              <Filter size={14} />
              <span className="text-[11px] font-bold uppercase tracking-widest">Lọc theo nhóm:</span>
           </div>
           <div className="flex gap-1">
              <button 
                className={cn("px-3 py-1 rounded text-[10px] font-bold border transition-all", groupFilter === 'all' ? "bg-psim-accent/15 text-psim-accent border-psim-accent/30" : "bg-bg2 text-t2 border-border-dim hover:bg-bg3")}
                onClick={() => setGroupFilter('all')}
              >
                TẤT CẢ
              </button>
              {groups.map(g => (
                <button 
                  key={g}
                  className={cn("px-3 py-1 rounded text-[10px] font-bold border transition-all uppercase", groupFilter === g ? "bg-psim-accent/15 text-psim-accent border-psim-accent/30" : "bg-bg2 text-t2 border-border-dim hover:bg-bg3")}
                  onClick={() => setGroupFilter(g)}
                >
                  {g}
                </button>
              ))}
           </div> */}
           <div className="text-[10px] text-t2 font-mono uppercase tracking-tight">
              Tổng số: {filteredConfigs.length}
           </div>
        </div>

        {/* Bảng danh sách */}
        <div className="bg-bg1 border border-border-dim rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg2/50 border-b border-border-dim">
                <th className="py-3.5 px-4 text-[10px] font-mono text-t2 uppercase tracking-widest w-16">STT</th>
                <th className="py-3.5 px-4 text-[10px] font-mono text-t2 uppercase tracking-widest">Alarm Type & Description</th>
                {/* <th className="py-3.5 px-4 text-[10px] font-mono text-t2 uppercase tracking-widest w-48 text-center">System Group</th> */}
                <th className="py-3.5 px-4 text-[10px] font-mono text-t2 uppercase tracking-widest w-48 text-center">Priority</th>
                <th className="py-3.5 px-4 text-[10px] font-mono text-t2 uppercase tracking-widest w-24 text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dim/30">
              {filteredConfigs.map((c, index) => {
                const alarm = ALARM_MASTER_DATA.find(a => a.id === c.alarmId);
                return (
                  <tr key={c.alarmId} className="hover:bg-bg2/30 transition-colors group h-14">
                    <td className="py-3 px-4 font-mono text-[11px] text-t2">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[13px] text-t1 group-hover:text-psim-accent transition-colors">{alarm?.label || c.alarmId}</div>
                      <div className="text-[10px] text-t2 mt-0.5 opacity-70">{alarm?.desc}</div>
                    </td>
                    {/* <td className="py-3 px-4 text-center">
                       <span className="px-2 py-0.5 rounded bg-bg3 text-t2 border border-border-dim text-[9px] font-mono font-bold uppercase inline-block">{alarm?.group || 'Unset'}</span>
                    </td> */}
                    <td className="py-3 px-4">
                       <div className="flex justify-center">
                          <StatusPill priority={c.priority} className="w-32" />
                       </div>
                    </td>
                    <td className="py-3 px-4 text-right pr-6">
                       <div className="flex justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button className="w-8 h-8 rounded flex items-center justify-center text-t2 hover:text-psim-accent hover:bg-bg3" title="Sửa"><Edit2 size={14} /></button>
                          <button 
                            className="w-8 h-8 rounded flex items-center justify-center text-t2 hover:text-psim-red hover:bg-bg3" 
                            title="Xóa"
                            onClick={() => handleDelete(c.alarmId)}
                          ><Trash2 size={14} /></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderConnectors = () => (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-heading font-bold text-t0">VMS & Device Connectors (4.3)</h2>
          <p className="text-[12px] text-t2">Quản lý kết nối API và trạng thái đồng bộ hóa thiết bị ngoại vi</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-1.5 bg-bg2 border border-border-dim rounded text-[11px] font-bold text-t1 hover:bg-bg3 transition-colors">+ Thêm Connector</button>
          <button className="px-4 py-1.5 bg-bg2 border border-border-dim rounded text-[11px] font-bold text-t1 hover:bg-bg3 transition-colors flex items-center gap-2">
            <RefreshCcw size={14} /> Refresh Now
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
            
            <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-t2 font-bold uppercase tracking-widest opacity-50">Latency</span>
                  <span className={cn("text-[12px] font-bold font-mono", c.warn ? "text-psim-orange" : "text-psim-green")}>{c.latency}</span>
               </div>
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-t2 font-bold uppercase tracking-widest opacity-50">Devices Sync</span>
                  <span className="text-[12px] font-bold text-t1">{c.stats}</span>
               </div>
            </div>

            <div className="pt-2">
               <div className="flex justify-between mb-1.5">
                  <span className="text-[9px] font-bold text-t2 uppercase tracking-tight">Sync Health</span>
                  <span className="text-[9px] font-bold text-t1 font-mono">{c.health}%</span>
               </div>
               <Progress value={c.health} className="h-1 bg-bg3" indicatorClassName={c.warn ? "bg-psim-orange" : "bg-psim-accent"} />
            </div>

            <div className="flex gap-2 mt-2">
               <button className="flex-1 h-8 rounded bg-bg2 border border-border-dim text-[10px] font-bold uppercase tracking-wider hover:bg-bg3 transition-colors">Cấu hình</button>
               <button className="flex-1 h-8 rounded bg-bg2 border border-border-dim text-[10px] font-bold uppercase tracking-wider hover:bg-bg3 transition-colors">Kết nối</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <h3 className="text-[13px] font-bold text-t0 mb-4 flex items-center gap-2">
          <Activity size={16} className="text-psim-accent" /> Network Topology
        </h3>
        <div className="bg-bg1 border border-border-dim border-dashed rounded-lg p-12 flex flex-col items-center justify-center opacity-30">
           <Globe size={40} className="text-t2 mb-3" />
           <span className="text-[11px] uppercase font-bold tracking-[0.2em]">Network Map Simulation</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg0 overflow-hidden relative">
      {/* Header */}
      <div className="h-14 border-b border-border-dim bg-bg0/50 flex items-center px-6 shrink-0">
        <h1 className="font-heading text-[16px] font-bold text-t0 uppercase tracking-tight">Configuration & Administration</h1>
        <div className="ml-auto text-[10px] text-t2 font-mono uppercase tracking-widest bg-bg2 px-3 py-1 rounded border border-border-dim">
          Admin Mode — SuperUser
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[240px] border-r border-border-dim bg-bg0 flex flex-col p-4 gap-6">
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
            {activeSection === 'priority' && renderPriorityV3()}
            {activeSection === 'connectors' && renderConnectors()}
            {activeSection !== 'priority' && activeSection !== 'connectors' && (
              <div className="flex flex-col items-center justify-center py-24 opacity-20 gap-4">
                <ShieldAlert size={48} strokeWidth={1} />
                <div className="text-center">
                  <h3 className="text-[14px] font-bold uppercase tracking-widest">Under Construction</h3>
                  <p className="text-[11px] mt-1 italic">Mục "{navItems.find(i => i.id === activeSection)?.label}" đang được phát triển...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tailwind Modal Engine */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 animate-in fade-in duration-300" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-6xl bg-[#0d1220] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div>
                <h3 className="text-[18px] font-bold text-t0 uppercase tracking-tight flex items-center gap-3">
                  <Sliders className="text-psim-accent" size={20} /> Thiết lập Priority hàng loạt
                </h3>
                <p className="text-[11px] text-t2 mt-1">Chọn loại cảnh báo và áp dụng mức độ ưu tiên chung. Cấu hình cũ sẽ bị ghi đè.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-t2 hover:text-t0 transition-colors"><X size={20} /></button>
            </div>

            <div className="flex h-[550px]">
              {/* Modal Left Sidebar */}
              <div className="w-72 border-r border-white/5 bg-black/40 p-6 flex flex-col gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-t2 uppercase tracking-widest">Lọc nhóm hệ thống</label>
                  <select 
                    value={modalGroupFilter}
                    onChange={(e) => setModalGroupFilter(e.target.value)}
                    className="w-full bg-bg2 border border-white/10 rounded-md h-10 px-3 text-[12px] text-t1 outline-none focus:border-psim-accent/50"
                  >
                    <option value="all">Tất cả nhóm</option>
                    {groups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-t2 uppercase tracking-widest">Tìm kiếm nhanh</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-t2" size={14} />
                    <input 
                      className="w-full bg-bg2 border border-white/10 rounded-md h-10 pl-10 pr-3 text-[12px] text-t1 outline-none focus:border-psim-accent/50"
                      placeholder="Nhập ID hoặc tên..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-auto pt-5 border-t border-white/5 flex flex-col gap-3">
                  <div className="text-[10px] text-t2 font-bold uppercase flex justify-between"><span>Rổ lựa chọn</span><span className="text-psim-accent">{basket.length}</span></div>
                  <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-bg4">
                    {basket.map(id => (
                      <span key={id} className="flex items-center gap-2 bg-bg3 border border-white/10 px-2 py-1 rounded text-[9px] text-t1 font-mono">
                        {id} 
                        <X size={12} className="cursor-pointer hover:text-psim-red" onClick={() => setBasket(prev => prev.filter(x => x !== id))} />
                      </span>
                    ))}
                    {basket.length === 0 && <span className="text-[10px] text-t2 italic opacity-30 py-4 text-center w-full">Chưa có mục nào...</span>}
                  </div>
                </div>
              </div>

              {/* Modal Right Grid */}
              <div className="flex-1 p-6 bg-white/[0.01] overflow-y-auto scrollbar-thin scrollbar-thumb-bg4">
                <div className="grid grid-cols-2 gap-3">
                  {ALARM_MASTER_DATA.filter(a => {
                    const mG = modalGroupFilter === 'all' || a.group === modalGroupFilter;
                    const mS = a.label.toLowerCase().includes(modalSearch.toLowerCase()) || a.id.toLowerCase().includes(modalSearch.toLowerCase());
                    return mG && mS;
                  }).map(alarm => (
                    <div 
                      key={alarm.id}
                      onClick={() => {
                        if (basket.includes(alarm.id)) setBasket(prev => prev.filter(x => x !== alarm.id));
                        else setBasket(prev => [...prev, alarm.id]);
                      }}
                      className={cn(
                        "p-4 rounded-lg border transition-all cursor-pointer flex gap-4 items-start group",
                        basket.includes(alarm.id) ? "bg-psim-accent/10 border-psim-accent/50 shadow-xl" : "bg-bg2/40 border-white/5 hover:bg-bg2"
                      )}
                    >
                      <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors mt-0.5", basket.includes(alarm.id) ? "bg-psim-accent border-psim-accent text-bg0" : "bg-bg3 border-white/10 group-hover:border-psim-accent/50")}>
                        {basket.includes(alarm.id) && <Plus size={14} strokeWidth={3} className="rotate-45" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[13px] text-t1 group-hover:text-t0 leading-tight">{alarm.label}</div>
                        <div className="text-[9px] font-mono text-t2 uppercase mt-1 flex items-center gap-2">
                          <span className="bg-white/5 px-1.5 py-0.5 rounded">{alarm.group}</span>
                          <span className="opacity-40">#{alarm.id}</span>
                        </div>
                        <p className="text-[11px] text-t2 mt-2 line-clamp-1 opacity-60 group-hover:opacity-100">{alarm.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-t2 uppercase tracking-widest">Mức Priority áp dụng chung</span>
                <div className="flex gap-2">
                  {[
                    { id: 'critical', label: 'CRITICAL', color: 'bg-psim-red text-white' },
                    { id: 'high', label: 'HIGH', color: 'bg-psim-orange text-white' },
                    { id: 'medium', label: 'MEDIUM', color: 'bg-psim-yellow text-bg0' },
                    { id: 'low', label: 'LOW', color: 'bg-bg4 text-t1' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPriority(p.id as any)}
                      className={cn(
                        "px-4 py-2 rounded text-[11px] font-bold border transition-all",
                        selectedPriority === p.id ? `${p.color} border-transparent scale-105 shadow-lg` : "bg-bg2 text-t2 border-white/5 hover:border-white/20"
                      )}
                    >
                      ● {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowModal(false)} className="px-8 py-3 text-[11px] font-bold text-t2 uppercase hover:text-t0 transition-colors">Hủy bỏ</button>
                <button onClick={handleSaveConfig} disabled={basket.length === 0} className="px-12 py-3 bg-psim-accent text-bg0 font-bold text-[12px] uppercase tracking-wider rounded shadow-xl shadow-psim-accent/20 disabled:opacity-30">
                  Lưu {basket.length} cấu hình mới
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
