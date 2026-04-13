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

namespace LightInsightBUS.Service.General
{
    public class SystemHealthBUS : ISystemHealth
    {
        private readonly IConnectors _connectorService;
        private readonly MilestoneHealthBUS _milestoneProvider;
        private readonly MilestoneSystemProber _systemProber;

        public SystemHealthBUS(IConnectors connectorService, MilestoneHealthBUS milestoneProvider, MilestoneSystemProber systemProber)
        {
            _connectorService = connectorService;
            _milestoneProvider = milestoneProvider;
            _systemProber = systemProber;
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
