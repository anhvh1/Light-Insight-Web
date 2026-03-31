import { useState } from 'react';
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
  Save,
  Flame,
  Key,
  ShieldAlert,
  Car
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

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

// Định nghĩa các loại alarm theo hệ thống cho phần Priority
const PRIORITY_GROUPS = [
  {
    system: 'VMS & AI Analytics',
    icon: Activity,
    color: 'text-purple',
    alarms: [
      { id: 'AI_MOTION', label: 'Motion Detected', desc: 'Phát hiện chuyển động trong vùng cấm' },
      { id: 'AI_LOITER', label: 'Loitering', desc: 'Lảng vảng quá thời gian quy định' },
      { id: 'AI_WRONG_DIR', label: 'Wrong Direction', desc: 'Di chuyển ngược chiều' },
      { id: 'AI_PARK_VIO', label: 'Parking Violation', desc: 'Đỗ xe sai vị trí / quá giờ' }
    ]
  },
  {
    system: 'LPR Carparking',
    icon: Car,
    color: 'text-teal',
    alarms: [
      { id: 'LPR_BLACKLIST', label: 'Blacklisted Plate', desc: 'Biển số nằm trong danh sách đen' },
      { id: 'LPR_UNREG', label: 'Unregistered Vehicle', desc: 'Xe chưa đăng ký đi vào' },
      { id: 'LPR_MISMATCH', label: 'Entry/Exit Mismatch', desc: 'Biển số vào và ra không khớp' }
    ]
  },
  {
    system: 'Access Control',
    icon: Key,
    color: 'text-psim-accent',
    alarms: [
      { id: 'ACS_FORCED', label: 'Door Forced Open', desc: 'Cửa bị phá khóa hoặc mở cưỡng bức' },
      { id: 'ACS_HELD', label: 'Door Held Open', desc: 'Cửa bị giữ mở quá lâu' },
      { id: 'ACS_DENIED', label: 'Access Denied (3x)', desc: 'Từ chối quẹt thẻ quá 3 lần liên tiếp' }
    ]
  },
  {
    system: 'Fire & Safety',
    icon: Flame,
    color: 'text-psim-red',
    alarms: [
      { id: 'FIRE_ALARM', label: 'Fire Alarm', desc: 'Tín hiệu báo cháy từ trung tâm Fire' },
      { id: 'SMOKE_DET', label: 'Smoke Detected', desc: 'Phát hiện khói trong khu vực server' }
    ]
  },
  {
    system: 'BMS & Infrastructure',
    icon: Database,
    color: 'text-psim-orange',
    alarms: [
      { id: 'BMS_OFFLINE', label: 'Device Offline', desc: 'Thiết bị BMS mất kết nối' },
      { id: 'BMS_PWR_FAIL', label: 'Power Failure', desc: 'Sự cố nguồn điện / UPS' },
      { id: 'TECH_SIGNAL', label: 'Signal Lost', desc: 'Mất tín hiệu camera truyền về' }
    ]
  }
];

