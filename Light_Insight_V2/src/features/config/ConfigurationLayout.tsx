import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Zap, 
  ClipboardList, 
  Plug2, 
  BellRing, 
  ShieldCheck,
  Sliders,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Link, Outlet, useLocation } from '@tanstack/react-router';

export function ConfigurationLayout() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'roles', label: 'User & Roles', icon: Users, group: 'Admin', path: '/config/users-roles' },
    { id: 'rules', label: 'Rule & Alarm Config', icon: Zap, group: 'Admin', path: '/config/rules' },
    { id: 'priority', label: 'Alarm Priority V3', icon: Sliders, group: 'Admin', path: '/config/priority' },
    { id: 'sop', label: 'SOP Builder', icon: ClipboardList, group: 'Admin', path: '/config/sop' },
    { id: 'connectors', label: 'Connectors', icon: Plug2, group: 'Admin', path: '/config/connectors' },
    { id: 'map_management', label: 'Map Management', icon: MapIcon, group: 'Admin', path: '/config/map' },
    { id: 'escalation', label: 'Escalation Rules', icon: ShieldCheck, group: 'Hệ thống', path: '/config/escalation' },
    { id: 'notif', label: 'Notifications', icon: BellRing, group: 'Hệ thống', path: '/config/notif' },
  ];

  return (
    <div className="flex flex-col h-full bg-bg0 overflow-hidden relative">
      {/* Header */}
      <header className="h-12 border-b border-white/5 bg-bg1 flex items-center px-3 shrink-0">
        <h1 className="text-[15px] font-semibold text-t-0 tracking-tight">
          Configuration & Administration
        </h1>
        <div className="ml-auto text-[10px] text-t-2 font-mono uppercase tracking-widest bg-bg2 px-3 py-1 rounded border border-border-dim text-white">
          Admin Mode — SuperUser
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className={cn(
          "border-r border-border-dim bg-bg0 flex flex-col transition-all duration-300 shrink-0 bg-bg-1 relative z-[50]",
          isCollapsed ? "w-[64px]" : "w-[240px]"
        )}>
          <div className={cn(
            "flex-1 flex flex-col p-3 gap-6 scrollbar-none",
            isCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"
          )}>
            <div>
              <div className={cn(
                "text-[10px] font-bold text-t-2 uppercase tracking-[0.2em] mb-3 transition-all duration-300",
                isCollapsed ? "opacity-0 overflow-hidden" : "opacity-100"
              )}>
                <div className="whitespace-nowrap">Nhóm 4 — Quản trị</div>
              </div>
              <div className="flex flex-col gap-1">
                {navItems.filter(i => i.group === 'Admin').map((item) => (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-all group relative",
                      currentPath === item.path ? "bg-psim-accent/15 text-psim-accent" : "text-t-2 hover:bg-bg2 hover:text-t-1"
                    )}
                  >
                    <item.icon size={18} className={cn("shrink-0", currentPath === item.path ? "text-psim-accent" : "text-t-2 group-hover:text-t-1")} />
                    <div className={cn(
                      "transition-all duration-300 overflow-hidden",
                      isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
                    )}>
                      <span className="whitespace-nowrap">{item.label}</span>
                    </div>
                    
                    {/* Tooltip for collapsed mode - Simplified and Robust */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-[#1a2236] text-white text-[11px] font-bold rounded-lg whitespace-nowrap border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all z-[9999] shadow-2xl uppercase tracking-wider block">
                        {item.label}
                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#1a2236] border-l border-b border-white/10 rotate-45" />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className={cn(
                "text-[10px] font-bold text-t-2 uppercase tracking-[0.2em] mb-3 transition-all duration-300",
                isCollapsed ? "opacity-0 overflow-hidden" : "opacity-100"
              )}>
                <div className="whitespace-nowrap">Hệ thống</div>
              </div>
              <div className="flex flex-col gap-1">
                {navItems.filter(i => i.group === 'Hệ thống').map((item) => (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-all group relative",
                      currentPath === item.path ? "bg-psim-accent/15 text-psim-accent" : "text-t-2 hover:bg-bg2 hover:text-t-1"
                    )}
                  >
                    <item.icon size={18} className={cn("shrink-0", currentPath === item.path ? "text-psim-accent" : "text-t-2 group-hover:text-t-1")} />
                    <div className={cn(
                      "transition-all duration-300 overflow-hidden",
                      isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
                    )}>
                      <span className="whitespace-nowrap">{item.label}</span>
                    </div>

                    {/* Tooltip for collapsed mode */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-[#1a2236] text-white text-[11px] font-bold rounded-lg whitespace-nowrap border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all z-[9999] shadow-2xl uppercase tracking-wider block">
                        {item.label}
                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#1a2236] border-l border-b border-white/10 rotate-45" />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Collapse Toggle Button */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-12 border-t border-border-dim flex items-center justify-center text-t-2 hover:text-white hover:bg-bg2 transition-all group shrink-0"
          >
            {isCollapsed ? <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" /> : (
              <div className="flex items-center gap-2">
                <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Thu gọn menu</span>
              </div>
            )}
          </button>
        </div>

        {/* Content Area - Where sub-pages render */}
        <div className="flex-1 overflow-hidden p-8 bg-bg0/10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

