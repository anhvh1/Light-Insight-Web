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
  Database,
  Map as MapIcon
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Link, Outlet, useLocation } from '@tanstack/react-router';

export function ConfigurationLayout() {
  const location = useLocation();
  const currentPath = location.pathname;

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
                <Link
                  key={item.id}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-all group",
                    currentPath === item.path ? "bg-psim-accent/15 text-psim-accent" : "text-t-2 hover:bg-bg2 hover:text-t-1"
                  )}
                >
                  <item.icon size={16} className={cn(currentPath === item.path ? "text-psim-accent" : "text-t-2 group-hover:text-t-1")} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-t-2 uppercase tracking-[0.2em] mb-3 px-2">Hệ thống</div>
            <div className="flex flex-col gap-0.5">
              {navItems.filter(i => i.group === 'Hệ thống').map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-[12px] font-medium transition-all group",
                    currentPath === item.path ? "bg-psim-accent/15 text-psim-accent" : "text-t-2 hover:bg-bg2 hover:text-t-1"
                  )}
                >
                  <item.icon size={16} className={cn(currentPath === item.path ? "text-psim-accent" : "text-t-2 group-hover:text-t-1")} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area - Where sub-pages render */}
        <div className="flex-1 overflow-hidden p-8 bg-bg0/10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
