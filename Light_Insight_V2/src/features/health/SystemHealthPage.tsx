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

const getStatusColor = (status: string) => {
  const s = status.toUpperCase();
  const isHealthy = s.includes('ONLINE') || s.includes('NORMAL') || s.includes('STARTED') || s.includes('OK') || s.includes('CONNECTED') || s.includes('AVAILABLE') || s.includes('ESTABLISHED');
  const isDanger = s.includes('OFFLINE') || s.includes('STOPPED') || s.includes('ERROR') || s.includes('CRITICAL') || s.includes('BROKEN') || s.includes('LOST') || s.includes('FAILED') || s.includes('TERMINATED') || s.includes('MAT KET NOI');
  const isWarning = s.includes('SLOW') || s.includes('BAD') || s.includes('WARNING') || s.includes('DISCONNECTED');
  
  if (isHealthy) return "text-psim-green";
  if (isDanger) return "text-psim-red";
  if (isWarning) return "text-psim-orange";
  return "text-psim-orange"; // Default
};

const getStatusBadgeClass = (status: string) => {
  const s = status.toUpperCase();
  const isHealthy = s.includes('ONLINE') || s.includes('NORMAL') || s.includes('STARTED') || s.includes('OK') || s.includes('CONNECTED') || s.includes('AVAILABLE') || s.includes('ESTABLISHED');
  const isDanger = s.includes('OFFLINE') || s.includes('STOPPED') || s.includes('ERROR') || s.includes('CRITICAL') || s.includes('BROKEN') || s.includes('LOST') || s.includes('FAILED') || s.includes('TERMINATED') || s.includes('MAT KET NOI');
  const isWarning = s.includes('SLOW') || s.includes('BAD') || s.includes('WARNING') || s.includes('DISCONNECTED');

  if (isHealthy) return "bg-psim-green/15 text-psim-green border-psim-green/30";
  if (isDanger) return "bg-psim-red/15 text-psim-red border-psim-red/30";
  if (isWarning) return "bg-psim-orange/15 text-psim-orange border-psim-orange/30";
  return "bg-psim-orange/15 text-psim-orange border-psim-orange/30";
};

