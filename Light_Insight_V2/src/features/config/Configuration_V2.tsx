// import { useState } from 'react';
// import { cn } from '@/lib/utils';
// import { 
//   Users, 
//   Zap, 
//   ClipboardList, 
//   Plug2, 
//   BellRing, 
//   ShieldCheck,
//   RefreshCcw,
//   Activity,
//   Globe,
//   Database,
//   Sliders,
//   Plus,
//   Trash2,
//   Edit2,
//   Filter,
//   Search,
//   Car,
//   Key,
//   Flame,
//   ShieldAlert,
//   X
// } from 'lucide-react';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
// import { Button } from '@/components/ui/button';
// import { StatusPill } from '@/components/ui/status-badge';
// import { 
//   Dialog, 
//   DialogContent, 
//   DialogHeader, 
//   DialogTitle, 
//   DialogTrigger,
//   DialogDescription
// } from '@/components/ui/dialog';
// import { 
//   Select, 
//   SelectContent, 
//   SelectItem, 
//   SelectTrigger, 
//   SelectValue 
// } from '@/components/ui/select';
// import { Checkbox } from '@/components/ui/checkbox';
// import { Input } from '@/components/ui/input';
// import type { Priority } from '@/types';

// type ConfigSection = 'roles' | 'rules' | 'sop' | 'connectors' | 'escalation' | 'notif' | 'priority';

// const ALARM_MASTER_DATA = [
//   { id: 'AI_MOTION', label: 'Motion Detected', group: 'VMS & AI', desc: 'Phát hiện chuyển động trong vùng cấm' },
//   { id: 'AI_LOITER', label: 'Loitering', group: 'VMS & AI', desc: 'Lảng vảng quá thời gian quy định' },
//   { id: 'AI_WRONG_DIR', label: 'Wrong Direction', group: 'VMS & AI', desc: 'Di chuyển ngược chiều' },
//   { id: 'AI_PARK_VIO', label: 'Parking Violation', group: 'VMS & AI', desc: 'Đỗ xe sai vị trí / quá giờ' },
//   { id: 'LPR_BLACKLIST', label: 'Blacklisted Plate', group: 'LPR', desc: 'Biển số nằm trong danh sách đen' },
//   { id: 'LPR_UNREG', label: 'Unregistered Vehicle', group: 'LPR', desc: 'Xe chưa đăng ký đi vào' },
//   { id: 'ACS_FORCED', label: 'Door Forced Open', group: 'Access Control', desc: 'Cửa bị phá khóa cưỡng bức' },
//   { id: 'ACS_DENIED', label: 'Access Denied (3x)', group: 'Access Control', desc: 'Từ chối quẹt thẻ quá 3 lần' },
//   { id: 'FIRE_ALARM', label: 'Fire Alarm', group: 'Fire & Safety', desc: 'Tín hiệu báo cháy trung tâm' },
//   { id: 'SMOKE_DET', label: 'Smoke Detected', group: 'Fire & Safety', desc: 'Phát hiện khói khu vực server' },
//   { id: 'BMS_OFFLINE', label: 'Device Offline', group: 'BMS', desc: 'Thiết bị hạ tầng mất kết nối' },
// ];

// interface ConfigEntry {
//   alarmId: string;
//   priority: Priority;
// }

// export function Configuration_V2() {
//   const [activeSection, setActiveSection] = useState<ConfigSection>('priority');
  
//   // State chính cho danh sách cấu hình
//   const [configs, setConfigs] = useState<ConfigEntry[]>([
//     { alarmId: 'FIRE_ALARM', priority: 'critical' },
//     { alarmId: 'ACS_FORCED', priority: 'critical' },
//     { alarmId: 'LPR_BLACKLIST', priority: 'high' },
//     { alarmId: 'AI_MOTION', priority: 'medium' },
//     { alarmId: 'BMS_OFFLINE', priority: 'low' },
//   ]);

//   const [groupFilter, setGroupFilter] = useState<string>('all');
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
  
