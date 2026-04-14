using LightInsightBUS.Interfaces.Connectors;
using LightInsightBUS.Interfaces.General;
using LightInsightModel.General;
using LightInsightModel.Connectors;
using LightInsightModel.MileStone.General;
using LightInsightBUS.Service.HealthProviders.Milestone;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.IO;
using System.Runtime.InteropServices;
using LightInsightBUS.ExternalServices.MileStone;
using Microsoft.Extensions.Caching.Memory;
using System.Linq;

namespace LightInsightBUS.Service.General
{
    public class SystemHealthBUS : ISystemHealth
    {
        private readonly IConnectors _connectorService;
        private readonly MilestoneHealthBUS _milestoneProvider;
        private readonly MilestoneSystemProber _systemProber;
        private readonly IMemoryCache _cache;

        public SystemHealthBUS(
            IConnectors connectorService, 
            MilestoneHealthBUS milestoneProvider, 
            MilestoneSystemProber systemProber,
            IMemoryCache cache)
        {
            _connectorService = connectorService;
            _milestoneProvider = milestoneProvider;
            _systemProber = systemProber;
            _cache = cache;
        }

        public async Task<BaseResultModel> GetSystemHealth()
        {
            var result = new SystemHealthModel();
            
            try
            {
                var connectorsRes = await _connectorService.GetAllConnectorsAsync();
                var connectorList = connectorsRes.Data as List<ConnectorListModel> ?? new List<ConnectorListModel>();

                foreach (var config in connectorList)
                {
                    if (config.VmsName != null && config.VmsName.Contains("Milestone", StringComparison.OrdinalIgnoreCase))
                    {
                        // 1. Lấy trạng thái Connector (Health, Latency, Camera count)
                        var health = await _milestoneProvider.GetHealthAsync(config);
                        result.Connectors.Add(health);

                        // 2. Lấy hạ tầng của riêng Connector này
                        var infra = await _milestoneProvider.GetInfrastructureAsync(config);
                        
                        // 3. Merge dữ liệu từ Agent nếu có
                        foreach(var item in infra)
                        {
                            MergeAgentMetrics(item);
                        }

                        result.Infrastructure.AddRange(infra);
                    }
                }

                // Luôn thêm thông tin Web Server nội bộ (không thuộc connector nào)
                var localServer = await GetLocalServerHealth();
                localServer.ConnectorId = "LOCAL"; 
                result.Infrastructure.Add(localServer);

                return new BaseResultModel { Status = 1, Message = "Success", Data = result };
            }
            catch (Exception ex)
            {
                return new BaseResultModel { Status = -1, Message = "Error: " + ex.Message };
            }
        }

        public async Task<BaseResultModel> ReportMetrics(MilestoneServerMetric report)
        {
            if (string.IsNullOrEmpty(report.ServerId)) return new BaseResultModel { Status = -1, Message = "ServerId is required" };

            report.LastUpdate = DateTime.Now;
            
            // Lưu vào Cache (Hết hạn sau 10 phút nếu không có report mới)
            _cache.Set($"AGENT_METRIC_{report.ServerId}", report, TimeSpan.FromMinutes(10));

            return new BaseResultModel { Status = 1, Message = "Report received" };
        }

        private void MergeAgentMetrics(InfrastructureHealth item)
        {
            if (item.Type != "server" && item.Type != "storage") return;

            // Key dựa trên tên máy (WIN-...)
            if (_cache.TryGetValue($"AGENT_METRIC_{item.Name}", out MilestoneServerMetric metrics))
            {
                item.CpuUsage = metrics.CpuUsage;
                item.RamUsage = metrics.RamUsage;
                item.TotalRamGb = metrics.TotalRamGb;
                item.FreeRamGb = metrics.FreeRamGb;
                
                if (item.Type == "server")
                {
                    item.Description = $"CPU {metrics.CpuUsage}% · RAM {metrics.RamUsage}% · Disks: {metrics.Disks.Count}";
                }
                
                // Map disks cho storage nếu cần (matching logic can be complex, here we just attach the full list)
                item.Disks = metrics.Disks.Select(d => new InfrastructureDisk {
                    DriveName = d.DriveName,
                    UsagePercentage = d.UsagePercentage,
                    TotalSize = d.TotalSizeGb,
                    FreeSpace = d.FreeSpaceGb
                }).ToList();
            }
        }

        private async Task<InfrastructureHealth> GetLocalServerHealth()
        {
            string cpu = $"{_systemProber.GetCurrentCpuUsage()}%";
            string ram = "N/A";
            string disk = "N/A";

            try {
                var memStatus = GC.GetGCMemoryInfo();
                if (memStatus.TotalAvailableMemoryBytes > 0)
                    ram = $"{(memStatus.MemoryLoadBytes * 100) / memStatus.TotalAvailableMemoryBytes}%";

                if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                    var driveC = new DriveInfo("C");
                    if (driveC.IsReady)
                        disk = $"{(int)((driveC.TotalSize - driveC.AvailableFreeSpace) * 100 / driveC.TotalSize)}%";
                }
            } catch { }

            return new InfrastructureHealth { 
                Name = "Web Server", 
                Description = $"CPU {cpu} · RAM {ram} · Disk {disk}", 
                Status = "ONLINE", 
                Type = "server" 
            };
        }
    }
}
