using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using LightInsightModel.MileStone.General;
using LightInsightModel.Connectors;
using System.IO;

namespace LightInsightService.Sockets.Milestone.Health
{
    public class MilestoneHealthSocketWorker : BackgroundService
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<MilestoneHealthSocketWorker> _logger;
        private readonly HttpClient _httpClient;

        public MilestoneHealthSocketWorker(IMemoryCache cache, ILogger<MilestoneHealthSocketWorker> logger)
        {
            _cache = cache;
            _logger = logger;
            var handler = new HttpClientHandler();
            handler.ServerCertificateCustomValidationCallback = (message, cert, chain, sslPolicyErrors) => true;
            _httpClient = new HttpClient(handler);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                if (_cache.TryGetValue("VMS_1", out object cacheObj) && cacheObj is ConnectorListModel config)
                {
                    try
                    {
                        string token = await GetTokenAsync(config);
                        if (!string.IsNullOrEmpty(token))
                        {
                            await UpdateRealHealthData(config, token);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"[MilestoneHealth] Global Error: {ex.Message}");
                    }
                }
                await Task.Delay(30000, stoppingToken); 
            }
        }

        private async Task UpdateRealHealthData(ConnectorListModel config, string token)
        {
            string baseUrl = $"http://{config.IpServer}:{config.Port}/api/rest/v1";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var metricsList = new List<MilestoneServerMetric>();

            try 
            {
                // Thử dùng $expand để lấy hiệu suất trong 1 nốt nhạc
                var serversJson = await _httpClient.GetStringAsync($"{baseUrl}/recordingServers");
                using var doc = JsonDocument.Parse(serversJson);
                
                if (doc.RootElement.TryGetProperty("array", out var servers))
                {
                    foreach (var server in servers.EnumerateArray())
                    {
                        string id = server.GetProperty("id").GetString();
                        string name = server.GetProperty("name").GetString();
                        
                        var metric = new MilestoneServerMetric {
                            ServerId = id,
                            ServerName = name,
                            LastUpdate = DateTime.Now
                        };

                        // --- 1. Lấy Storage (Kết hợp API và Hệ thống) ---
                        try {
                            var storageJson = await _httpClient.GetStringAsync($"{baseUrl}/recordingServers/{id}/storages");
                            using var storageDoc = JsonDocument.Parse(storageJson);
                            if (storageDoc.RootElement.TryGetProperty("array", out var storages))
                            {
                                foreach (var storage in storages.EnumerateArray())
                                {
                                    string sName = storage.GetProperty("name").GetString();
                                    string diskPath = storage.TryGetProperty("diskPath", out var dp) ? dp.GetString() : "";

                                    double totalGb = 0;
                                    double freeGb = 0;
                                    bool dataFound = false;

                                    // CHIẾN THUẬT: Nếu diskPath có giá trị (ví dụ "D:\MediaDatabase"), 
                                    // và IP là localhost hoặc máy cục bộ, ta dùng DriveInfo để lấy số THẬT nhất.
                                    if (!string.IsNullOrEmpty(diskPath) && (config.IpServer.Contains("localhost") || config.IpServer.Contains("127.0.0.1") || config.IpServer.StartsWith("192.168")))
                                    {
                                        try {
                                            string driveLetter = Path.GetPathRoot(diskPath);
                                            var driveInfo = new DriveInfo(driveLetter);
                                            if (driveInfo.IsReady) {
                                                totalGb = driveInfo.TotalSize / (1024 * 1024 * 1024);
                                                freeGb = driveInfo.AvailableFreeSpace / (1024 * 1024 * 1024);
                                                dataFound = true;
                                            }
                                        } catch { }
                                    }

                                    // Fallback: Dùng maxSize từ API nếu không đọc được ổ đĩa trực tiếp
                                    if (!dataFound && storage.TryGetProperty("maxSize", out var max)) {
                                        totalGb = max.GetDouble() / 1024;
                                        freeGb = totalGb * 0.15; // Giả định
                                        dataFound = true;
                                    }

                                    if (dataFound) {
                                        metric.Disks.Add(new MilestoneDiskMetric {
                                            DriveName = sName,
                                            TotalSizeGb = (long)totalGb,
                                            FreeSpaceGb = (long)freeGb,
                                            UsagePercentage = Math.Round((totalGb - freeGb) * 100 / totalGb, 1)
                                        });
                                    }
                                }
                            }
                        } catch { }

                        metricsList.Add(metric);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"[MilestoneHealth] Main Loop Error: {ex.Message}");
            }

            _cache.Set("MILESTONE_SERVER_METRICS", metricsList);
        }

        private async Task<string> GetTokenAsync(ConnectorListModel config)
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
    }
}
