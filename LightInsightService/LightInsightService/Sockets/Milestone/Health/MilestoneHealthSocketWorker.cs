using System.Net.Http.Headers;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using LightInsightModel.MileStone.General;
using LightInsightModel.Connectors;
using System.IO;
using Microsoft.AspNetCore.SignalR;
using LightInsightService.Sockets.General;
using LightInsightUtiltites;
using LightInsightModel.General;
using LightInsightBUS.Interfaces.Connectors;

namespace LightInsightService.Sockets.Milestone.Health
{
    public class MilestoneHealthSocketWorker : BackgroundService
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<MilestoneHealthSocketWorker> _logger;
        private readonly IHubContext<AuditLogHub> _hubContext;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly HttpClient _httpClient;
        private readonly List<MilestoneServerMetric> _metricsCache = new List<MilestoneServerMetric>();
        private readonly Dictionary<string, Task> _activeConnections = new Dictionary<string, Task>();

        public MilestoneHealthSocketWorker(
            IMemoryCache cache, 
            ILogger<MilestoneHealthSocketWorker> logger,
            IHubContext<AuditLogHub> hubContext,
            IServiceScopeFactory scopeFactory)
        {
            _cache = cache;
            _logger = logger;
            _hubContext = hubContext;
            _scopeFactory = scopeFactory;
            var handler = new HttpClientHandler();
            handler.ServerCertificateCustomValidationCallback = (message, cert, chain, sslPolicyErrors) => true;
            _httpClient = new HttpClient(handler);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[MilestoneHealth] Worker starting...");
            
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var connectorsService = scope.ServiceProvider.GetRequiredService<IConnectors>();
                    var result = await connectorsService.GetAllConnectorsAsync();

                    if (result.Status == 1 && result.Data is List<ConnectorListModel> connectorList)
                    {
                        var milestoneConnectors = connectorList
                            .Where(c => c.Name.Contains("Milestone", StringComparison.OrdinalIgnoreCase) || 
                                       (c.VmsName != null && c.VmsName.Contains("Milestone", StringComparison.OrdinalIgnoreCase)))
                            .ToList();

                        foreach (var vms in milestoneConnectors)
                        {
                            string connectionId = vms.IpServer;
                            if (!_activeConnections.ContainsKey(connectionId) || _activeConnections[connectionId].IsCompleted)
                            {
                                _logger.LogInformation($"[MilestoneHealth] Starting background task for: {vms.Name} ({vms.IpServer})");
                                _activeConnections[connectionId] = Task.Run(() => MaintainWebSocketConnection(vms, stoppingToken), stoppingToken);
                            }

                            string token = await GetTokenAsync(vms);
                            if (!string.IsNullOrEmpty(token))
                            {
                                await UpdateStaticData(vms, token);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError($"[MilestoneHealth] Main Loop Error: {ex.Message}");
                }

                await Task.Delay(60000, stoppingToken); 
            }
        }

        private async Task MaintainWebSocketConnection(ConnectorListModel config, CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                using var ws = new ClientWebSocket();

                try
                {
                    _logger.LogInformation($"[MilestoneHealth] [{config.Name}] Attempting WS Connection to {config.IpServer}:{config.Port}...");
                    string token = await GetTokenAsync(config);
                    if (string.IsNullOrEmpty(token)) throw new Exception("Token failed");

                    string wsUri = $"ws://{config.IpServer}:{config.Port}/api/ws/events/v1";
                    ws.Options.SetRequestHeader("Authorization", $"Bearer {token}");

                    await ws.ConnectAsync(new Uri(wsUri), ct);
                    _logger.LogInformation($"[MilestoneHealth] [{config.Name}] [SUCCESS] WebSocket Connected.");

                    // 1. START SESSION
                    var startSessionCmd = new { command = "startSession", commandId = 1, sessionId = "", eventId = "" };
                    await SendAsync(ws, startSessionCmd, config.Name, ct);
                    await ReceiveAsync(ws, config.Name, ct); // Nhận phản hồi startSession

                    // 2. SUBSCRIBE EVENTS
                    var subscribeCmd = new
                    {
                        command = "addSubscription",
                        commandId = 2,
                        filters = new[]
                        {
                            new {
                                modifier = "include",
                                resourceTypes = new[] { "*" },
                                sourceIds = new[] { "*" },
                                eventTypes = new[] { "*" }
                            }
                        }
                    };
                    await SendAsync(ws, subscribeCmd, config.Name, ct);
                    await ReceiveAsync(ws, config.Name, ct); // Nhận phản hồi addSubscription

                    // 3. HEARTBEAT & INITIAL STATE
                    _ = Task.Run(async () =>
                    {
                        while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
                        {
                            try {
                                await Task.Delay(20000, ct);
                                if (ws.State == WebSocketState.Open) {
                                    await SendAsync(ws, new { command = "getState", commandId = 999 }, config.Name, ct);
                                }
                            } catch { break; }
                        }
                    }, ct);

                    // 4. LISTEN LOOP
                    while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
                    {
                        var msg = await ReceiveAsync(ws, config.Name, ct);
                        if (string.IsNullOrEmpty(msg)) continue;
                        await ProcessWsMessage(msg, config.Name);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError($"[MilestoneHealth] [{config.Name}] WS Error: {ex.Message}");
                }

                _logger.LogInformation($"[MilestoneHealth] [{config.Name}] Reconnecting in 10 seconds...");
                await Task.Delay(10000, ct);
            }
        }

        private async Task SendAsync(ClientWebSocket ws, object obj, string vmsName, CancellationToken ct)
        {
            var json = JsonSerializer.Serialize(obj);
            var bytes = Encoding.UTF8.GetBytes(json);
            await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, ct);
            _logger.LogInformation($"[MilestoneHealth] [{vmsName}] [WS SEND] --> {json}");
        }

