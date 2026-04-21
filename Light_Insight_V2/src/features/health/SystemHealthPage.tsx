import { useEffect, useMemo, useState } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import * as signalR from '@microsoft/signalr';
import { cn } from '@/lib/utils';
import { 
  RefreshCcw, 
  ShieldCheck,
} from 'lucide-react';
import { systemHealthApi, type AuditLog } from '@/lib/system-health-api';

const AUDIT_HUB_URL = import.meta.env.VITE_ALARM_HUB_URL ? `${import.meta.env.VITE_ALARM_HUB_URL.replace(/\/$/, '')}/audit-log-hub` : '';

const StatusText = ({ status }: { status: string }) => {
  const isOnline = status === 'ONLINE' || status === 'CHỜ';
  const isOffline = status === 'OFFLINE';
  const isDisconnected = status === 'DISCONNECTED';
  const isBad = status === 'BAD';
  return (
    <span className={cn(
      "text-[10px] font-bold font-mono whitespace-nowrap uppercase tracking-wider",
      isOnline ? "text-psim-green" : 
      isOffline ? "text-psim-red" : 
      isDisconnected ? "text-psim-orange" : 
      isBad ? "text-psim-red" : "text-psim-orange"
    )}>
      {status}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const isOnline = status === 'ONLINE' || status === 'CHỜ';
  const isOffline = status === 'OFFLINE';
  const isDisconnected = status === 'DISCONNECTED';
  const isBad = status === 'BAD';
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-[4px] text-[10px] font-bold font-mono border whitespace-nowrap uppercase tracking-wider",
      isOnline ? "bg-psim-green/15 text-psim-green border-psim-green/30" :
      isOffline ? "bg-psim-red/15 text-psim-red border-psim-red/30" :
      isDisconnected ? "bg-psim-orange/15 text-psim-orange border-psim-orange/30" :
      isBad ? "bg-psim-red/15 text-psim-red border-psim-red/30" :
      "bg-psim-orange/15 text-psim-orange border-psim-orange/30"
    )}>
      {status}
    </span>
  );
};

const UsageBar = ({ label, value, colorClass, detail }: { label: string, value: number, colorClass: string, detail?: string }) => (
  <div className="flex flex-col gap-0.5 mt-1.5 first:mt-2">
    <div className="flex justify-between items-end text-[9px] font-mono font-bold uppercase tracking-tighter">
      <div className="flex flex-col">
        <span className="text-t-2 leading-none">{label}</span>
        {detail && <span className="text-[8px] opacity-40 font-normal normal-case mt-0.5 leading-none">{detail}</span>}
      </div>
      <span className={cn("text-t-1", value > 90 ? "text-psim-red" : value > 70 ? "text-psim-orange" : "text-psim-green")}>{value}%</span>
    </div>
    <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-0.5">
      <div 
        className={cn("h-full rounded-full transition-all duration-500", colorClass)} 
        style={{ width: `${Math.min(value, 100)}%` }} 
      />
    </div>
  </div>
);