//   // State trong Modal (Rổ lựa chọn)
//   const [basket, setBasket] = useState<string[]>([]);
//   const [selectedPriority, setSelectedPriority] = useState<Priority>('medium');
//   const [modalSearch, setModalSearch] = useState('');
//   const [modalGroupFilter, setModalGroupFilter] = useState('all');

//   const navItems = [
//     { id: 'roles', label: 'User & Roles', icon: Users, group: 'Admin' },
//     { id: 'rules', label: 'Rule & Alarm Config', icon: Zap, group: 'Admin' },
//     { id: 'priority', label: 'Alarm Priority V2', icon: Sliders, group: 'Admin' },
//     { id: 'sop', label: 'SOP Builder', icon: ClipboardList, group: 'Admin' },
//     { id: 'connectors', label: 'Connectors', icon: Plug2, group: 'Admin' },
//     { id: 'escalation', label: 'Escalation Rules', icon: ShieldCheck, group: 'Hệ thống' },
//     { id: 'notif', label: 'Notifications', icon: BellRing, group: 'Hệ thống' },
//   ];

//   const handleDelete = (id: string) => {
//     setConfigs(prev => prev.filter(c => c.alarmId !== id));
//   };

//   const handleSaveConfig = () => {
//     const newConfigs = basket.map(id => ({ alarmId: id, priority: selectedPriority }));
//     setConfigs(prev => {
//       const filtered = prev.filter(p => !basket.includes(p.alarmId));
//       return [...filtered, ...newConfigs];
//     });
//     setBasket([]);
//     setIsDialogOpen(false);
//   };

//   const renderPriorityV2 = () => {
//     const filteredConfigs = configs.filter(c => {
//       if (groupFilter === 'all') return true;
//       const alarm = ALARM_MASTER_DATA.find(a => a.id === c.alarmId);
//       return alarm?.group === groupFilter;
//     });

//     const groups = Array.from(new Set(ALARM_MASTER_DATA.map(a => a.group)));

//     return (
//       <div className="flex flex-col gap-6 animate-in fade-in duration-500">
//         <div className="flex items-center justify-between">
//           <div>
//             <h2 className="text-[18px] font-heading font-bold text-t0">Alarm Priority Management (V2)</h2>
//             <p className="text-[12px] text-t2">Thiết lập mối quan hệ 1-1 giữa loại cảnh báo và mức độ ưu tiên</p>
//           </div>
          
//           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//             <DialogTrigger asChild>
//               <Button className="bg-psim-accent text-bg0 font-bold text-[11px] uppercase tracking-wider gap-2 h-9 px-6 shadow-lg shadow-psim-accent/20">
//                 <Plus size={16} /> Tạo cấu hình
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="bg-bg1 border-border-dim max-w-4xl text-t1 p-0 overflow-hidden shadow-2xl ring-1 ring-white/5">
//               <DialogHeader className="p-6 pb-2 border-b border-border-dim/50 bg-bg2/30">
//                 <DialogTitle className="text-t0 uppercase tracking-tight flex items-center gap-2">
//                   <Sliders size={18} className="text-psim-accent" /> Thiết lập Priority hàng loạt
//                 </DialogTitle>
//                 <DialogDescription className="text-t2 text-[11px]">
//                   Chọn các loại Alarm vào rổ và thiết lập mức độ ưu tiên chung cho chúng.
//                 </DialogDescription>
//               </DialogHeader>
              
