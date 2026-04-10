using System.Net.Http.Headers;
using System.Net.WebSockets;
using System.Text;
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
        private readonly List<MilestoneServerMetric> _metricsCache = new List<MilestoneServerMetric>();

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
            // Chạy song song: 1 luồng duy trì WebSocket, 1 luồng quét REST định kỳ
            var wsTask = MaintainWebSocketConnection(stoppingToken);
            
            while (!stoppingToken.IsCancellationRequested)
            {
                if (_cache.TryGetValue("VMS_1", out object cacheObj) && cacheObj is ConnectorListModel config)
                {
                    try
                    {
                        string token = await GetTokenAsync(config);
                        if (!string.IsNullOrEmpty(token))
                        {
                            await UpdateStaticData(config, token);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"[MilestoneHealth] REST Scan Error: {ex.Message}");
                    }
                }
                await Task.Delay(60000, stoppingToken); // Quét danh sách Servers/Disks mỗi 1 phút
            }

            await wsTask;
        }

        private async Task MaintainWebSocketConnection(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                if (_cache.TryGetValue("VMS_1", out object cacheObj) && cacheObj is ConnectorListModel config)
                {
                    using var ws = new ClientWebSocket();
                    try
                    {
                        string token = await GetTokenAsync(config);
                        if (string.IsNullOrEmpty(token)) throw new Exception("Token failed");

                        // URL Events & States WebSocket của Milestone
                        string wsUri = $"ws://{config.IpServer}:{config.Port}/api/ws/events/v1";
                        ws.Options.SetRequestHeader("Authorization", $"Bearer {token}");
                        await ws.ConnectAsync(new Uri(wsUri), ct);
                        _logger.LogInformation($"[MilestoneHealth] WebSocket Connected to {config.IpServer}");

                        // 1. Gửi bản tin Subscribe (Đăng ký nhận Performance và Camera status)
                        var subMsg = new {
                            type = "subscribe",
                            subscriptions = new[] {
                                new { type = "resourceEvent", resourceType = "cameras" },
                                new { type = "resourceEvent", resourceType = "recordingServers" }
                            }
                        };
                        byte[] subBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(subMsg));
                        await ws.SendAsync(new ArraySegment<byte>(subBytes), WebSocketMessageType.Text, true, ct);

                        // 2. Lắng nghe dữ liệu
                        var buffer = new byte[1024 * 8];
                        while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
                        {
                            var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                            if (result.MessageType == WebSocketMessageType.Text)
                            {
                                string msg = Encoding.UTF8.GetString(buffer, 0, result.Count);
                                ProcessWsMessage(msg);
                                _logger.LogWarning("WS RAW: {msg}", msg);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"[MilestoneHealth] WebSocket Reconnecting... {ex.Message}");
                    }
                }
                await Task.Delay(5000, ct); // Thử kết nối lại sau 5s nếu sập
            }
        }

        private void ProcessWsMessage(string json)
        {
            try {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (!root.TryGetProperty("type", out var typeProp)) return;

                string type = typeProp.GetString();
                if (type == "event") {
                    // Xử lý sự kiện Camera Offline, Server Error, v.v.
                    _logger.LogInformation($"[MilestoneHealth] Received System Event: {json}");
                } 
                else if (type == "performanceCounter") {
                    // Xử lý dữ liệu CPU/RAM thời gian thực
                    _logger.LogInformation($"[MilestoneHealth] Received Performance Data: {json}");
                    // Cập nhật vào _metricsCache tại đây...
                }
            } catch { }
        }

        // --- Logic REST (Giữ lại để lấy Disk Path và thông tin tĩnh) ---
        private async Task UpdateStaticData(ConnectorListModel config, string token)
        {
            string baseUrl = $"http://{config.IpServer}:{config.Port}/api/rest/v1";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var serversJson = await _httpClient.GetStringAsync($"{baseUrl}/recordingServers");
            using var doc = JsonDocument.Parse(serversJson);
            
            _metricsCache.Clear();
            if (doc.RootElement.TryGetProperty("array", out var servers))
            {
                foreach (var server in servers.EnumerateArray())
                {
                    string id = server.GetProperty("id").GetString();
                    string name = server.GetProperty("name").GetString();
                    var metric = new MilestoneServerMetric { ServerId = id, ServerName = name, LastUpdate = DateTime.Now };

                    // Logic lấy Disk (DriveInfo) - Giữ nguyên vì đang chạy rất tốt
                    try {
                        var storageJson = await _httpClient.GetStringAsync($"{baseUrl}/recordingServers/{id}/storages");
                        using var storageDoc = JsonDocument.Parse(storageJson);
                        if (storageDoc.RootElement.TryGetProperty("array", out var storages))
                        {
                            foreach (var storage in storages.EnumerateArray())
                            {
                                string sName = storage.GetProperty("name").GetString();
                                string diskPath = storage.TryGetProperty("diskPath", out var dp) ? dp.GetString() : "";

                                if (!string.IsNullOrEmpty(diskPath))
                                {
                                    try {
                                        string driveLetter = Path.GetPathRoot(diskPath);
                                        var driveInfo = new DriveInfo(driveLetter);
                                        if (driveInfo.IsReady) {
                                            double t = driveInfo.TotalSize / (1024 * 1024 * 1024.0);
                                            double f = driveInfo.AvailableFreeSpace / (1024 * 1024 * 1024.0);
                                            metric.Disks.Add(new MilestoneDiskMetric {
                                                DriveName = sName,
                                                TotalSizeGb = (long)t,
                                                FreeSpaceGb = (long)f,
                                                UsagePercentage = Math.Round((t - f) * 100 / t, 1)
                                            });
                                        }
                                    } catch { }
                                }
                            }
                        }
                    } catch { }
                    _metricsCache.Add(metric);
                }
            }
            _cache.Set("MILESTONE_SERVER_METRICS", _metricsCache);
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