const StatusText = ({ status }: { status: string }) => {
  return (
    <span className={cn(
      "text-[10px] font-bold font-mono whitespace-nowrap uppercase tracking-wider",
      getStatusColor(status)
    )}>
      {status}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-[4px] text-[10px] font-bold font-mono border whitespace-nowrap uppercase tracking-wider",
      getStatusBadgeClass(status)
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
      <span className={cn("text-t1", value > 90 ? "text-psim-red" : value > 70 ? "text-psim-orange" : "text-psim-green")}>{value}%</span>
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
          const baseMatchKey = matchKey.split('.')[0].toLowerCase();
          const baseReportId = sId.split('.')[0].toLowerCase();

          if (baseMatchKey === baseReportId) {
            return {
              ...item,
              CpuUsage: cpu,
              RamUsage: ram,
              TotalRamGb: totalRam,
              FreeRamGb: freeRam,
              Disks: disks,
              Description: item.Type === 'server' 
                ? `CPU ${cpu}% • RAM ${ram}% • Disks: ${disks.length}`
                : item.Description 
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

  // 1. NHÓM INFRASTRUCTURE (CORE: SERVERS & STORAGE)
  const groupedInfrastructure = useMemo(() => {
    const filtered = allInfrastructure.filter(item => {
      const matchesConnector = item.ConnectorId === selectedConnectorId || item.ConnectorId === 'LOCAL';
      if (!matchesConnector) return false;
      return item.Type === 'server' || item.Type === 'storage';
    });

    const groups: Record<string, typeof allInfrastructure> = {};
    filtered.forEach(item => {
      const groupKey = item.MachineName || (item.ConnectorId === 'LOCAL' ? 'LOCAL' : 'Unknown');
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [allInfrastructure, selectedConnectorId]);

  // 2. NHÓM DEVICES (HARDWARE & CAMERAS)
  const groupedDevices = useMemo(() => {
    const filtered = allInfrastructure.filter(item => {
      const matchesConnector = item.ConnectorId === selectedConnectorId;
      return matchesConnector && (item.Type === 'camera' || item.Type === 'hardware');
    });

    const groups: Record<string, typeof allInfrastructure> = {};
    filtered.forEach(item => {
      const groupKey = item.MachineName || 'Other Devices';
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
          {/* TOP: CONNECTORS */}
          <div className="shrink-0 flex flex-col min-h-0 overflow-hidden border-b border-white/5">
            <div className="px-3 py-2 shrink-0"><h2 className="text-[10px] font-mono font-bold text-t-2 uppercase tracking-[0.12em]">VMS Connectors</h2></div>
            <div className="overflow-x-auto px-3 pb-3 scrollbar-none">
              <div className="flex gap-2">
                {connectors.map((c, i) => {
                  const connectorIp = c.ApiInfo.split(':')[0];
                  const isSelected = selectedConnectorId === connectorIp;
                  return (
                    <div 
                      key={i} 
                      onClick={() => setSelectedConnectorId(connectorIp)}
                      className={cn(
                        "bg-bg-2 border rounded-lg p-2.5 flex flex-col gap-1 shadow-sm transition-all cursor-pointer min-w-[180px]",
                        isSelected ? "border-psim-green shadow-psim-green/10" : "border-white/5 hover:border-white/10",
                        c.Status === 'OFFLINE' && "opacity-60 grayscale-[0.5]"
                      )}
                    >
                      <h3 className={cn("text-[12px] font-semibold tracking-tight uppercase truncate", c.Name.includes('Milestone') ? "text-psim-green" : "text-t1")}>{c.Name}</h3>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-t-2">Độ trễ</span>
                        <span className={cn("font-mono font-bold", getStatusColor(c.Status))}>{c.Latency}</span>
                      </div>
                      <div className="flex justify-between text-[10px] items-center"><span className="text-t-2">Trạng thái</span><StatusText status={c.Status} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* MIDDLE: CORE INFRASTRUCTURE */}
            <div className="flex-[0.4] flex flex-col min-h-0 overflow-hidden border-b border-white/5">
              <div className="sticky top-0 bg-bg-0 z-10 px-3 py-2 shrink-0 border-b border-white/5">
                <h2 className="text-[10px] font-mono font-bold text-t-2 uppercase tracking-[0.12em]">Hạ tầng & Hệ thống lưu trữ</h2>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-thumb-psim-accent/20">
                <div className="flex flex-col gap-3">
                  {Object.entries(groupedInfrastructure).map(([machineName, items], mi) => {
                    const machineStats = items.find(item => item.CpuUsage !== undefined);
                    return (
                      <div key={mi} className="bg-bg-2/40 border border-white/5 rounded-lg overflow-hidden">
                        <div className="bg-white/5 px-3 py-1.5 border-b border-white/5">
                          <div className="text-[10px] font-bold text-t0 uppercase truncate">{machineName}</div>
                          {machineStats && (
                            <div className="grid grid-cols-2 gap-x-4">
                              <UsageBar label="CPU" value={machineStats.CpuUsage || 0} colorClass={machineStats.CpuUsage! > 80 ? "bg-psim-red" : "bg-psim-green"} />
                              <UsageBar label="RAM" value={machineStats.RamUsage || 0} colorClass={(machineStats.RamUsage || 0) > 80 ? "bg-psim-red" : "bg-psim-green"} />
                            </div>
                          )}
                        </div>
                        <div className="p-1 flex flex-col gap-1">
                          {items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1 bg-bg-2/30 border border-white/[0.02] rounded-md">
                              <div className="text-[11px] opacity-70">⚙️</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-semibold truncate uppercase">{item.Name}</div>
                                <div className="text-[8px] text-t-2 font-mono uppercase truncate opacity-50">{item.Description}</div>
                              </div>
                              <StatusBadge status={item.Status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* BOTTOM: DEVICE LIST (HARDWARE & CAMERAS) */}
            <div className="flex-[0.6] flex flex-col min-h-0 overflow-hidden">
              <div className="sticky top-0 bg-bg-0 z-10 px-3 py-2 shrink-0 border-b border-white/5">
                <h2 className="text-[10px] font-mono font-bold text-t-2 uppercase tracking-[0.12em]">DANH SÁCH THIẾT BỊ</h2>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-thumb-psim-accent/20 bg-bg-0/50">
                <div className="flex flex-col gap-5">
                  {Object.entries(groupedDevices).map(([machineName, devices], gi) => (
                    <div key={gi} className="space-y-2">
                      <div className="text-[9px] font-bold text-psim-accent uppercase px-1 border-l-2 border-psim-accent ml-1">{machineName}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {devices.map((device, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 px-2 py-1.5 bg-bg-2/30 border border-white/5 rounded-lg hover:bg-bg2 transition-all group">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[11px]">{device.Type === 'hardware' ? '🛡️' : '📷'}</span>
                              <span className={cn(
                                "text-[10px] font-medium truncate uppercase",
                                device.Type === 'hardware' ? "text-t0 font-bold" : "text-t1"
                              )}>{device.Name}</span>
                            </div>
                            <StatusText status={device.Status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AUDIT LOGS */}
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