//               <div className="flex h-[450px]">
//                 {/* Modal Left Sidebar: Filters & Selected Basket */}
//                 <div className="w-64 border-r border-border-dim/50 p-4 flex flex-col gap-4 bg-bg0/20">
//                    <div className="space-y-2">
//                       <span className="text-[10px] font-bold text-t2 uppercase tracking-widest">Lọc nhóm</span>
//                       <Select value={modalGroupFilter} onValueChange={setModalGroupFilter}>
//                         <SelectTrigger className="h-8 bg-bg2 text-[11px] border-border-dim">
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent className="bg-bg2 border-border-dim">
//                           <SelectItem value="all">Tất cả nhóm</SelectItem>
//                           {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
//                         </SelectContent>
//                       </Select>
//                    </div>
//                    <div className="relative">
//                       <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t2" />
//                       <Input 
//                         placeholder="Tìm loại alarm..." 
//                         className="h-8 pl-8 bg-bg2 text-[11px] border-border-dim"
//                         value={modalSearch}
//                         onChange={(e) => setModalSearch(e.target.value)}
//                       />
//                    </div>
//                    <div className="mt-auto pt-4 border-t border-border-dim/50 flex flex-col gap-2 overflow-hidden">
//                       <div className="text-[10px] text-t2 font-bold uppercase tracking-tighter flex justify-between">
//                         <span>Rổ lựa chọn</span>
//                         <span className="text-psim-accent">{basket.length}</span>
//                       </div>
//                       <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-bg4">
//                          {basket.map(id => (
//                            <Badge key={id} variant="secondary" className="text-[9px] h-6 bg-bg3 text-t1 pr-1 gap-1 border border-border-dim/50">
//                              {id} 
//                              <button 
//                                className="hover:text-psim-red transition-colors p-0.5" 
//                                onClick={(e) => {
//                                  e.preventDefault();
//                                  e.stopPropagation();
//                                  setBasket(prev => prev.filter(x => x !== id));
//                                }}
//                              >
//                                <X size={10} />
//                              </button>
//                            </Badge>
//                          ))}
//                          {basket.length === 0 && <span className="text-[10px] text-t2 italic opacity-40 py-4 text-center w-full">Chưa có mục nào...</span>}
//                       </div>
//                    </div>
//                 </div>

//                 {/* Modal Right Area: Alarm Grid */}
//                 <div className="flex-1 overflow-y-auto p-4 bg-bg0/10 scrollbar-thin scrollbar-thumb-bg4">
//                    <div className="grid grid-cols-2 gap-2">
//                       {ALARM_MASTER_DATA.filter(a => {
//                         const matchGroup = modalGroupFilter === 'all' || a.group === modalGroupFilter;
//                         const matchSearch = a.label.toLowerCase().includes(modalSearch.toLowerCase()) || a.id.toLowerCase().includes(modalSearch.toLowerCase());
//                         return matchGroup && matchSearch;
//                       }).map(alarm => (
//                         <div 
//                           key={alarm.id} 
//                           className={cn(
//                             "flex items-center gap-3 p-3 rounded-md transition-all border cursor-pointer group",
//                             basket.includes(alarm.id) 
//                               ? "bg-psim-accent/10 border-psim-accent/40 shadow-[0_0_10px_rgba(0,194,255,0.05)]" 
//                               : "bg-bg1/40 border-border-dim/50 hover:bg-bg2 hover:border-border-dim"
//                           )}
//                           onClick={() => {
//                             if (basket.includes(alarm.id)) setBasket(prev => prev.filter(x => x !== alarm.id));
//                             else setBasket(prev => [...prev, alarm.id]);
//                           }}
//                         >
//                           <Checkbox checked={basket.includes(alarm.id)} className="border-border-dim data-[state=checked]:bg-psim-accent" />
//                           <div className="flex-1 min-w-0">
//                             <div className="text-[12px] font-bold text-t1 truncate group-hover:text-t0">{alarm.label}</div>
//                             <div className="text-[9px] text-t2 font-mono uppercase truncate">{alarm.group} · {alarm.id}</div>
//                           </div>
//                         </div>
//                       ))}
//                    </div>
//                 </div>
//               </div>

