using LightInsightModel.General;
using LightInsightModel.Connectors;
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

        public async Task<ConnectorHealth> GetHealthAsync(ConnectorListModel config)
        {
            var health = new ConnectorHealth
            {
                Name = config.VmsName,
                ApiInfo = $"{config.IpServer}:{config.Port}",
                Status = "OFFLINE",
                Latency = "0ms",
                HealthPercentage = 0,
                StatsLabel = "Cameras",
                Stats = "0 / 0"
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
                    if (sw.ElapsedMilliseconds > 1000) score -= 40;

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
            var infra = new List<InfrastructureHealth>();
            string token = await GetTokenInternalAsync(config);
            
            if (!string.IsNullOrEmpty(token))
            {
                infra.Add(new InfrastructureHealth {
                    Name = "Management Server",
                    Description = $"Milestone VMS System @ {config.IpServer}",
                    Status = "ONLINE",
                    Type = "server"
                });

                var cameras = await GetCamerasInternalAsync(config, token);
                var offlineCameras = cameras.Where(c => !c.enabled).ToList();

                foreach (var cam in offlineCameras)
                {
                    infra.Add(new InfrastructureHealth {
                        Name = cam.name,
                        Description = "Camera Connection Lost / Disabled",
                        Status = "OFFLINE",
                        Type = "camera"
                    });
                }
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
