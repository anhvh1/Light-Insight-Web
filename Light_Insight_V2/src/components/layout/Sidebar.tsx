import { 
  Bell, 
  Map as MapIcon, 
  MonitorPlay, 
  Siren, 
  BarChart3, 
  ClipboardList, 
  Plug2, 
  Settings,
  Users,
  Zap,
  Sliders,
  ShieldCheck,
  BellRing
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useAlarmSignalR } from '@/features/alarms/useAlarmSignalR';

interface NavItem {
  id?: string;
  icon?: any;
  tip?: string;
  badge?: number;
  path?: string;
  type?: 'sep';
}

const navItems: NavItem[] = [
  { id: 'alarm', icon: Bell, tip: 'Alarm Console', badge: 3, path: '/alarm' },
  { id: 'map', icon: MapIcon, tip: 'Situational Map', path: '/map' },
  { id: 'wall', icon: MonitorPlay, tip: 'Video Wall', path: '/wall' },
  { id: 'inc', icon: Siren, tip: 'Incident Management', badge: 10, path: '/incident' },
  { id: 'ana', icon: BarChart3, tip: 'Analytics', path: '/analytics' },
  { id: 'shift', icon: ClipboardList, tip: 'Shift Handover', path: '/shift' },
  { id: 'health', icon: Plug2, tip: 'System Health', path: '/health' },
  { id: 'config', icon: Settings, tip: 'Config & Admin', path: '/config' },
];

const configSubItems = [
  { 
    group: 'Quản trị', 
    items: [
      { label: 'User & Roles', path: '/config/users-roles', icon: Users },
      { label: 'Rule & Alarm Config', path: '/config/rules', icon: Zap },
      { label: 'Alarm Priority V3', path: '/config/priority', icon: Sliders },
      { label: 'SOP Builder', path: '/config/sop', icon: ClipboardList },
      { label: 'Connectors', path: '/config/connectors', icon: Plug2 },
      { label: 'Map Management', path: '/config/map', icon: MapIcon },
    ]
  },
  { 
    group: 'Hệ thống', 
    items: [
      { label: 'Escalation Rules', path: '/config/escalation', icon: ShieldCheck },
      { label: 'Notifications', path: '/config/notif', icon: BellRing },
    ]
  }
];

export function Sidebar() {
  const { bellCount, refreshAlarms } = useAlarmSignalR();

  return (
    <nav className="w-14.5 bg-bg-1 border-r border-border-dim flex flex-col items-center py-2 gap-0.5 shrink-0 h-full z-[1000] overflow-visible">
      {navItems.map((item, idx) => {
        if (item.type === 'sep') {
          return <div key={`sep-${idx}`} className="w-7.5 h-px bg-border-dim my-1" />;
        }

        const Icon = item.icon!;
        const badge = item.id === 'alarm' ? bellCount : item.badge;
        const isConfig = item.id === 'config';
        
        return (
          <div key={item.id} className="relative group">
            <Link
              to={item.path as any}
              onClick={() => {
                if (item.id === 'alarm') {
                  void refreshAlarms();
                }
              }}
              activeProps={{ className: 'bg-psim-accent/15 text-psim-accent' }}
              inactiveProps={{ className: 'text-t2 hover:bg-bg3 hover:text-t1' }}
              className={cn(
                "relative w-10.5 h-10.5 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150"
              )}
            >
              <Icon size={18} />
              
              {/* Tooltip (hidden for config because it has submenu) */}
              {!isConfig && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#161b2e] text-white text-[11px] font-bold rounded-md whitespace-nowrap border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all z-[9999] shadow-2xl uppercase tracking-wider">
                  {item.tip}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#161b2e] border-l border-b border-white/10 rotate-45" />
                </div>
              )}

              {/* Badge */}
              {badge ? (
                <span className="absolute top-1.25 right-1.25 min-w-3.5 h-3.5 bg-psim-red rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.75 shadow-[0_0_5px_rgba(255,59,92,0.4)]">
                  {badge}
                </span>
              ) : null}

              {/* Active Indicator Bar */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5.5 bg-psim-accent rounded-r-[3px] scale-x-0 group-has-[.active]:scale-x-100 transition-transform origin-left" />
            </Link>

            {/* Submenu for Config */}
            {isConfig && (
              <div className="absolute left-full top-0 ml-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-x-1 transition-all z-[9999]">
                <div className="bg-[#111625] border border-white/10 rounded-xl shadow-2xl py-3 px-1 w-[240px] flex flex-col gap-4 overflow-hidden relative">
                  {/* Decorative background accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-psim-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                  
                  {configSubItems.map((group, gIdx) => (
                    <div key={gIdx} className="flex flex-col gap-1 px-2 relative z-10">
                      <div className="px-3 mb-1.5 flex items-center gap-2">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{group.group}</span>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                      
                      <div className="flex flex-col gap-0.5">
                        {group.items.map((sub, sIdx) => {
                          const SubIcon = sub.icon;
                          return (
                            <Link
                              key={sIdx}
                              to={sub.path as any}
                              activeProps={{ className: 'bg-psim-accent/15 text-psim-accent border-psim-accent/20' }}
                              inactiveProps={{ className: 'text-t2 hover:bg-white/5 hover:text-t1 border-transparent' }}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11.5px] font-semibold transition-all border group/sub"
                            >
                              <div className={cn(
                                "p-1.5 rounded-md transition-colors",
                                "group-hover/sub:bg-psim-accent/10 group-[.active]/sub:bg-psim-accent/20"
                              )}>
                                <SubIcon size={14} className="shrink-0" />
                              </div>
                              <span className="whitespace-nowrap tracking-tight">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Visual Connector Arrow */}
                <div className="absolute top-4 -left-1 w-2 h-2 bg-[#111625] border-l border-b border-white/10 rotate-45 z-0" />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