//               {/* Modal Footer */}
//               <div className="p-6 bg-bg2/30 border-t border-border-dim/50 flex items-center justify-between">
//                 <div className="flex items-center gap-4">
//                    <span className="text-[11px] font-bold text-t1 uppercase tracking-wider">Áp dụng Priority:</span>
//                    <Select value={selectedPriority} onValueChange={(v) => setSelectedPriority(v as any)}>
//                       <SelectTrigger className={cn(
//                         "w-[160px] h-10 bg-bg3 border-border-dim text-[11px] font-bold transition-colors",
//                         selectedPriority === 'critical' && "text-psim-red border-psim-red/30",
//                         selectedPriority === 'high' && "text-psim-orange border-psim-orange/30",
//                         selectedPriority === 'medium' && "text-psim-yellow border-psim-yellow/30",
//                         selectedPriority === 'low' && "text-t2 border-border-dim"
//                       )}>
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent className="bg-bg3 border-border-dim text-t1">
//                         <SelectItem value="critical" className="text-psim-red font-bold">● CRITICAL</SelectItem>
//                         <SelectItem value="high" className="text-psim-orange font-bold">● HIGH</SelectItem>
//                         <SelectItem value="medium" className="text-psim-yellow font-bold">● MEDIUM</SelectItem>
//                         <SelectItem value="low" className="text-t2 font-bold">● LOW</SelectItem>
//                       </SelectContent>
//                    </Select>
//                 </div>
//                 <div className="flex gap-3">
//                   <Button variant="ghost" className="text-[11px] font-bold uppercase h-10 px-6" onClick={() => { setIsDialogOpen(false); setBasket([]); }}>Hủy</Button>
//                   <Button className="bg-psim-accent text-bg0 font-bold text-[11px] uppercase tracking-wider h-10 px-10 shadow-lg shadow-psim-accent/20" onClick={handleSaveConfig} disabled={basket.length === 0}>Lưu cấu hình</Button>
//                 </div>
//               </div>
//             </DialogContent>
//           </Dialog>
//         </div>

//         {/* Filters Toolbar */}
//         <div className="flex items-center gap-3 p-3 bg-bg1/20 border border-border-dim rounded-lg">
//            <div className="flex items-center gap-2 text-t2">
//               <Filter size={14} />
//               <span className="text-[11px] font-bold uppercase tracking-widest">Lọc theo nhóm:</span>
//            </div>
//            <div className="flex gap-1">
//               <button 
//                 className={cn("px-3 py-1 rounded text-[10px] font-bold border transition-all", groupFilter === 'all' ? "bg-psim-accent/15 text-psim-accent border-psim-accent/30" : "bg-bg2 text-t2 border-border-dim hover:bg-bg3")}
//                 onClick={() => setGroupFilter('all')}
//               >
//                 TẤT CẢ
//               </button>
//               {groups.map(g => (
//                 <button 
//                   key={g}
//                   className={cn("px-3 py-1 rounded text-[10px] font-bold border transition-all uppercase", groupFilter === g ? "bg-psim-accent/15 text-psim-accent border-psim-accent/30" : "bg-bg2 text-t2 border-border-dim hover:bg-bg3")}
//                   onClick={() => setGroupFilter(g)}
//                 >
//                   {g}
//                 </button>
//               ))}
//            </div>
//            <div className="ml-auto text-[10px] text-t2 font-mono uppercase">
//               Tổng cộng: {filteredConfigs.length} quy tắc
//            </div>
//         </div>

