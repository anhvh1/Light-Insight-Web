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
using System.Net.Sockets;
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
                var connectorsRes = await _connectorService.GetAllConnectorsAsync();
                var connectorList = connectorsRes.Data as List<ConnectorListModel> ?? new List<ConnectorListModel>();

                var probeTasks = connectorList.Select(conn => ProbeConnectorAsync(conn)).ToList();
                var connectorResults = await Task.WhenAll(probeTasks);
                
                result.Connectors.AddRange(connectorResults.Where(r => r != null));
                result.Infrastructure = await _milestoneProber.GetInfrastructureStatusAsync();

                return new BaseResultModel { Status = 1, Message = "Success", Data = result };
            }
            catch (Exception ex)
            {
                return new BaseResultModel { Status = -1, Message = "Error: " + ex.Message };
            }
        }

        private async Task<ConnectorHealth> ProbeConnectorAsync(ConnectorListModel conn)
        {
            var health = new ConnectorHealth
            {
                Name = conn.VmsName,
                ApiInfo = $"{conn.IpServer}:{conn.Port}",
                StatsLabel = "Status",
                Status = "OFFLINE",
                Latency = "0ms",
                HealthPercentage = 0,
                EventsPerMin = "0", // Mặc định là 0, không random
                Stats = "Disconnected",
                Description = "Pending network check"
            };

            var sw = Stopwatch.StartNew();
            try
            {
                bool isReachable = await CheckConnectivityAsync(conn.IpServer, (int)conn.Port);
                sw.Stop();

                if (isReachable)
                {
                    health.Status = sw.ElapsedMilliseconds > 500 ? "SLOW" : "ONLINE";
                    health.Latency = $"{sw.ElapsedMilliseconds}ms";
                    health.HealthPercentage = 100;
                    health.Stats = "Connected";
                    health.Description = "System reachable";

                    if (conn.VmsName.Contains("Milestone", StringComparison.OrdinalIgnoreCase))
                    {
                        var token = await _tokenService.GetTokenAsync();
                        if (!string.IsNullOrEmpty(token))
                        {
                            var cameras = await _tokenService.GetCamerasAsync();
                            health.Stats = $"{cameras.Count} / {cameras.Count}";
                            health.StatsLabel = "Cameras";
                            health.EventsPerMin = "0"; // Milestone API không trả về trực tiếp, tạm để 0
                        }
                    }
                }
            }
            catch 
            { 
                health.Status = "OFFLINE"; 
            }

            return health;
        }

        private async Task<bool> CheckConnectivityAsync(string ip, int port)
        {
            try
            {
                using var client = new TcpClient();
                var task = client.ConnectAsync(ip, port);
                if (await Task.WhenAny(task, Task.Delay(1500)) == task)
                {
                    await task;
                    return client.Connected;
                }
                return false;
            }
            catch
            {
                return false;
            }
        }
    }
}
