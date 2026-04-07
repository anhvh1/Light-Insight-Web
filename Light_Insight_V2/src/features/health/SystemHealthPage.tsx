import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  RefreshCcw, 
  Server, 
  Database, 
  Cctv, 
  ShieldCheck
} from 'lucide-react';

// --- MOCK DATA ---
const CONNECTORS = [
  {
    name: 'Milestone XProtect',
    api: 'Corporate v2024.1 · REST + MIP SDK',
    latency: '18ms',
    stats: '47 / 52',
    label: 'Cameras',
    events: '142',
    status: 'ONLINE',
    health: 90,
    color: 'text-psim-green',
    borderColor: 'border-psim-green/25'
  },
  {
    name: 'BioStar2 ACS',
    api: 'Suprema · REST API · :443',
    latency: '32ms',
    stats: '24 / 24',
    label: 'Doors',
    events: '18',
    status: 'ONLINE',
    health: 100,
    color: 'text-psim-accent',
    borderColor: 'border-psim-accent/25'
  },
  {
    name: 'Futech LPR',
    api: 'Parking · REST API · :8080',
    latency: '87ms',
    stats: '2 / 2',
    label: 'Barriers',
    events: '6',
    status: 'SLOW',
    health: 65,
    color: 'text-psim-orange',
    borderColor: 'border-psim-orange/20'
  },
  {
    name: 'BMS Portal',
    api: 'REST API · Webhook · :443',
    latency: '45ms',
    stats: '8 / 8',
    label: 'Zones',
    events: '4',
    status: 'ONLINE',
    health: 100,
    color: 'text-purple',
    borderColor: 'border-purple/20'
  }
];

const INFRASTRUCTURE = [
  { name: 'Recording Server 01/02', desc: 'CPU 34% · RAM 68% · Storage 78%', status: 'ONLINE', icon: Server },
  { name: 'Recording Server 03 (HA Failover)', desc: 'Standby · Last failover: 15 ngày trước', status: 'STANDBY', icon: Server },
  { name: 'NAS Storage — RAID6 · 60 ngày retention', desc: '48TB / 64TB · ~14 ngày còn lại', status: '75%', icon: Database },
  { name: 'CAM-L3-07 — Offline', desc: 'Hành lang C · Mất tín hiệu 54 phút', status: 'OFFLINE', icon: Cctv },
  { name: 'CAM-B2-03 — Offline', desc: 'Hầm B2 · Offline từ 20:30', status: 'OFFLINE', icon: Cctv },
];

const AUDIT_LOGS = [
  { time: '02:14:41', user: 'Trần Hùng', action: 'Acknowledged alarm', ctx: 'ALM-0847 · Xe không đăng ký B1' },
  { time: '02:14:36', user: 'SYSTEM', action: 'Correlation matched', ctx: '3 nguồn khớp → INC-0847 tạo tự động' },
  { time: '02:11:10', user: 'Trần Hùng', action: 'Viewed camera live', ctx: 'CAM-B1-04 · Đỗ xe sai' },
  { time: '02:08:50', user: 'Nguyễn Minh', action: 'Dispatched guard task', ctx: 'Bảo vệ → Cửa T2 · Kiểm tra thẻ' },
  { time: '01:55:25', user: 'SYSTEM', action: 'SOP auto-assigned', ctx: 'SOP-Chiếm dụng hành lang → INC-0844' },
  { time: '01:20:05', user: 'SYSTEM', action: 'Device offline alert', ctx: 'CAM-L3-07 · Video loss detected' },
  { time: '01:05:44', user: 'Nguyễn Minh', action: 'Resolved incident', ctx: 'INC-0835 · Báo cháy T4 — False alarm' },
  { time: '00:58:35', user: 'SYSTEM', action: 'Connector reconnected', ctx: 'BMS Portal · 45s downtime' },
  { time: '22:00:00', user: 'Trần Hùng', action: 'Login', ctx: 'Operator · Ca đêm 22:00–06:00' },
];