//         {/* Configuration Table */}
//         <div className="bg-bg1/20 border border-border-dim rounded-lg overflow-hidden shadow-sm">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-bg2/50 border-b border-border-dim">
//                 <th className="py-3.5 px-4 text-[10px] font-mono text-t2 uppercase tracking-widest w-16">STT</th>
//                 <th className="py-3.5 px-4 text-[10px] font-mono text-t2 uppercase tracking-widest">Alarm Type & Description</th>
//                 <th className="py-3.5 px-4 text-[10px] font-mono text-t2 uppercase tracking-widest w-48">System Group</th>
//                 <th className="py-3.5 px-4 text-[10px] font-mono text-t2 uppercase tracking-widest w-48 text-center">Priority</th>
//                 <th className="py-3.5 px-4 text-[10px] font-mono text-t2 uppercase tracking-widest w-24 text-right pr-6">Action</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-border-dim/30">
//               {filteredConfigs.map((c, index) => {
//                 const alarm = ALARM_MASTER_DATA.find(a => a.id === c.alarmId);
//                 return (
//                   <tr key={c.alarmId} className="hover:bg-bg2/30 transition-colors group h-14">
//                     <td className="py-3 px-4 font-mono text-[11px] text-t2">{index + 1}</td>
//                     <td className="py-3 px-4">
//                       <div className="font-bold text-[13px] text-t1 group-hover:text-psim-accent transition-colors">{alarm?.label || c.alarmId}</div>
//                       <div className="text-[10px] text-t2 mt-0.5">{alarm?.desc}</div>
//                     </td>
//                     <td className="py-3 px-4">
//                        <Badge variant="outline" className="bg-bg2 text-t2 border-border-dim text-[9px] font-mono font-bold uppercase">{alarm?.group || 'Unset'}</Badge>
//                     </td>
//                     <td className="py-3 px-4">
//                        <div className="flex justify-center">
//                           <StatusPill priority={c.priority} className="w-32" />
//                        </div>
//                     </td>
//                     <td className="py-3 px-4 text-right pr-6">
//                        <div className="flex justify-end gap-1.5">
//                           <Button size="icon" variant="ghost" className="w-8 h-8 text-t2 hover:text-psim-accent hover:bg-bg3" title="Sửa cấu hình">
//                              <Edit2 size={14} />
//                           </Button>
//                           <Button 
//                             size="icon" 
//                             variant="ghost" 
//                             className="w-8 h-8 text-t2 hover:text-psim-red hover:bg-bg3" 
//                             title="Xóa cấu hình"
//                             onClick={() => handleDelete(c.alarmId)}
//                           >
//                              <Trash2 size={14} />
//                           </Button>
//                        </div>
//                     </td>
//                   </tr>
//                 );
//               })}
//               {filteredConfigs.length === 0 && (
//                 <tr>
//                   <td colSpan={5} className="py-24 text-center text-t2 opacity-30 italic text-[12px]">Không tìm thấy quy tắc cấu hình nào</td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     );
//   };