export function SystemHealthPage() {
  const queryClient = useQueryClient();
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  // 1. Fetch Health Status
  const { data: healthResponse, isLoading: isLoadingHealth, refetch: refetchHealth, isRefetching: isRefetchingHealth } = useQuery({
    queryKey: ['system-health-status'],
    queryFn: systemHealthApi.getStatus,
    refetchInterval: 30000,
  });

  // Tự động chọn Connector đầu tiên khi dữ liệu tải xong
  useEffect(() => {
    if (healthResponse?.Data?.Connectors?.length && !selectedConnectorId) {
      setSelectedConnectorId(healthResponse.Data.Connectors[0].ApiInfo.split(':')[0]);
    }
  }, [healthResponse, selectedConnectorId]);

  // 2. Infinite Query for Audit Logs
  const { 
    data: logsData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    refetch: refetchLogs
  } = useInfiniteQuery({
    queryKey: ['audit-logs-infinite'],
    queryFn: ({ pageParam = 1 }) => systemHealthApi.getAuditLogs(pageParam, 50),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const currentTotal = allPages.flatMap(p => p.Data || []).length;
      return currentTotal < (lastPage.TotalRow || 0) ? allPages.length + 1 : undefined;
    },
  });

  const auditLogs = useMemo(() => {
    return logsData?.pages.flatMap(page => page.Data || []) || [];
  }, [logsData]);

  // 3. SignalR for Real-time Pushes
  useEffect(() => {
    if (!AUDIT_HUB_URL) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(AUDIT_HUB_URL, {withCredentials:false})
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveAuditLog', (newLog: AuditLog) => {
      queryClient.setQueryData(['audit-logs-infinite'], (old: any) => {
        if (!old) return old;
        const firstPage = old.pages[0];
        return {
          ...old,
          pages: [
            {
              ...firstPage,
              Data: [newLog, ...(firstPage.Data || [])],
              TotalRow: (firstPage.TotalRow || 0) + 1
            },
            ...old.pages.slice(1)
          ]
        };
      });
    });

    connection.on('HealthUpdate', (state: any) => {
      queryClient.setQueryData(['system-health-status'], (old: any) => {
        if (!old || !old.Data) return old;
        const newConnectors = old.Data.Connectors.map((c: any) => {
          if (c.Name === state.Name) { // Simplified matching for now
            return {
              ...c,
              Latency: `${state.LatencyMs}ms`,
              Stats: `${state.OnlineCameras} / ${state.TotalCameras}`,
              Status: state.Status,
              Description: `Real-time: ${state.OnlineCameras}/${state.TotalCameras} cams online, ${state.LatencyMs}ms latency`
            };
          }
          return c;
        });
        return { ...old, Data: { ...old.Data, Connectors: newConnectors } };
      });
    });

    connection.on('ReceiveAgentMetrics', (report: any) => {
      const sId = report.serverId || report.ServerId;
      const cpu = report.cpuUsage || report.CpuUsage;
      const ram = report.ramUsage || report.RamUsage;
      const totalRam = report.totalRamGb || report.TotalRamGb;
      const freeRam = report.freeRamGb || report.FreeRamGb;
      const rawDisks = report.disks || report.Disks || [];
      
      const disks = rawDisks.map((d: any) => ({
        DriveName: d.driveName || d.DriveName,
        UsagePercentage: d.usagePercentage || d.UsagePercentage,
        TotalSize: d.totalSizeGb || d.TotalSizeGb,
        FreeSpace: d.freeSpaceGb || d.FreeSpaceGb
      }));

      queryClient.setQueryData(['system-health-status'], (old: any) => {
        if (!old || !old.Data) return old;
        const newInfra = old.Data.Infrastructure.map((item: any) => {
          const matchKey = item.MachineName || item.Name;
          if (matchKey.toLowerCase() === sId.toLowerCase()) {
            return {
              ...item,
              CpuUsage: cpu,
              RamUsage: ram,
              TotalRamGb: totalRam,
              FreeRamGb: freeRam,
              Disks: disks,
              Description: item.Type === 'server' 
                ? `CPU ${cpu}% • RAM ${ram}% • Disks: ${disks.length}`
                : item.Description // Keep Path for storage
            };
          }
          return item;
        });
        return { ...old, Data: { ...old.Data, Infrastructure: newInfra } };
      });
    });

    connection.start().catch(err => console.error('Audit Hub Connection Failed: ', err));

    return () => {
      connection.stop();
    };
  }, [queryClient]);

  const handleRefresh = () => {
    refetchHealth();
    refetchLogs();
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const connectors = healthResponse?.Data?.Connectors || [];
  const allInfrastructure = healthResponse?.Data?.Infrastructure || [];

  // LỌC VÀ NHÓM INFRASTRUCTURE THEO MÁY CHỦ (MACHINE)
  const groupedInfrastructure = useMemo(() => {
    const filtered = allInfrastructure.filter(item => 
      item.ConnectorId === selectedConnectorId || item.ConnectorId === 'LOCAL'
    );

    const groups: Record<string, typeof allInfrastructure> = {};
    filtered.forEach(item => {
      const groupKey = item.MachineName || (item.ConnectorId === 'LOCAL' ? 'LOCAL' : 'Unknown');
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });

    return groups;
  }, [allInfrastructure, selectedConnectorId]);

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      <header className="h-12 border-b border-white/5 bg-bg1 flex items-center px-3 shrink-0">
        <h1 className="text-[15px] font-semibold text-t-0 tracking-tight">Tình trạng hệ thống & kết nối</h1>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] text-t-2 font-mono tracking-widest">
            Lần đồng bộ gần nhất: {new Date().toLocaleTimeString()}
          </div>
          <button onClick={handleRefresh} disabled={isLoadingHealth || isRefetchingHealth} className="bg-bg-3 border border-white/10 hover:bg-bg4 text-t1 hover:text-t0 h-7 px-3 rounded-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
            <RefreshCcw size={12} className={cn((isLoadingHealth || isRefetchingHealth) && "animate-spin text-psim-accent")} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Làm mới</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden gap-px">
        <div className="w-1/2 flex flex-col overflow-hidden bg-bg-0">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="sticky top-0 bg-bg-0 z-10 px-3 py-3 shrink-0"><h2 className="text-[10px] font-mono font-bold text-t-2 uppercase tracking-[0.12em]">Kết nối VMS & Thiết bị</h2></div>
            <div className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-thin scrollbar-thumb-psim-accent/20">
              {isLoadingHealth && !isRefetchingHealth ? <div className="h-full flex items-center justify-center opacity-30 uppercase font-bold text-[11px] animate-pulse">Đang đồng bộ...</div> : (
                <div className="grid grid-cols-2 gap-2">
                  {connectors.map((c, i) => {
                    const connectorIp = c.ApiInfo.split(':')[0];
                    const isSelected = selectedConnectorId === connectorIp;
                    return (
                      <div 
                        key={i} 
                        onClick={() => setSelectedConnectorId(connectorIp)}
                        className={cn(
                          "bg-bg-2 border rounded-lg p-3 flex flex-col gap-1 shadow-sm transition-all cursor-pointer",
                          isSelected ? "border-psim-green shadow-psim-green/10" : "border-white/5 hover:border-white/10",
                          c.Status === 'OFFLINE' && "opacity-60 grayscale-[0.5]"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className={cn("text-[13px] font-semibold tracking-tight uppercase", c.Name.includes('Milestone') ? "text-psim-green" : "text-t1")}>{c.Name}</h3>
                          {/* {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-psim-green animate-pulse" />} */}
                        </div>
                        <p className="text-[10px] text-t-2 font-mono mt-0.5">IP: {c.ApiInfo}</p>
                        <div className="space-y-1 mt-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-t-2">Độ trễ</span>
                            <span className={cn(
                              "font-mono font-bold", 
                              c.Status === 'BAD' || c.Status === 'OFFLINE' ? "text-psim-red" : 
                              c.Status === 'SLOW' || c.Status === 'DISCONNECTED' ? "text-psim-orange" : 
                              "text-psim-green"
                            )}>{c.Latency}</span>
                          </div>
                          <div className="flex justify-between text-[11px]"><span className="text-t-2">{c.StatsLabel}</span><span className="font-semibold text-t1">{c.Stats}</span></div>
                          <div className="flex justify-between text-[11px] items-center"><span className="text-t-2">Trạng thái</span><StatusText status={c.Status} /></div>
                        </div>
                        <div className="h-1 bg-bg4 rounded-full mt-1 overflow-hidden">
                          <div className={cn(
                            "h-full rounded-full transition-all duration-1000", 
                            c.Status === 'BAD' || c.Status === 'OFFLINE' ? "bg-psim-red" : 
                            c.Status === 'SLOW' || c.Status === 'DISCONNECTED' ? "bg-psim-orange" : 
                            "bg-psim-green"
                          )} style={{ 
                            width: `${c.Status === 'ONLINE' ? 100 : c.Status === 'SLOW' ? 70 : c.Status === 'BAD' ? 40 : 0}%` 
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-t border-white/5">
            <div className="sticky top-0 bg-bg-0 z-10 px-3 py-3 shrink-0 flex items-center justify-between">
              <h2 className="text-[10px] font-mono font-bold text-t-2 uppercase tracking-[0.12em]">Hạ tầng hệ thống</h2>
              {/* <span className="text-[9px] font-bold text-psim-accent bg-psim-accent/10 px-2 py-0.5 rounded uppercase">{selectedConnectorId || 'Global'} View</span> */}
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-thin scrollbar-thumb-psim-accent/20">
              <div className="flex flex-col gap-4">
                {Object.keys(groupedInfrastructure).length > 0 ? Object.entries(groupedInfrastructure).map(([machineName, items], mi) => {
                  const machineStats = items.find(item => item.CpuUsage !== undefined);
                  return (
                    <div key={mi} className="bg-bg-2/40 border border-white/5 rounded-xl overflow-hidden shadow-sm">
                      {/* Machine Header with Hardware Metrics */}
                      <div className="bg-white/5 px-4 py-2.5 flex flex-col gap-1 border-b border-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-t0 uppercase tracking-tight">{machineName}</span>
                          </div>
                          {/* <div className="flex items-center gap-2">
                            {machineStats ? <span className="text-[8px] text-psim-green font-bold uppercase tracking-widest">AGENT</span> : null}
                          </div> */}
                        </div>
                        
                        {machineStats && (
                          <div className="grid grid-cols-2 gap-x-4">
                            <UsageBar label="CPU" value={machineStats.CpuUsage || 0} colorClass={machineStats.CpuUsage! > 80 ? "bg-psim-red" : "bg-psim-green"} />
                            <UsageBar 
                              label="RAM" 
                              value={machineStats.RamUsage || 0} 
                              colorClass={(machineStats.RamUsage || 0) > 80 ? "bg-psim-red" : "bg-psim-green"}
                              detail={machineStats.TotalRamGb ? `${machineStats.FreeRamGb}GB free` : undefined}
                            />
                          </div>
                        )}
                      </div>

                      {/* Machine Child Items (Recording Servers & Storage) */}
                      <div className="p-1.5 flex flex-col gap-1">
                        {items.map((item, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 bg-bg-2/30 border border-white/[0.02] rounded-lg group">
                            <div className="text-[14px] opacity-70 group-hover:opacity-100 transition-all shrink-0">
                              {item.Type === 'camera' ? '📷' : item.Type === 'storage' ? '💾' : '⚙️'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={cn("text-[11px] font-semibold tracking-tight truncate uppercase", item.Status === 'OFFLINE' ? "text-psim-red" : "text-t1")}>{item.Name}</div>
                              <div className="text-[9px] text-t-2 font-mono uppercase tracking-tighter opacity-50">{item.Description}</div>
                              
                              {/* Storage-specific usage bar */}
                              {item.Type === 'storage' && item.Disks && item.Disks.length > 0 && (
                                <div className="mt-1 max-w-[90%]">
                                  {item.Disks.filter(d => item.Description.includes(d.DriveName.replace('\\','')) || item.Disks!.length === 1).map((disk, di) => (
                                    <UsageBar 
                                      key={di} 
                                      label={`Disk ${disk.DriveName}`} 
                                      value={disk.UsagePercentage} 
                                      colorClass={disk.UsagePercentage > 90 ? "bg-psim-red" : "bg-psim-green"}
                                      detail={`${disk.FreeSpace}GB free / ${disk.TotalSize}GB`}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                            <StatusBadge status={item.Status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-10 text-center opacity-20 text-[11px] uppercase font-bold tracking-widest italic">Không có dữ liệu hạ tầng cho kết nối này</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="w-1/2 border-l border-white/5 bg-bg1/50 flex flex-col overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-bg1">
            <h2 className="text-[10px] font-mono font-bold text-t-2 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={14} className="text-psim-accent" />Nhật ký hệ thống</h2>
            <div className="flex items-center gap-2">
               {isFetchingNextPage && <RefreshCcw size={12} className="animate-spin text-t2" />}
            </div>
          </div>
          
          <div onScroll={handleScroll} className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-psim-accent/20">
            <div className="flex flex-col">
              {auditLogs.map((log, i) => (
                <div key={log.Id || i} className="px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors flex gap-3 items-start group animate-in slide-in-from-top duration-500">
                  <div className="text-[10px] font-mono text-t-2 w-14 shrink-0 pt-0.5 group-hover:text-t1 transition-colors font-bold">
                    {new Date(log.CreatedAt).toLocaleTimeString('vi-VN', { hour12: false })}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="text-[12px] leading-tight mb-0.5">
                      <span className="font-bold text-psim-accent uppercase tracking-tight">@{log.Username}</span>
                      <span className="text-t-2 mx-1.5 opacity-50">•</span>
                      <span className="text-t-1 font-medium">{log.ActionType}</span>
                    </div>
                    <div className="text-[11px] text-t-2 leading-relaxed opacity-80">{log.Description}</div>
                    {log.IpAddress && <div className="text-[9px] text-t-2 font-mono mt-1 opacity-40">IP: {log.IpAddress}</div>}
                  </div>
                </div>
              ))}
              {isFetchingNextPage && <div className="py-4 text-center text-[10px] text-t2 animate-pulse uppercase font-bold">Đang tải các nhật ký cũ...</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