export function SystemHealthPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Status Badge and Status Text Component based on Incident Page style
  const StatusText = ({ status }: { status: string }) => {
    const isOnline = status === 'ONLINE' || status === 'STANDBY';
    const isOffline = status === 'OFFLINE';
    
    return (
      <span className={cn(
        "text-[10px] font-bold font-mono whitespace-nowrap uppercase tracking-wider",
        isOnline ? "text-psim-green" :
        isOffline ? "text-psim-red" :
        "text-psim-orange"
      )}>
        {status}
      </span>
    );
  };
  const StatusBadge = ({ status }: { status: string }) => {
    const isOnline = status === 'ONLINE' || status === 'STANDBY';
    const isOffline = status === 'OFFLINE';
    
    return (
      <span className={cn(
        "px-2 py-0.5 rounded-[4px] text-[10px] font-bold font-mono border whitespace-nowrap uppercase tracking-wider",
        isOnline ? "bg-psim-green/15 text-psim-green border-psim-green/30" :
        isOffline ? "bg-psim-red/15 text-psim-red border-psim-red/30" :
        "bg-psim-orange/15 text-psim-orange border-psim-orange/30"
      )}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      
      {/* --- 1. HEADER AREA --- */}
      <header className="h-12 border-b border-white/5 bg-bg1 flex items-center px-3 shrink-0">
        <h1 className="text-[15px] font-semibold text-t-0 tracking-tight">
          System Health & Connectors
        </h1>
        
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] text-t-2 font-mono tracking-widest">
            Last sync: 02:14:55 · Auto-refresh 30s
          </div>
          <button 
            onClick={handleRefresh}
            className="bg-bg-3 border border-white/10 hover:bg-bg4 text-t-1 hover:text-t-0 h-7 px-3 rounded-md flex items-center gap-2 transition-all active:scale-95"
          >
            <RefreshCcw size={12} className={cn(isRefreshing && "animate-spin text-psim-accent")} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Refresh now</span>
          </button>
        </div>
      </header>

      {/* --- 2. MAIN DATA AREA --- */}
      <main className="flex-1 flex overflow-hidden gap-px">
        
        {/* LEFT COLUMN: Connectors & Infrastructure (50%) */}
        <div className="w-1/2 flex flex-col overflow-hidden bg-bg-0">
          
          {/* VMS & Device Connectors SECTION */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="sticky top-0 bg-bg-0 z-10 px-3 py-3 shrink-0">
              <h2 className="text-[10px] font-mono font-bold text-t-2 uppercase tracking-[0.12em] flex items-center gap-2">
                {/* <Activity size={14} className="text-psim-accent" /> */}
                VMS & Device Connectors
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 pb-6">
              <div className="grid grid-cols-2 gap-2">
                {CONNECTORS.map((c, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "bg-bg-2 border border-white/5 rounded-lg p-3 flex flex-col gap-1 shadow-sm hover:border-white/10 transition-all"
                    )}
                  >
                    <div>
                      <h3 className={cn("text-[13px] font-semibold tracking-tight", c.color)}>{c.name}</h3>
                      <p className="text-[10px] text-t-2 font-mono mt-0.5">{c.api}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-t-2">Latency</span>
                        <span className={cn("font-mono font-bold", 
                          c.status === 'SLOW' ? "text-psim-orange" : "text-psim-green"
                        )}>{c.latency}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-t-2">{c.label}</span>
                        <span className="font-semibold text-t-1">{c.stats}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-t-2">Events/min</span>
                        <span className="font-semibold text-t-1">{c.events}</span>
                      </div>
                      <div className="flex justify-between text-[11px] items-center">
                        <span className="text-t-2">Status</span>
                        <StatusText status={c.status} />
                      </div>
                    </div>

                    <div className="h-1 bg-bg4 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-1000", 
                          c.health > 80 ? "bg-psim-green" : c.health > 50 ? "bg-psim-orange" : "bg-psim-red"
                        )}
                        style={{ width: `${c.health}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Infrastructure SECTION */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="sticky top-0 bg-bg-0 z-10 px-3 py-3 shrink-0">
              <h2 className="text-[10px] font-mono font-bold text-t-2 uppercase tracking-[0.12em] flex items-center gap-2">
                {/* <HardDrive size={14} className="text-psim-accent" /> */}
                Infrastructure
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 pb-6">
              <div className="flex flex-col gap-1">
                {INFRASTRUCTURE.map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-3 px-3 py-2 bg-bg-2 border border-white/[0.03] rounded-[6px] hover:border-psim-accent/20 transition-all group"
                  >
                    <div className="text-[15px] grayscale group-hover:grayscale-0 transition-all shrink-0">
                      {item.status === 'OFFLINE' ? '📷' : item.name.includes('NAS') ? '💾' : '🖥️'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-[12px] font-semibold tracking-tight truncate uppercase",
                        item.status === 'OFFLINE' ? "text-psim-red" : "text-t-1"
                      )}>
                        {item.name}
                      </div>
                      <div className="text-[10px] text-t-2 font-mono uppercase tracking-tighter">
                        {item.desc}
                      </div>
                    </div>
                    
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Audit Log (50%) */}
        <div className="w-1/2 border-l border-white/5 bg-bg1/50 flex flex-col overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-bg1">
            <h2 className="text-[10px] font-mono font-bold text-t-2 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={14} className="text-psim-accent" />
              Audit Log
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-1">
            <div className="flex flex-col">
              {AUDIT_LOGS.map((log, i) => (
                <div key={i} className="px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors flex gap-3 items-start group">
                  <div className="text-[10px] font-mono text-t-2 w-14 shrink-0 pt-0.5 group-hover:text-t-1 transition-colors">
                    {log.time}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="text-[12px] leading-tight">
                      <span className="font-bold text-psim-accent uppercase tracking-tight">{log.user}</span>
                      <span className="text-t-1 ml-2">{log.action}</span>
                    </div>
                    <div className="text-[11px] text-t-2 mt-0.5 truncate opacity-60 italic">
                      {log.ctx}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