//   const renderConnectors = () => (
//     <div className="flex flex-col gap-6 animate-in fade-in duration-500">
//       <div className="flex items-center justify-between">
//         <div>
//           <h2 className="text-[18px] font-heading font-bold text-t0">VMS & Device Connectors (4.3)</h2>
//           <p className="text-[12px] text-t2">Quản lý kết nối API và trạng thái đồng bộ hóa thiết bị ngoại vi</p>
//         </div>
//         <div className="flex gap-2">
//           <Button variant="outline" size="sm" className="bg-bg2 border-border-dim text-[11px] font-bold gap-2">
//             + Thêm Connector
//           </Button>
//           <Button variant="outline" size="sm" className="bg-bg2 border-border-dim text-[11px] font-bold gap-2">
//             <RefreshCcw size={14} /> Refresh Now
//           </Button>
//         </div>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         {CONNECTORS.map((c, i) => (
//           <Card key={i} className={cn("bg-bg1/40 border-border-dim shadow-none hover:bg-bg1/60 transition-colors", c.borderColor)}>
//             <CardHeader className="p-4 pb-2">
//               <div className="flex justify-between items-start">
//                 <div>
//                   <CardTitle className={cn("text-[14px] font-bold tracking-tight", c.color)}>{c.name}</CardTitle>
//                   <CardDescription className="text-[10px] font-mono mt-1 opacity-70">{c.desc}</CardDescription>
//                 </div>
//                 <Badge variant="outline" className={cn(
//                   "text-[9px] font-bold px-1.5 py-0",
//                   c.status === 'ONLINE' ? "bg-psim-green/10 text-psim-green border-psim-green/30" : "bg-psim-orange/10 text-psim-orange border-psim-orange/30"
//                 )}>
//                   {c.status}
//                 </Badge>
//               </div>
//             </CardHeader>
//             <CardContent className="p-4 pt-2 flex flex-col gap-3">
//               <div className="grid grid-cols-2 gap-y-2">
//                 <div className="flex justify-between items-center pr-4">
//                   <span className="text-[10px] text-t2 font-mono uppercase">Latency</span>
//                   <span className={cn("text-[11px] font-bold font-mono", c.warn ? "text-psim-orange" : "text-psim-green")}>{c.latency}</span>
//                 </div>
//                 <div className="flex justify-between items-center pl-4 border-l border-border-dim/50">
//                   <span className="text-[10px] text-t2 font-mono uppercase">Sync</span>
//                   <span className="text-[11px] font-bold text-t1">{c.stats}</span>
//                 </div>
//                 <div className="flex justify-between items-center pr-4">
//                   <span className="text-[10px] text-t2 font-mono uppercase">Events/min</span>
//                   <span className="text-[11px] font-bold text-t1">{c.load}</span>
//                 </div>
//                 <div className="flex justify-between items-center pl-4 border-l border-border-dim/50">
//                   <span className="text-[10px] text-t2 font-mono uppercase">Status</span>
//                   <span className={cn("text-[11px] font-bold", c.color)}>{c.status}</span>
//                 </div>
//               </div>
//               <div className="pt-1">
//                 <div className="flex justify-between mb-1">
//                   <span className="text-[9px] font-bold text-t2 uppercase tracking-tighter">Connection Health</span>
//                   <span className="text-[9px] font-bold text-t1">{c.health}%</span>
//                 </div>
//                 <Progress value={c.health} className="h-1 bg-bg3" indicatorClassName={c.warn ? "bg-psim-orange" : "bg-psim-accent"} />
//               </div>
//               <div className="flex gap-2 mt-1">
//                 <Button variant="ghost" className="h-7 text-[10px] flex-1 border border-border-dim bg-bg2/50 hover:bg-bg3">Cấu hình</Button>
//                 <Button variant="ghost" className="h-7 text-[10px] flex-1 border border-border-dim bg-bg2/50 hover:bg-bg3">Kết nối</Button>
//               </div>
//             </CardContent>
//           </Card>
//         ))}
//       </div>

//       <div className="mt-4">
//         <h3 className="text-[13px] font-bold text-t0 mb-4 flex items-center gap-2">
//           <Activity size={16} className="text-psim-accent" /> Network Topology & Latency
//         </h3>
//         <div className="bg-bg2 border border-border-dim rounded-lg p-12 flex flex-col items-center justify-center border-dashed opacity-30">
//            <Globe size={40} className="text-t2 mb-3" />
//            <span className="text-[11px] uppercase font-bold tracking-[0.2em]">Network Map Simulation Area</span>
//         </div>
//       </div>
//     </div>
//   );

//   return (
//     <div className="flex flex-col h-full bg-bg0 overflow-hidden">
//       {/* Header */}
//       <div className="h-14 border-b border-border-dim bg-bg0/50 flex items-center px-6 shrink-0">
//         <h1 className="font-heading text-[16px] font-bold text-t0 uppercase tracking-tight">Configuration & Administration</h1>
//         <div className="ml-auto text-[10px] text-t2 font-mono uppercase tracking-widest bg-bg2 px-3 py-1 rounded border border-border-dim">
//           Admin Mode — SuperUser
//         </div>
//       </div>