        private async Task<string> ReceiveAsync(ClientWebSocket ws, string vmsName, CancellationToken ct)
        {
            var buffer = new byte[8192];
            using var ms = new MemoryStream();

            try {
                WebSocketReceiveResult result;
                do {
                    result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                    if (result.MessageType == WebSocketMessageType.Close) return null;
                    ms.Write(buffer, 0, result.Count);
                } while (!result.EndOfMessage);

                ms.Seek(0, SeekOrigin.Begin);
                using var reader = new StreamReader(ms, Encoding.UTF8);
                string msg = await reader.ReadToEndAsync();
                
                // Chỉ log ngắn gọn nếu message quá dài (như getState)
                if (msg.Length > 500)
                    _logger.LogInformation($"[MilestoneHealth] [{vmsName}] [WS RECV] <-- (Large Message: {msg.Length} bytes)");
                else
                    _logger.LogInformation($"[MilestoneHealth] [{vmsName}] [WS RECV] <-- {msg}");

                return msg;
            } catch { return null; }
        }

        private async Task ProcessWsMessage(string json, string vmsName)
        {
            try {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                
                // 1. XỬ LÝ EVENT THỜI GIAN THỰC
                if (root.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "event") {
                    if (root.TryGetProperty("events", out var eventsArray)) {
                        foreach (var evt in eventsArray.EnumerateArray()) {
                            string eventType = evt.GetProperty("type").GetString();
                            string source = evt.GetProperty("source").GetString();
                            _logger.LogWarning($"[MilestoneHealth] [{vmsName}] [EVENT] Source: {source} | Type: {eventType}");

                            AuditLogger.Log("SYSTEM", "STATUS_CHANGE", $"[{vmsName}] {source} status: {eventType}", new { source, eventType }, "System", "127.0.0.1");
                        }
                    }
                }
                
                // 2. XỬ LÝ PHẢN HỒI LỆNH (Gồm cả mảng states lớn)
                if (root.TryGetProperty("status", out var statusProp) && statusProp.GetInt32() == 200) {
                    if (root.TryGetProperty("states", out var statesArray)) {
                        int offlineCount = 0;
                        foreach (var stateItem in statesArray.EnumerateArray()) {
                            string source = stateItem.GetProperty("source").GetString();
                            string stateType = stateItem.GetProperty("type").GetString();
                            
                            // Milestone dùng GUID cho stateType, chúng ta cần map lại hoặc log ra
                            // Một số stateType phổ biến biểu thị lỗi/mất kết nối
                            if (IsErrorState(stateType)) {
                                offlineCount++;
                                _logger.LogInformation($"[MilestoneHealth] [{vmsName}] Device {source} is in error state: {stateType}");
                            }
                        }
                        if (offlineCount > 0) {
                            _logger.LogWarning($"[MilestoneHealth] [{vmsName}] Found {offlineCount} devices in error state during sync.");
                        }
                    }
                }
            } catch (Exception ex) {
                _logger.LogError($"[MilestoneHealth] [{vmsName}] Error parsing message: {ex.Message}");
            }
        }

        private bool IsErrorState(string stateGuid) {
            // Danh sách GUID các trạng thái lỗi phổ biến của Milestone (CommunicationLost, v.v.)
            string[] errorGuids = { 
                "e14e849f-7355-4d03-97fe-77c292fe01c7", // CommunicationLost
                "6f55a7a7-d21c-4629-ac18-af1975e395a2", // ConnectionLost
                "839754e6-82af-44fc-9e2f-437413d602d6"  // Một dạng error khác
            };
            return errorGuids.Any(g => stateGuid.Contains(g));
        }

        private async Task UpdateStaticData(ConnectorListModel config, string token)
        {
            string baseUrl = $"http://{config.IpServer}:{config.Port}/api/rest/v1";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            try {
                var serversJson = await _httpClient.GetStringAsync($"{baseUrl}/recordingServers");
                using var doc = JsonDocument.Parse(serversJson);
                
                if (doc.RootElement.TryGetProperty("array", out var servers))
                {
                    foreach (var server in servers.EnumerateArray())
                    {
                        string id = server.GetProperty("id").GetString();
                        string name = server.GetProperty("name").GetString();
                        var metric = new MilestoneServerMetric { ServerId = id, ServerName = name, LastUpdate = DateTime.Now };

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
                                                    DriveName = sName, TotalSizeGb = (long)t, FreeSpaceGb = (long)f,
                                                    UsagePercentage = Math.Round((t - f) * 100 / t, 1)
                                                });
                                            }
                                        } catch { }
                                    }
                                }
                            }
                        } catch { }
                        
                        lock(_metricsCache) {
                            var existing = _metricsCache.FirstOrDefault(m => m.ServerId == id);
                            if (existing != null) _metricsCache.Remove(existing);
                            _metricsCache.Add(metric);
                        }
                    }
                }
                _cache.Set("MILESTONE_SERVER_METRICS", _metricsCache);
            } catch { }
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
