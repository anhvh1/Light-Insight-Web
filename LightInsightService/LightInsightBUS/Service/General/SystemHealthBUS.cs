using LightInsightBUS.ExternalServices.MileStone;
using LightInsightBUS.Interfaces.Connectors;
using LightInsightBUS.Interfaces.General;
using LightInsightModel.Connectors;
using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.General
{
    public class SystemHealthBUS : ISystemHealth
    {
        private readonly IConnectors _connectorService;
        private readonly GetAnalyticsEvents _tokenService;
        private readonly MilestoneSystemProber _milestoneProber;

        public SystemHealthBUS(IConnectors connectorService, GetAnalyticsEvents tokenService, MilestoneSystemProber milestoneProber)
        {
            _connectorService = connectorService;
            _tokenService = tokenService;
            _milestoneProber = milestoneProber;
        }

        public async Task<BaseResultModel> GetSystemHealth()
        {
            var result = new SystemHealthModel();
            
            try
            {
                // 1. CHỈ HIỂN THỊ MANAGEMENT SERVER (Dữ liệu thật từ máy chủ)
                result.Infrastructure.Add(await GetLocalServerHealth());

                // 2. QUÉT CONNECTORS (Giữ nguyên vì phần này đang ổn định)
                var connectorsRes = await _connectorService.GetAllConnectorsAsync();
                var connectorList = connectorsRes.Data as List<ConnectorListModel> ?? new List<ConnectorListModel>();
                var probeTasks = connectorList.Select(conn => ProbeConnectorAsync(conn)).ToList();
                var connectorResults = await Task.WhenAll(probeTasks);
                result.Connectors.AddRange(connectorResults.Where(r => r != null));

                return new BaseResultModel { Status = 1, Message = "Success", Data = result };
            }
            catch (Exception ex)
            {
                return new BaseResultModel { Status = -1, Message = "Error: " + ex.Message };
            }
        }

        private async Task<InfrastructureHealth> GetLocalServerHealth()
        {
            string cpu = $"{_milestoneProber.GetCurrentCpuUsage()}%";
            string ram = "N/A";
            string disk = "N/A";

            try {
                // RAM
                var memStatus = GC.GetGCMemoryInfo();
                if (memStatus.TotalAvailableMemoryBytes > 0)
                    ram = $"{(memStatus.MemoryLoadBytes * 100) / memStatus.TotalAvailableMemoryBytes}%";

                // DISK (Ổ cài đặt)
                if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                    var driveC = new DriveInfo("C");
                    if (driveC.IsReady)
                        disk = $"{(int)((driveC.TotalSize - driveC.AvailableFreeSpace) * 100 / driveC.TotalSize)}%";
                }
            } catch { }

            return new InfrastructureHealth { 
                Name = "Management Server", 
                Description = $"CPU {cpu} · RAM {ram} · Disk {disk}", 
                Status = "ONLINE", 
                Type = "server" 
            };
        }

        private async Task<ConnectorHealth> ProbeConnectorAsync(ConnectorListModel conn)
        {
            var health = new ConnectorHealth {
                Name = conn.VmsName,
                ApiInfo = $"{conn.IpServer}:{conn.Port}",
                StatsLabel = "Status",
                Status = "OFFLINE",
                Latency = "0ms",
                HealthPercentage = 0,
                EventsPerMin = "0",
                Stats = "Disconnected"
            };

            var sw = Stopwatch.StartNew();
            try {
                bool isReachable = await CheckConnectivityAsync(conn.IpServer, (int)conn.Port);
                sw.Stop();

                if (isReachable) {
                    health.Status = sw.ElapsedMilliseconds > 500 ? "SLOW" : "ONLINE";
                    health.Latency = $"{sw.ElapsedMilliseconds}ms";
                    health.HealthPercentage = 100;
                    health.Stats = "Connected";

                    if (conn.VmsName.Contains("Milestone", StringComparison.OrdinalIgnoreCase)) {
                        var token = await _tokenService.GetTokenAsync();
                        if (!string.IsNullOrEmpty(token)) {
                            var cameras = await _tokenService.GetCamerasAsync();
                            health.Stats = $"{cameras.Count} / {cameras.Count}";
                            health.StatsLabel = "Cameras";
                        }
                    }
                }
            } catch { health.Status = "OFFLINE"; }
            return health;
        }

        private async Task<bool> CheckConnectivityAsync(string ip, int port)
        {
            try {
                using var client = new TcpClient();
                var task = client.ConnectAsync(ip, port);
                if (await Task.WhenAny(task, Task.Delay(1000)) == task) {
                    await task;
                    return client.Connected;
                }
                return false;
            } catch { return false; }
        }
    }
}