export function Configuration() {
  const [activeSection, setActiveSection] = useState<ConfigSection>('priority');
  const [isSaving, setIsSaving] = useState(false);

  const navItems = [
    { id: 'roles', label: 'User & Roles', icon: Users, group: 'Admin' },
    { id: 'rules', label: 'Rule & Alarm Config', icon: Zap, group: 'Admin' },
    { id: 'priority', label: 'Alarm Priority', icon: Sliders, group: 'Admin' },
    { id: 'sop', label: 'SOP Builder', icon: ClipboardList, group: 'Admin' },
    { id: 'connectors', label: 'Connectors', icon: Plug2, group: 'Admin' },
    { id: 'escalation', label: 'Escalation Rules', icon: ShieldCheck, group: 'Hệ thống' },
    { id: 'notif', label: 'Notifications', icon: BellRing, group: 'Hệ thống' },
  ];

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const renderPriority = () => (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-heading font-bold text-t0">Alarm Priority Management</h2>
          <p className="text-[12px] text-t2">Cấu hình mức độ nghiêm trọng cho các loại cảnh báo từ các hệ thống tích hợp</p>
        </div>
        <Button 
          onClick={handleSave}
          className="bg-psim-accent text-bg0 font-bold text-[11px] uppercase tracking-wider gap-2 h-9 px-6"
        >
          {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="flex flex-col gap-8">
        {PRIORITY_GROUPS.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-1">
              <div className={cn("p-1.5 rounded-md bg-bg2 border border-border-dim", group.color)}>
                <group.icon size={18} />
              </div>
              <h3 className="font-heading font-bold text-[14px] text-t0 uppercase tracking-tight">{group.system}</h3>
              <div className="flex-1 h-px bg-border-dim ml-2 opacity-50" />
            </div>

            <div className="bg-bg1/20 border border-border-dim rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg2/50 border-b border-border-dim">
                    <th className="py-2 px-4 text-[9px] font-mono text-t2 uppercase tracking-widest w-1/3">Alarm Type</th>
                    <th className="py-2 px-4 text-[9px] font-mono text-t2 uppercase tracking-widest text-center">Critical</th>
                    <th className="py-2 px-4 text-[9px] font-mono text-t2 uppercase tracking-widest text-center">High</th>
                    <th className="py-2 px-4 text-[9px] font-mono text-t2 uppercase tracking-widest text-center">Medium</th>
                    <th className="py-2 px-4 text-[9px] font-mono text-t2 uppercase tracking-widest text-center">Low</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dim/30">
                  {group.alarms.map((alarm) => (
                    <tr key={alarm.id} className="hover:bg-bg2/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[12px] text-t1">{alarm.label}</div>
                        <div className="text-[10px] text-t2 mt-0.5">{alarm.desc}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          <Switch className="data-[state=checked]:bg-psim-red" defaultChecked={alarm.id.includes('FIRE') || alarm.id.includes('FORCED')} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          <Switch className="data-[state=checked]:bg-psim-orange" defaultChecked={alarm.id.includes('BLACKLIST') || alarm.id.includes('WRONG')} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          <Switch className="data-[state=checked]:bg-psim-yellow" defaultChecked={alarm.id.includes('MOTION') || alarm.id.includes('HELD')} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          <Switch className="data-[state=checked]:bg-t2" defaultChecked={alarm.id.includes('SIGNAL') || alarm.id.includes('PWR')} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-psim-accent/5 border border-psim-accent/20 rounded-lg p-4 flex gap-4 mt-4">
         <div className="w-10 h-10 rounded-full bg-psim-accent/10 flex items-center justify-center shrink-0 border border-psim-accent/20">
            <ShieldAlert size={20} className="text-psim-accent" />
         </div>
         <div className="flex flex-col gap-1">
            <h4 className="text-[12px] font-bold text-psim-accent">Lưu ý quan trọng</h4>
            <p className="text-[11px] text-t1 leading-relaxed">
              Việc thay đổi Priority sẽ ảnh hưởng trực tiếp đến cách hệ thống phân loại Alarm trong **Unified Alarm Console** và các quy tắc thông báo (Notifications). Hãy đảm bảo các thay đổi này phù hợp với SOP của trung tâm an ninh.
            </p>
         </div>
      </div>
    </div>
  );

  const renderConnectors = () => (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-heading font-bold text-t0">VMS & Device Connectors (4.3)</h2>
          <p className="text-[12px] text-t2">Quản lý kết nối API và trạng thái đồng bộ hóa thiết bị ngoại vi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-bg2 border-border-dim text-[11px] font-bold gap-2">
            + Thêm Connector
          </Button>
          <Button variant="outline" size="sm" className="bg-bg2 border-border-dim text-[11px] font-bold gap-2">
            <RefreshCcw size={14} /> Refresh Now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {CONNECTORS.map((c, i) => (
          <Card key={i} className={cn("bg-bg1/40 border-border-dim shadow-none hover:bg-bg1/60 transition-colors", c.borderColor)}>
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className={cn("text-[14px] font-bold tracking-tight", c.color)}>{c.name}</CardTitle>
                  <CardDescription className="text-[10px] font-mono mt-1 opacity-70">{c.desc}</CardDescription>
                </div>
                <Badge variant="outline" className={cn(
                  "text-[9px] font-bold px-1.5 py-0",
                  c.status === 'ONLINE' ? "bg-psim-green/10 text-psim-green border-psim-green/30" : "bg-psim-orange/10 text-psim-orange border-psim-orange/30"
                )}>
                  {c.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-y-2">
                <div className="flex justify-between items-center pr-4">
                  <span className="text-[10px] text-t2 font-mono uppercase">Latency</span>
                  <span className={cn("text-[11px] font-bold font-mono", c.warn ? "text-psim-orange" : "text-psim-green")}>{c.latency}</span>
                </div>
                <div className="flex justify-between items-center pl-4 border-l border-border-dim/50">
                  <span className="text-[10px] text-t2 font-mono uppercase">Sync</span>
                  <span className="text-[11px] font-bold text-t1">{c.stats}</span>
                </div>
                <div className="flex justify-between items-center pr-4">
                  <span className="text-[10px] text-t2 font-mono uppercase">Events/min</span>
                  <span className="text-[11px] font-bold text-t1">{c.load}</span>
                </div>
                <div className="flex justify-between items-center pl-4 border-l border-border-dim/50">
                  <span className="text-[10px] text-t2 font-mono uppercase">Status</span>
                  <span className={cn("text-[11px] font-bold", c.color)}>{c.status}</span>
                </div>
              </div>
              <div className="pt-1">
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] font-bold text-t2 uppercase tracking-tighter">Connection Health</span>
                  <span className="text-[9px] font-bold text-t1">{c.health}%</span>
                </div>
                <Progress value={c.health} className="h-1 bg-bg3" indicatorClassName={c.warn ? "bg-psim-orange" : "bg-psim-accent"} />
              </div>
              <div className="flex gap-2 mt-1">
                <Button variant="ghost" className="h-7 text-[10px] flex-1 border border-border-dim bg-bg2/50 hover:bg-bg3">Cấu hình</Button>
                <Button variant="ghost" className="h-7 text-[10px] flex-1 border border-border-dim bg-bg2/50 hover:bg-bg3">Kết nối</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <h3 className="text-[13px] font-bold text-t0 mb-4 flex items-center gap-2">
          <Activity size={16} className="text-psim-accent" /> Network Topology & Latency
        </h3>
        <div className="bg-bg2 border border-border-dim rounded-lg p-8 flex flex-col items-center justify-center border-dashed opacity-40">
           <Globe size={32} className="text-t2 mb-2" />
           <span className="text-[11px] uppercase font-bold tracking-widest">Network Map Placeholder</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg0 overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-border-dim bg-bg0/50 flex items-center px-6 shrink-0">
        <h1 className="font-heading text-[16px] font-bold text-t0 uppercase tracking-tight">Configuration & Administration</h1>
        <div className="ml-auto text-[10px] text-t2 font-mono uppercase tracking-widest bg-bg2 px-3 py-1 rounded border border-border-dim">
          Admin Mode — SuperUser
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sub-Sidebar (config-nav) */}
        <div className="w-[240px] border-r border-border-dim bg-bg0/30 flex flex-col p-4 gap-6">
          <div>
            <div className="text-[10px] font-bold text-t2 uppercase tracking-[0.2em] mb-3 px-2">Nhóm 4 — Admin</div>
            <div className="flex flex-col gap-0.5">
              {navItems.filter(i => i.group === 'Admin').map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-all group",
                    activeSection === item.id 
                      ? "bg-psim-accent/15 text-psim-accent" 
                      : "text-t2 hover:bg-bg2 hover:text-t1"
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
                    activeSection === item.id 
                      ? "bg-psim-accent/15 text-psim-accent" 
                      : "text-t2 hover:bg-bg2 hover:text-t1"
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
                <span className="text-[10px] font-bold uppercase tracking-tight">System Storage</span>
             </div>
             <div className="flex justify-between mb-1 text-[9px] font-mono">
                <span className="text-t2">48TB / 64TB</span>
                <span className="text-psim-orange">75%</span>
             </div>
             <Progress value={75} className="h-1 bg-bg3" indicatorClassName="bg-psim-orange" />
          </div>
        </div>

        {/* Right Content Area (config-content) */}
        <div className="flex-1 overflow-y-auto p-8 bg-bg0/10 scrollbar-thin scrollbar-thumb-bg4">
          <div className="max-w-[1000px]">
            {activeSection === 'priority' && renderPriority()}
            {activeSection === 'connectors' && renderConnectors()}
            {activeSection !== 'priority' && activeSection !== 'connectors' && (
              <div className="flex flex-col items-center justify-center py-20 opacity-20 gap-4">
                <Zap size={48} />
                <div className="text-center">
                  <h3 className="text-[14px] font-bold uppercase tracking-widest">Under Construction</h3>
                  <p className="text-[11px] mt-1">Mục "{navItems.find(i => i.id === activeSection)?.label}" đang được phát triển</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
