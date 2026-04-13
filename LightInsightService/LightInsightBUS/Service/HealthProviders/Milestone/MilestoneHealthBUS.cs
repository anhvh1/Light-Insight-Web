using LightInsightModel.General;
using LightInsightModel.Connectors;
using LightInsightModel.MileStone.General;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using System.Linq;

namespace LightInsightBUS.Service.HealthProviders.Milestone
{
    public class MilestoneHealthBUS
    {
        private readonly HttpClient _httpClient = new HttpClient();
        private readonly IMemoryCache _cache;

        public MilestoneHealthBUS(IMemoryCache cache)
        {
            _cache = cache;
        }

        public async Task<ConnectorHealth> GetHealthAsync(ConnectorListModel config)
        {
            // 1. ƯU TIÊN LẤY DỮ LIỆU TỪ CACHE REAL-TIME CỦA SOCKET WORKER
            if (_cache.TryGetValue($"HEALTH_STATE_{config.IpServer}", out MilestoneLiveState liveState))
            {
                // TÍNH TOÁN ĐIỂM SỐ (Health Score)
                int score = 0;
                string status = liveState.Status; // "ONLINE" hoặc "OFFLINE" từ worker

                if (status == "ONLINE")
                {
                    // Nếu latency cao, chuyển trạng thái thành SLOW
                    if (liveState.LatencyMs > 500) status = "SLOW";

                    // Tỷ lệ camera online (0-100)
                    score = liveState.TotalCameras > 0 
                        ? (liveState.OnlineCameras * 100 / liveState.TotalCameras) 
                        : 100;

                    // Phạt theo độ trễ (Latency)
                    if (liveState.LatencyMs > 500) score -= 20;
                    else if (liveState.LatencyMs > 200) score -= 10;
                }

                return new ConnectorHealth
                {
                    Name = config.Name,
                    ApiInfo = $"{config.IpServer}:{config.Port}",
                    Status = status, // Sẽ trả về ONLINE, OFFLINE, hoặc SLOW
                    Latency = $"{liveState.LatencyMs}ms",
                    HealthPercentage = Math.Max(0, score),
                    StatsLabel = "Cameras",
                    Stats = $"{liveState.OnlineCameras} / {liveState.TotalCameras}",
                    Description = $"Real-time: {liveState.OnlineCameras}/{liveState.TotalCameras} cams online, {liveState.LatencyMs}ms latency"
                };
            }

            // 2. FALLBACK NẾU CACHE CHƯA CÓ (Dùng REST trực tiếp)
            var health = new ConnectorHealth
            {
                Name = config.Name,
                ApiInfo = $"{config.IpServer}:{config.Port}",
                Status = "OFFLINE",
                Latency = "0ms",
                HealthPercentage = 0,
                StatsLabel = "Cameras",
                Stats = "0 / 0",
                Description = "Polling via REST (Fallback)"
            };

            var sw = Stopwatch.StartNew();
            try
            {
                string token = await GetTokenInternalAsync(config);
                sw.Stop();
                health.Latency = $"{sw.ElapsedMilliseconds}ms";

                if (!string.IsNullOrEmpty(token))
                {
                    health.Status = sw.ElapsedMilliseconds > 500 ? "SLOW" : "ONLINE";
                    
                    var cameras = await GetCamerasInternalAsync(config, token);
                    int total = cameras.Count;
                    int online = cameras.Count(c => c.enabled); 

                    health.Stats = $"{online} / {total}";
                    
                    int score = 100;
                    if (total > 0) {
                        int offlineCount = total - online;
                        score -= (offlineCount * 100 / total);
                    } else {
                        score = 0; 
                    }

                    if (sw.ElapsedMilliseconds > 200) score -= 10;
                    if (sw.ElapsedMilliseconds > 500) score -= 20;

                    health.HealthPercentage = Math.Max(0, score);
                }
            }
            catch
            {
                health.Status = "OFFLINE";
                health.HealthPercentage = 0;
            }

            return health;
        }

        public async Task<List<InfrastructureHealth>> GetInfrastructureAsync(ConnectorListModel config)
        {
            // 1. ƯU TIÊN LẤY DỮ LIỆU TỪ CACHE REAL-TIME (Do SocketWorker cập nhật)
            if (_cache.TryGetValue($"HEALTH_STATE_{config.IpServer}", out MilestoneLiveState liveState) && liveState.Infrastructure?.Count > 0)
            {
                return liveState.Infrastructure;
            }

            var infra = new List<InfrastructureHealth>();
            
            // 2. LẤY DỮ LIỆU TỪ CACHE METRICS CHI TIẾT (Nếu có - ví dụ CPU/RAM từ worker khác)
            string cacheKey = $"MILESTONE_INFRA_{config.IpServer}";

            if (_cache.TryGetValue(cacheKey, out List<MilestoneServerMetric> metrics))
            {
                foreach (var m in metrics)
                {
                    infra.Add(new InfrastructureHealth {
                        Name = m.ServerName,
                        Description = $"Last update: {m.LastUpdate:HH:mm:ss}",
                        Status = "ONLINE",
                        Type = "server",
                        ConnectorId = config.IpServer // Thêm ID Connector để Frontend lọc
                    });

                    foreach (var disk in m.Disks)
                    {
                        infra.Add(new InfrastructureHealth {
                            Name = $"Storage: {disk.DriveName}",
                            Description = $"Free {disk.FreeSpaceGb}GB / {disk.TotalSizeGb}GB ({disk.UsagePercentage}%)",
                            Status = disk.UsagePercentage > 90 ? "SLOW" : "ONLINE",
                            Type = "storage",
                            ConnectorId = config.IpServer
                        });
                    }
                }
            }
            else
            {
                // Fallback nếu chưa có dữ liệu cache
                infra.Add(new InfrastructureHealth {
                    Name = "Milestone Management Server",
                    Description = $"VMS System @ {config.IpServer}",
                    Status = "ONLINE",
                    Type = "server",
                    ConnectorId = config.IpServer
                });
            }

            return infra;
        }

        private async Task<string> GetTokenInternalAsync(ConnectorListModel config)
        {
            try {
                string url = $"http://{config.IpServer}:{config.Port}/API/IDP/connect/token";
                var request = new HttpRequestMessage(HttpMethod.Post, url);
                request.Content = new FormUrlEncodedContent(new[] {
                    new KeyValuePair<string, string>("grant_type", "password"),
                    new KeyValuePair<string, string>("username", config.Username),
                    new KeyValuePair<string, string>("password", config.Password),
                    new KeyValuePair<string, string>("client_id", "GrantValidatorClient"),
                });

                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode) return null;

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                return doc.RootElement.GetProperty("access_token").GetString();
            } catch { return null; }
        }

        private async Task<List<MilestoneCamera>> GetCamerasInternalAsync(ConnectorListModel config, string token)
        {
            try {
                string url = $"http://{config.IpServer}:{config.Port}/API/rest/v1/cameras";
                var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode) return new List<MilestoneCamera>();

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                
                var list = new List<MilestoneCamera>();
                if (doc.RootElement.TryGetProperty("array", out var array)) {
                    foreach (var item in array.EnumerateArray()) {
                        list.Add(new MilestoneCamera {
                            id = item.GetProperty("id").GetString(),
                            name = item.GetProperty("name").GetString(),
                            enabled = item.TryGetProperty("enabled", out var e) ? e.GetBoolean() : true
                        });
                    }
                }
                return list;
            } catch { return new List<MilestoneCamera>(); }
        }

        private class MilestoneCamera {
            public string id { get; set; }
            public string name { get; set; }
            public bool enabled { get; set; }
        }
    }
}