//       <div className="flex-1 flex overflow-hidden">
//         {/* Left Sub-Sidebar */}
//         <div className="w-[240px] border-r border-border-dim bg-bg0/30 flex flex-col p-4 gap-6">
//           <div>
//             <div className="text-[10px] font-bold text-t2 uppercase tracking-[0.2em] mb-3 px-2">Quản trị hệ thống</div>
//             <div className="flex flex-col gap-0.5">
//               {navItems.filter(i => i.group === 'Admin').map((item) => (
//                 <button
//                   key={item.id}
//                   onClick={() => setActiveSection(item.id as any)}
//                   className={cn(
//                     "flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-all group",
//                     activeSection === item.id 
//                       ? "bg-psim-accent/15 text-psim-accent" 
//                       : "text-t2 hover:bg-bg2 hover:text-t1"
//                   )}
//                 >
//                   <item.icon size={16} className={cn(activeSection === item.id ? "text-psim-accent" : "text-t2 group-hover:text-t1")} />
//                   {item.label}
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div>
//             <div className="text-[10px] font-bold text-t2 uppercase tracking-[0.2em] mb-3 px-2">Cấu hình chung</div>
//             <div className="flex flex-col gap-0.5">
//               {navItems.filter(i => i.group === 'Hệ thống').map((item) => (
//                 <button
//                   key={item.id}
//                   onClick={() => setActiveSection(item.id as any)}
//                   className={cn(
//                     "flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-all group",
//                     activeSection === item.id 
//                       ? "bg-psim-accent/15 text-psim-accent" 
//                       : "text-t2 hover:bg-bg2 hover:text-t1"
//                   )}
//                 >
//                   <item.icon size={16} className={cn(activeSection === item.id ? "text-psim-accent" : "text-t2 group-hover:text-t1")} />
//                   {item.label}
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div className="mt-auto p-4 bg-bg2/50 border border-border-dim rounded-lg">
//              <div className="flex items-center gap-2 mb-2">
//                 <Database size={14} className="text-psim-accent" />
//                 <span className="text-[10px] font-bold uppercase tracking-tight">System Storage</span>
//              </div>
//              <div className="flex justify-between mb-1 text-[9px] font-mono">
//                 <span className="text-t2">48TB / 64TB</span>
//                 <span className="text-psim-orange">75%</span>
//              </div>
//              <Progress value={75} className="h-1 bg-bg3" indicatorClassName="bg-psim-orange" />
//           </div>
//         </div>

//         {/* Right Content Area */}
//         <div className="flex-1 overflow-y-auto p-8 bg-bg0/10 scrollbar-thin scrollbar-thumb-bg4">
//           <div className="max-w-[1000px]">
//             {activeSection === 'priority' && renderPriorityV2()}
//             {activeSection === 'connectors' && renderConnectors()}
//             {activeSection !== 'priority' && activeSection !== 'connectors' && (
//               <div className="flex flex-col items-center justify-center py-24 opacity-20 gap-4">
//                 <ShieldAlert size={48} strokeWidth={1} />
//                 <div className="text-center">
//                   <h3 className="text-[14px] font-bold uppercase tracking-widest">Section Under Construction</h3>
//                   <p className="text-[11px] mt-1 italic">Mục "{navItems.find(i => i.id === activeSection)?.label}" đang được phát triển...</p>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// const CONNECTORS = [
//   {
//     name: 'Milestone XProtect',
//     desc: 'Corporate v2024.1 · REST + MIP SDK',
//     latency: '18ms',
//     stats: '47 / 52 Cameras',
//     load: 142,
//     status: 'ONLINE',
//     health: 90,
//     color: 'text-psim-green',
//     borderColor: 'border-psim-green/20'
//   },
//   {
//     name: 'BioStar2 ACS',
//     desc: 'Suprema · REST API · :443',
//     latency: '32ms',
//     stats: '24 / 24 Doors',
//     load: 18,
//     status: 'ONLINE',
//     health: 100,
//     color: 'text-psim-accent',
//     borderColor: 'border-psim-accent/20'
//   },
//   {
//     name: 'Futech LPR',
//     desc: 'Parking · REST API · :8080',
//     latency: '87ms',
//     stats: '2 / 2 Barriers',
//     load: 6,
//     status: 'SLOW',
//     health: 65,
//     color: 'text-psim-orange',
//     borderColor: 'border-psim-orange/20',
//     warn: true
//   },
//   {
//     name: 'BMS Portal',
//     desc: 'REST API · Webhook · :443',
//     latency: '45ms',
//     stats: '8 / 8 Zones',
//     load: 4,
//     status: 'ONLINE',
//     health: 100,
//     color: 'text-purple',
//     borderColor: 'border-purple/20'
//   }
// ];
