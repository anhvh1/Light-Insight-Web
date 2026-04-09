import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { 
  RefreshCcw, 
  ShieldCheck,
  Clock
} from 'lucide-react';
import { systemHealthApi } from '@/lib/system-health-api';

export function SystemHealthPage() {
  // 1. Fetch Health Status
  const { data: healthResponse, isLoading: isLoadingHealth, refetch: refetchHealth, isRefetching: isRefetchingHealth } = useQuery({
    queryKey: ['system-health-status'],
    queryFn: systemHealthApi.getStatus,
    refetchInterval: 30000,
  });

  // 2. Fetch Audit Logs
  const { data: logsResponse, isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['audit-logs-health'],
    queryFn: () => systemHealthApi.getAuditLogs(1, 50),
    refetchInterval: 15000, // Tự động cập nhật log nhanh hơn (15 giây)
  });

  const connectors = healthResponse?.Data?.Connectors || [];
  const infrastructure = healthResponse?.Data?.Infrastructure || [];
  const auditLogs = logsResponse?.Data || [];
  useEffect(()=> {
    console.log(auditLogs);
  },[auditLogs]);
  const handleRefresh = () => {
    refetchHealth();
    refetchLogs();
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
            Last sync: {new Date().toLocaleTimeString()} · Auto-refresh 30s
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isLoadingHealth || isRefetchingHealth}
            className="bg-bg-3 border border-white/10 hover:bg-bg4 text-t1 hover:text-t0 h-7 px-3 rounded-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCcw size={12} className={cn((isLoadingHealth || isRefetchingHealth) && "animate-spin text-psim-accent")} />
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
                VMS & Device Connectors
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-thin scrollbar-thumb-psim-accent/20">
              {isLoadingHealth && !isRefetchingHealth ? (
                <div className="h-full flex items-center justify-center opacity-30 uppercase font-bold text-[11px] tracking-widest animate-pulse">
                  Đang đồng bộ hệ thống...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {connectors.map((c, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "bg-bg-2 border border-white/5 rounded-lg p-3 flex flex-col gap-1 shadow-sm hover:border-white/10 transition-all",
                        c.Status === 'OFFLINE' && "opacity-60 grayscale-[0.5]"
                      )}
                    >
                      <div>
                        <h3 className={cn("text-[13px] font-semibold tracking-tight uppercase", 
                          c.Name.includes('Milestone') ? "text-psim-green" : 
                          c.Name.includes('BioStar') ? "text-psim-accent" :
                          c.Name.includes('BMS') ? "text-purple" : "text-t1"
                        )}>{c.Name}</h3>
                        <p className="text-[10px] text-t-2 font-mono mt-0.5">{c.ApiInfo}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-t-2">Latency</span>
                          <span className={cn("font-mono font-bold", 
                            c.Status === 'SLOW' ? "text-psim-orange" : "text-psim-green"
                          )}>{c.Latency}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-t-2">{c.StatsLabel}</span>
                          <span className="font-semibold text-t1">{c.Stats}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-t2">Events/min</span>
                          <span className="font-semibold text-t1">{c.EventsPerMin}</span>
                        </div>
                        <div className="flex justify-between text-[11px] items-center">
                          <span className="text-t-2">Status</span>
                          <StatusText status={c.Status} />
                        </div>
                      </div>

                      <div className="h-1 bg-bg4 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", 
                            c.HealthPercentage > 80 ? "bg-psim-green" : c.HealthPercentage > 50 ? "bg-psim-orange" : "bg-psim-red"
                          )}
                          style={{ width: `${c.HealthPercentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Infrastructure SECTION */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-t border-white/5">
            <div className="sticky top-0 bg-bg-0 z-10 px-3 py-3 shrink-0">
              <h2 className="text-[10px] font-mono font-bold text-t-2 uppercase tracking-[0.12em] flex items-center gap-2">
                Infrastructure
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-thin scrollbar-thumb-psim-accent/20">
              <div className="flex flex-col gap-1">
                {infrastructure.map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-3 px-3 py-2 bg-bg-2 border border-white/[0.03] rounded-[6px] hover:border-psim-accent/20 transition-all group"
                  >
                    <div className="text-[15px] grayscale group-hover:grayscale-0 transition-all shrink-0">
                      {item.Type === 'camera' ? '📷' : item.Type === 'storage' ? '💾' : '🖥️'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-[12px] font-semibold tracking-tight truncate uppercase",
                        item.Status === 'OFFLINE' ? "text-psim-red" : "text-t1"
                      )}>
                        {item.Name}
                      </div>
                      <div className="text-[10px] text-t-2 font-mono uppercase tracking-tighter">
                        {item.Description}
                      </div>
                    </div>
                    
                    <StatusBadge status={item.Status} />
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
            {isLoadingLogs && <RefreshCcw size={12} className="animate-spin text-psim-accent" />}
          </div>
          
          <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-psim-accent/20">
            <div className="flex flex-col">
              {auditLogs.length > 0 ? auditLogs.map((log, i) => (
                <div key={log.Id || i} className="px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors flex gap-3 items-start group animate-in slide-in-from-top duration-300">
                  <div className="text-[10px] font-mono text-t-2 w-14 shrink-0 pt-0.5 group-hover:text-t1 transition-colors font-bold">
                    {new Date(log.CreatedAt).toLocaleTimeString('vi-VN', { hour12: false })}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="text-[12px] leading-tight mb-0.5">
                      <span className="font-bold text-psim-accent uppercase tracking-tight">@{log.Username}</span>
                      <span className="text-t-2 mx-1.5 opacity-50">•</span>
                      <span className="text-t-1 font-medium">{log.ActionType}</span>
                    </div>
                    <div className="text-[11px] text-t-2 leading-relaxed opacity-80">
                      {log.Description}
                    </div>
                    {log.IpAddress && (
                      <div className="text-[9px] text-t-2 font-mono mt-1 opacity-40">
                        IP: {log.IpAddress}
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center opacity-20 uppercase font-bold text-[11px] tracking-widest">
                  Chưa có dữ liệu nhật ký
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
