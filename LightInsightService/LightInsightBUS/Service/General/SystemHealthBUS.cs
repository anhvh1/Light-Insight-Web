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
using Microsoft.Extensions.Caching.Memory;
using System.Linq;

namespace LightInsightBUS.Service.General
{
    public class SystemHealthBUS : ISystemHealth
    {
        private readonly IConnectors _connectorService;
        private readonly MilestoneHealthBUS _milestoneProvider;
        private readonly IMemoryCache _cache;

        public SystemHealthBUS(
            IConnectors connectorService, 
            MilestoneHealthBUS milestoneProvider, 
            IMemoryCache cache)
        {
            _connectorService = connectorService;
            _milestoneProvider = milestoneProvider;
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
            
            // Robust matching: Use NetBIOS name (first part of hostname) for the cache key
            string lookupKey = report.ServerId.Split('.')[0].ToUpper();
            
            // New Diagnostic Log
            Console.WriteLine($"[AGENT] Received metrics for machine: {lookupKey} (CPU: {report.CpuUsage}% | RAM: {report.RamUsage}%)");

            // Lưu vào Cache (Hết hạn sau 10 phút nếu không có report mới)
            _cache.Set($"AGENT_METRIC_{lookupKey}", report, TimeSpan.FromMinutes(10));

            return new BaseResultModel { Status = 1, Message = "Report received" };
        }

        private void MergeAgentMetrics(InfrastructureHealth item)
        {
            if (item.Type != "server" && item.Type != "storage") return;

            // Robust matching: Split by '.' to handle FQDN (win-8brd.light.local) vs NetBIOS (win-8brd)
            string rawKey = item.MachineName ?? item.Name;
            string lookupKey = rawKey.Split('.')[0].ToUpper();

            if (_cache.TryGetValue($"AGENT_METRIC_{lookupKey}", out MilestoneServerMetric metrics))
            {
                if (item.Type == "server")
                {
                    item.CpuUsage = metrics.CpuUsage;
                    item.RamUsage = metrics.RamUsage;
                    item.TotalRamGb = metrics.TotalRamGb;
                    item.FreeRamGb = metrics.FreeRamGb;
                    item.Description = $"CPU {metrics.CpuUsage}% · RAM {metrics.RamUsage}% · Disks: {metrics.Disks.Count}";
                }

                // Map all disks for the server view
                item.Disks = metrics.Disks.Select(d => new InfrastructureDisk {
                    DriveName = d.DriveName,
                    UsagePercentage = d.UsagePercentage,
                    TotalSize = d.TotalSizeGb,
                    FreeSpace = d.FreeSpaceGb
                }).ToList();

                // If this is a specific storage item, try to find the matching disk metric
                if (item.Type == "storage")
                {
                    // Description usually contains "Disk path: C:\..."
                    var matchingDisk = metrics.Disks.FirstOrDefault(d => 
                        !string.IsNullOrEmpty(item.Description) && 
                        item.Description.Contains(d.DriveName, StringComparison.OrdinalIgnoreCase));

                    if (matchingDisk != null)
                    {
                        item.DiskUsage = matchingDisk.UsagePercentage;
                        item.Description = $"{matchingDisk.DriveName} | Free {matchingDisk.FreeSpaceGb}GB / {matchingDisk.TotalSizeGb}GB";
                    }
                }
            }
        }
    }
}
