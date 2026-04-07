using LightInsightBUS.ExternalServices.MileStone;
using LightInsightBUS.Interfaces.Connectors;
using LightInsightBUS.Interfaces.General;
using LightInsightModel.Connectors;
using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.General
{
    public class SystemHealthBUS : ISystemHealth
    {
        private readonly IConnectors _connectorService;
        private readonly GetAnalyticsEvents _milestoneService;

        public SystemHealthBUS(IConnectors connectorService, GetAnalyticsEvents milestoneService)
        {
            _connectorService = connectorService;
            _milestoneService = milestoneService;
        }

        public async Task<BaseResultModel> GetSystemHealth()
        {
            var result = new SystemHealthModel();
            
            try
            {
                // 1. Lấy danh sách Connectors từ DB/Cache
                var connectorsRes = await _connectorService.GetAllConnectorsAsync();
                var connectorList = connectorsRes.Data as List<ConnectorListModel> ?? new List<ConnectorListModel>();

                // 2. Kiểm tra Health cho từng Connector
                foreach (var conn in connectorList)
                {
                    var health = new ConnectorHealth
                    {
                        Name = conn.VmsName,
                        ApiInfo = $"http://{conn.IpServer}:{conn.Port} · REST API",
                        StatsLabel = "Devices",
                        Status = "OFFLINE",
                        Latency = "0ms",
                        HealthPercentage = 0,
                        EventsPerMin = "0",
                        Stats = "0/0"
                    };

                    // Logic riêng cho Milestone
                    if (conn.VmsName.Contains("Milestone", StringComparison.OrdinalIgnoreCase))
                    {
                        var sw = Stopwatch.StartNew();
                        try
                        {
                            // Thử lấy token để đo Latency
                            var token = await _milestoneService.CheckTokenAsync(conn.Username, conn.Password, conn.IpServer, conn.Port);
                            sw.Stop();

                            if (!string.IsNullOrEmpty(token))
                            {
                                health.Status = sw.ElapsedMilliseconds > 500 ? "SLOW" : "ONLINE";
                                health.Latency = $"{sw.ElapsedMilliseconds}ms";
                                health.ApiInfo = $"http://{conn.IpServer}:{conn.Port} · REST + MIP SDK";
                                
                                // Lấy số lượng camera thực tế
                                var cameras = await _milestoneService.GetCamerasAsync();
                                health.Stats = $"{cameras.Count} / {cameras.Count}"; 
                                health.StatsLabel = "Cameras";
                                health.EventsPerMin = new Random().Next(5, 150).ToString(); // Tạm thời random cho sinh động
                                health.HealthPercentage = 100;
                            }
                        }
                        catch (Exception)
                        {
                            health.Status = "OFFLINE";
                        }
                    }
                    else
                    {
                        // Mock cho các hệ thống khác (BioStar, Futech...)
                        health.Status = "ONLINE";
                        health.Latency = new Random().Next(20, 100) + "ms";
                        health.HealthPercentage = 100;
                        health.Stats = "OK";
                        health.EventsPerMin = "12";
                    }

                    result.Connectors.Add(health);
                }

                // 3. Mock data cho Infrastructure (Bạn sẽ cung cấp API hoặc logic sau)
                result.Infrastructure = GetMockInfrastructure();

                return new BaseResultModel
                {
                    Status = 1,
                    Message = "Get system health successfully.",
                    Data = result
                };
            }
            catch (Exception ex)
            {
                return new BaseResultModel
                {
                    Status = -1,
                    Message = "Backend Error: " + ex.Message
                };
            }
        }

        private List<InfrastructureHealth> GetMockInfrastructure()
        {
            return new List<InfrastructureHealth>
            {
                new InfrastructureHealth { Name = "Recording Server 01/02", Description = "CPU 34% · RAM 68% · Storage 78%", Status = "ONLINE", Type = "server" },
                new InfrastructureHealth { Name = "Recording Server 03 (HA Failover)", Description = "Standby · Last failover: 15 ngày trước", Status = "STANDBY", Type = "server" },
                new InfrastructureHealth { Name = "NAS Storage — RAID6", Description = "48TB / 64TB · ~14 ngày còn lại", Status = "75%", Type = "storage" },
                new InfrastructureHealth { Name = "CAM-L3-07 — Offline", Description = "Hành lang C · Mất tín hiệu 54 phút", Status = "OFFLINE", Type = "camera" }
            };
        }
    }
}
