using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using LightInsightModel.MileStone.General;
using LightInsightModel.Connectors;

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
            
            // Khởi tạo HttpClient bỏ qua lỗi SSL (thường gặp ở server Milestone nội bộ)
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
                        _logger.LogError($"[MilestoneHealth] Error: {ex.Message}");
                    }
                }

                await Task.Delay(30000, stoppingToken); // Cập nhật mỗi 30 giây
            }
        }

        private async Task UpdateRealHealthData(ConnectorListModel config, string token)
        {
            string baseUrl = $"http://{config.IpServer}:{config.Port}/api/rest/v1";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // 1. Lấy danh sách Recording Servers
            var serversJson = await _httpClient.GetStringAsync($"{baseUrl}/recordingServers");
            using var doc = JsonDocument.Parse(serversJson);
            
            var metricsList = new List<MilestoneServerMetric>();

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

                    // 2. Lấy CPU/RAM (MIP VMS API cung cấp thông tin này trong trạng thái server)
                    try {
                        // Lưu ý: Tùy phiên bản Milestone, endpoint performance có thể khác nhau. 
                        // Ở đây ta lấy thông tin cơ bản từ server detail nếu có.
                        metric.CpuUsage = 0; // Sẽ cập nhật từ Performance Counter API nếu có
                        metric.RamUsage = 0;
                    } catch { }

                    // 3. Lấy thông tin Disk (Storages)
                    try {
                        var storageJson = await _httpClient.GetStringAsync($"{baseUrl}/recordingServers/{id}/storages");
                        using var storageDoc = JsonDocument.Parse(storageJson);
                        if (storageDoc.RootElement.TryGetProperty("array", out var storages))
                        {
                            foreach (var storage in storages.EnumerateArray())
                            {
                                // Giả sử API trả về dung lượng. Nếu không, ta sẽ cần tính toán từ các thuộc tính khác.
                                metric.Disks.Add(new MilestoneDiskMetric {
                                    DriveName = storage.GetProperty("name").GetString(),
                                    UsagePercentage = 0 // Tính toán từ FreeSpace/TotalSize
                                });
                            }
                        }
                    } catch { }

                    metricsList.Add(metric);
                }
            }

            _cache.Set("MILESTONE_SERVER_METRICS", metricsList);
            _logger.LogInformation($"[MilestoneHealth] Fetched health for {metricsList.Count} servers.");
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
