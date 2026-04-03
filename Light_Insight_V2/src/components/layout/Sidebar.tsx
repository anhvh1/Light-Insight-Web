import { 
  Bell, 
  Map as MapIcon, 
  MonitorPlay, 
  Siren, 
  BarChart3, 
  ClipboardList, 
  Plug2, 
  Settings 
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
  { id: 'inc', icon: Siren, tip: 'Incident Mgmt', badge: 10, path: '/incident' },
  { type: 'sep' },
  { id: 'ana', icon: BarChart3, tip: 'Analytics', path: '/analytics' },
  { id: 'shift', icon: ClipboardList, tip: 'Shift Handover', path: '/shift' },
  { type: 'sep' },
  { id: 'health', icon: Plug2, tip: 'System Health', path: '/health' },
  { id: 'config', icon: Settings, tip: 'Config & Admin', path: '/config' },
];

export function Sidebar() {
  const { newCount, refreshAlarms } = useAlarmSignalR();

  return (
    <nav className="w-14.5 bg-bg-1 border-r border-border-dim flex flex-col items-center py-2 gap-0.5 overflow-hidden shrink-0 h-full">
      {navItems.map((item, idx) => {
        if (item.type === 'sep') {
          return <div key={`sep-${idx}`} className="w-7.5 h-px bg-border-dim my-1" />;
        }

        const Icon = item.icon!;
        const badge = item.id === 'alarm' ? newCount : item.badge;
        
        return (
          <Link
            key={item.id}
            to={item.path as any}
            onClick={() => {
              if (item.id === 'alarm') {
                void refreshAlarms();
              }
            }}
            activeProps={{ className: 'bg-psim-accent/15 text-psim-accent' }}
            inactiveProps={{ className: 'text-t2 hover:bg-bg3 hover:text-t1' }}
            className={cn(
              "relative w-10.5 h-10.5 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 group"
            )}
          >
            <Icon size={18} />
            
            {/* Tooltip */}
            <span className="absolute left-13 bg-bg3 text-t0 text-[11px] px-2.5 py-1 rounded-md whitespace-nowrap border border-border-brighter pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-999 shadow-xl">
              {item.tip}
            </span>

            {/* Badge */}
            {badge ? (
              <span className="absolute top-1.25 right-1.25 min-w-3.5 h-3.5 bg-psim-red rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.75 shadow-[0_0_5px_rgba(255,59,92,0.4)]">
                {badge}
              </span>
            ) : null}

            {/* Active Indicator Bar */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5.5 bg-psim-accent rounded-r-[3px] scale-x-0 group-[.active]:scale-x-100 transition-transform origin-left" />
          </Link>
        );
      })}
    </nav>
  );
}
