using System.Collections.Concurrent;
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
using System.Diagnostics;

namespace LightInsightService.Sockets.Milestone.Health
{
    public class MilestoneHealthSocketWorker : BackgroundService
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<MilestoneHealthSocketWorker> _logger;
        private readonly IHubContext<AuditLogHub> _hubContext;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly HttpClient _httpClient;
        
        private static readonly ConcurrentDictionary<string, MilestoneLiveState> _globalStates = new ConcurrentDictionary<string, MilestoneLiveState>();
        private readonly ConcurrentDictionary<string, Task> _activeConnections = new ConcurrentDictionary<string, Task>();
        private readonly ConcurrentDictionary<string, (string Name, string Category)> _eventDefinitions = new ConcurrentDictionary<string, (string, string)>();

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
                            .Where(c => c.VmsName != null && c.VmsName.Contains("Milestone", StringComparison.OrdinalIgnoreCase))
                            .ToList();

                        foreach (var vms in milestoneConnectors)
                        {
                            string cid = vms.IpServer;
                            _globalStates.TryAdd(cid, new MilestoneLiveState { Name = vms.Name, Status = "OFFLINE" });

                            if (!_activeConnections.ContainsKey(cid) || _activeConnections[cid].IsCompleted)
                            {
                                _logger.LogInformation($"[DEBUG] Starting connection task for {vms.Name} ({cid})");
                                _activeConnections[cid] = Task.Run(() => MaintainWebSocketConnection(vms, stoppingToken), stoppingToken);
                            }

                            // Quét dữ liệu tĩnh qua REST
                            string token = await GetTokenAsync(vms);
                            if (!string.IsNullOrEmpty(token)) {
                                await FetchEventDefinitions(vms, token);
                                await UpdateStaticData(vms, token);
                            }
                        }
                    }
                }
                catch (Exception ex) { _logger.LogError($"Main Loop Error: {ex.Message}"); }
                await Task.Delay(60000, stoppingToken); 
            }
        }

        private async Task FetchEventDefinitions(ConnectorListModel config, string token)
        {
            try {
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
                var json = await _httpClient.GetStringAsync($"http://{config.IpServer}:{config.Port}/api/rest/v1/eventTypes");
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("array", out var array)) {
                    foreach (var item in array.EnumerateArray()) {
                        string id = item.GetProperty("id").GetString();
                        string name = item.GetProperty("name").GetString();
                        string cat = item.TryGetProperty("category", out var c) ? c.GetString() : "Unknown";
                        _eventDefinitions[id] = (name, cat);
                    }
                }
            } catch { }
        }

        private async Task MaintainWebSocketConnection(ConnectorListModel config, CancellationToken ct)
        {
            string cid = config.IpServer;
            while (!ct.IsCancellationRequested)
            {
                using var ws = new ClientWebSocket();
                try
                {
                    string token = await GetTokenAsync(config);
                    if (string.IsNullOrEmpty(token)) throw new Exception("Token failed");

                    ws.Options.SetRequestHeader("Authorization", $"Bearer {token}");
                    await ws.ConnectAsync(new Uri($"ws://{config.IpServer}:{config.Port}/api/ws/events/v1"), ct);
                    
                    _globalStates[cid].Status = "ONLINE";

                    // 1. Start Session
                    await SendAsync(ws, new { command = "startSession", commandId = 1, sessionId = "", eventId = "" }, config.Name, ct);
                    await ReceiveAsync(ws, config.Name, ct);
                    
                    // Sync Camera count
                    var cameras = await GetCamerasViaRest(config, token);
                    _globalStates[cid].TotalCameras = cameras.Count;
                    _globalStates[cid].OnlineCameras = cameras.Count(c => c.Enabled);

                    // 2. Subscribe
                    await SendAsync(ws, new { command = "addSubscription", commandId = 2, filters = new[] { new { modifier = "include", resourceTypes = new[] { "*" }, sourceIds = new[] { "*" }, eventTypes = new[] { "*" } } } }, config.Name, ct);
                    await ReceiveAsync(ws, config.Name, ct);

                    // 3. Heartbeat Task (Independent)
                    _ = Task.Run(async () =>
                    {
                        while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
                        {
                            try {
                                var startTime = DateTime.UtcNow;
                                var sw = Stopwatch.StartNew();

                                // 5s timeout on heartbeat
                                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                                using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct, cts.Token);
                                
                                await SendAsync(ws, new { command = "getState", commandId = 999 }, config.Name, linked.Token);
                                await ReceiveAsync(ws, config.Name, linked.Token); 
                                sw.Stop();

                                var elapsed = sw.ElapsedMilliseconds;
                                // _logger.LogInformation($"[LATENCY_DEBUG] {config.Name} | Roundtrip: {elapsed}ms");

                                var state = _globalStates[cid];
                                state.LatencyMs = elapsed;
                                state.Status = "ONLINE";
                                if (state.LatencyMs > 2000) state.Status = "BAD";
                                else if (state.LatencyMs > 500) state.Status = "SLOW";
                                await PushUpdate(cid);

                                await Task.Delay(5000, ct);
                            } catch (OperationCanceledException) { 
                                // _logger.LogWarning($"[LATENCY_DEBUG] {config.Name} heartbeat timed out.");
                                AuditLogger.Log("SYSTEM", "SERVER_TIMEOUT", $"Mất phản hồi từ server: {config.Name} (Timeout 5s)", new { config.Name, config.IpServer }, "System", config.IpServer);
                                break; 
                            } catch (Exception ex) { 
                                // _logger.LogWarning($"[LATENCY_DEBUG] {config.Name} heartbeat failed: {ex.Message}");
                                break; 
                            }
                        }
                    }, ct);

                    // 4. Listen Loop (Event Listener)
                    while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
                    {
                        var msg = await ReceiveAsync(ws, config.Name, ct);
                        if (string.IsNullOrEmpty(msg)) continue;
                        await ProcessWsMessage(msg, cid);
                    }
                }
                catch (Exception ex)
                {
                    _globalStates[cid].Status = "DISCONNECTED";
                    await PushUpdate(cid);
                    _logger.LogError($"[CONNECTION_DEBUG] {config.Name} ({config.IpServer}) failed with: {ex.GetType().Name} - {ex.Message}");
                    AuditLogger.Log("SYSTEM", "SERVER_DISCONNECTED", $"Mất kết nối WebSocket tới server: {config.Name}", new { config.Name, config.IpServer, error = ex.Message }, "System", config.IpServer);
                }
                await Task.Delay(10000, ct);
            }
        }

        private async Task ProcessWsMessage(string json, string cid)
        {
            try {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (root.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "event") {
                    if (root.TryGetProperty("events", out var eventsArray)) {
                        foreach (var evt in eventsArray.EnumerateArray()) {
                            string eventTypeId = evt.GetProperty("type").GetString();
                            string source = evt.GetProperty("source").GetString();
                            
                            // Map ID to Name
                            string eventName = _eventDefinitions.ContainsKey(eventTypeId) ? _eventDefinitions[eventTypeId].Name : eventTypeId;
                            string category = _eventDefinitions.ContainsKey(eventTypeId) ? _eventDefinitions[eventTypeId].Category : "Unknown";
                            
                            if (source.Contains("cameras")) {
                                if (IsErrorState(eventTypeId)) _globalStates[cid].OnlineCameras--;
                                else if (eventName.Contains("Established") || eventName.Contains("Started")) _globalStates[cid].OnlineCameras++;
                                _globalStates[cid].OnlineCameras = Math.Clamp(_globalStates[cid].OnlineCameras, 0, _globalStates[cid].TotalCameras);
                            }

                            string cleanSource = source.Split('/').LastOrDefault() ?? source;
                            string actionType = "STATUS_CHANGE";
                            
                            // Improve action type based on category
                            if (category.Contains("Configuration")) actionType = "CONFIG_CHANGE";
                            else if (IsErrorState(eventTypeId)) actionType = "ERROR_EVENT";

                            AuditLogger.Log("SYSTEM", actionType, $"[{_globalStates[cid].Name}] {cleanSource} event: {eventName} ({category})", new { source, eventTypeId, eventName, category }, "System", cid);
                        }
                        await PushUpdate(cid);
                    }
                }
            } catch { }
        }

        private async Task PushUpdate(string cid)
        {
            var state = _globalStates[cid];
            await _hubContext.Clients.All.SendAsync("HealthUpdate", state);
            _cache.Set($"HEALTH_STATE_{cid}", state);
        }

        private async Task UpdateStaticData(ConnectorListModel config, string token)
        {
            string cid = config.IpServer;
            string baseUrl = $"http://{config.IpServer}:{config.Port}/api/rest/v1";
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            try {
                var serversJson = await _httpClient.GetStringAsync($"{baseUrl}/recordingServers");
                using var doc = JsonDocument.Parse(serversJson);
                var newInfra = new List<InfrastructureHealth>();

                if (doc.RootElement.TryGetProperty("array", out var servers)) {
                    foreach (var s in servers.EnumerateArray()) {
                        string id = s.GetProperty("id").GetString();
                        string name = s.GetProperty("name").GetString();
                        bool enabled = s.TryGetProperty("enabled", out var en) ? en.GetBoolean() : true;

                        // Server Item
                        newInfra.Add(new InfrastructureHealth { 
                            Name = name, 
                            Type = "server", 
                            Status = enabled ? "ONLINE" : "OFFLINE", 
                            Description = $"Last update: {DateTime.Now:HH:mm:ss}",
                            ConnectorId = cid,
                            MachineName = name // Use server name as link
                        });

                        // Storage Item
                        try {
                            var diskJson = await _httpClient.GetStringAsync($"{baseUrl}/recordingServers/{id}/storages");
                            using var dDoc = JsonDocument.Parse(diskJson);
                            if (dDoc.RootElement.TryGetProperty("array", out var disks)) {
                                foreach (var d in disks.EnumerateArray()) {
                                    string storageName = d.GetProperty("name").GetString();
                                    
                                    // Try multiple common property names for path in Milestone REST API
                                    string path = "Unknown path";
                                    if (d.TryGetProperty("path", out var p)) path = p.GetString();
                                    else if (d.TryGetProperty("storagePath", out var sp)) path = sp.GetString();
                                    else if (d.TryGetProperty("diskPath", out var dp)) path = dp.GetString();
                                    
                                    _logger.LogDebug($"[Milestone] Storage '{storageName}' raw: {d.GetRawText()}");

                                    newInfra.Add(new InfrastructureHealth { 
                                        Name = $"Storage: {storageName}", 
                                        Type = "storage", 
                                        Status = "ONLINE", 
                                        Description = $"Path: {path}",
                                        ConnectorId = cid,
                                        MachineName = name // Link storage to THIS recording server
                                    });
                                }
                            }
                        } catch { }
                    }
                }
                _globalStates[cid].Infrastructure = newInfra;
                await PushUpdate(cid);
            } catch { }
        }

        private async Task<List<(string Id, bool Enabled)>> GetCamerasViaRest(ConnectorListModel config, string token)
        {
            var list = new List<(string, bool)>();
            try {
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
                var json = await _httpClient.GetStringAsync($"http://{config.IpServer}:{config.Port}/api/rest/v1/cameras");
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("array", out var array)) {
                    foreach (var item in array.EnumerateArray()) {
                        list.Add((item.GetProperty("id").GetString(), item.TryGetProperty("enabled", out var e) ? e.GetBoolean() : true));
                    }
                }
            } catch { }
            return list;
        }

        private bool IsErrorState(string guid) 
        {
            if (_eventDefinitions.TryGetValue(guid, out var def))
            {
                string name = def.Name.ToLower();
                return name.Contains("lost") || name.Contains("failed") || name.Contains("error") || name.Contains("stopped");
            }
            return guid.Contains("e14e849f") || guid.Contains("6f55a7a7") || guid.Contains("839754e6");
        }

        private async Task SendAsync(ClientWebSocket ws, object obj, string vmsName, CancellationToken ct) {
            var json = JsonSerializer.Serialize(obj);
            await ws.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(json)), WebSocketMessageType.Text, true, ct);
        }

        private async Task<string> ReceiveAsync(ClientWebSocket ws, string vmsName, CancellationToken ct) {
            var buffer = new byte[8192];
            using var ms = new MemoryStream();
            try {
                WebSocketReceiveResult result;
                do {
                    result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                    if (result.MessageType == WebSocketMessageType.Close) return null;
                    ms.Write(buffer, 0, result.Count);
                } while (!result.EndOfMessage);
                return Encoding.UTF8.GetString(ms.ToArray());
            } catch { return null; }
        }

        private async Task<string> GetTokenAsync(ConnectorListModel config) {
            try {
                var request = new HttpRequestMessage(HttpMethod.Post, $"http://{config.IpServer}:{config.Port}/API/IDP/connect/token");
                request.Content = new FormUrlEncodedContent(new[] {
                    new KeyValuePair<string, string>("grant_type", "password"),
                    new KeyValuePair<string, string>("username", config.Username),
                    new KeyValuePair<string, string>("password", config.Password),
                    new KeyValuePair<string, string>("client_id", "GrantValidatorClient"),
                });
                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode) return null;
                return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("access_token").GetString();
            } catch { return null; }
        }
    }
}