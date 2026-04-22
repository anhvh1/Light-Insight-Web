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
using System.Threading;

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
        private readonly ConcurrentDictionary<string, (string Name, string Category, string GeneratorType)> _eventDefinitions = new ConcurrentDictionary<string, (string, string, string)>();
        
        // Latency tracking
        private readonly ConcurrentDictionary<string, Stopwatch> _latencyStopwatches = new ConcurrentDictionary<string, Stopwatch>();

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
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var connectorService = scope.ServiceProvider.GetRequiredService<IConnectors>();
                        var res = await connectorService.GetAllConnectorsAsync();
                        var allConnectors = res.Data as List<ConnectorListModel> ?? new List<ConnectorListModel>();
                        
                        var milestoneConnectors = allConnectors
                            .Where(c => c.VmsName != null && c.VmsName.Contains("Milestone", StringComparison.OrdinalIgnoreCase))
                            .ToList();

                        foreach (var vms in milestoneConnectors)
                        {
                            string cid = vms.IpServer;
                            _globalStates.TryAdd(cid, new MilestoneLiveState { Name = vms.Name, Status = "OFFLINE" });

                            if (!_activeConnections.ContainsKey(cid) || _activeConnections[cid].IsCompleted)
                            {
                                _activeConnections[cid] = Task.Run(() => MaintainWebSocketConnection(vms, stoppingToken), stoppingToken);
                            }
                            
                            // Background REST update for static data
                            _ = Task.Run(async () => {
                                try {
                                    string token = await GetTokenAsync(vms);
                                    if (!string.IsNullOrEmpty(token)) {
                                        await FetchEventDefinitions(vms, token);
                                        await UpdateStaticData(vms, token);
                                    }
                                } catch { }
                            }, stoppingToken);
                        }
                    }
                }
                catch (Exception ex) { _logger.LogError($"Main Loop Error: {ex.Message}"); }
                await Task.Delay(60000, stoppingToken); 
            }
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

                    using var handshakeCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                    using var linkedHandshake = CancellationTokenSource.CreateLinkedTokenSource(ct, handshakeCts.Token);

                    _logger.LogInformation($"[HANDSHAKE] Connecting to {config.Name} ({cid})...");
                    ws.Options.SetRequestHeader("Authorization", $"Bearer {token}");
                    ws.Options.SetRequestHeader("User-Agent", "LightInsight-Backend/2.0");
                    ws.Options.AddSubProtocol("EventsAndStateWebSocketApi");
                    
                    await ws.ConnectAsync(new Uri($"ws://{config.IpServer}:{config.Port}/api/ws/events/v1"), linkedHandshake.Token);
                    
                    // 1. Handshake Sequence
                    await SendAsync(ws, new { command = "startSession", commandId = 101, sessionId = "", eventId = "" }, config.Name, linkedHandshake.Token);
                    await ReceiveAsync(ws, config.Name, linkedHandshake.Token);
                    
                    // Refined Three-Tiered Filter based on actual eventTypes.json metadata
                    var healthKeywords = new[] { "communication", "stopped", "error", "lost", "broken", "terminated", "failed", "normal", "started", "available", "configuration", "full", "unavailable" };
                    
                    var healthGuids = _eventDefinitions
                        .Where(kvp => {
                            string gt = kvp.Value.GeneratorType;
                            string group = kvp.Value.Category;
                            string name = kvp.Value.Name.ToLower();

                            // Tier 1: Core Infrastructure Types (Always Keep)
                            if (gt == "System" || gt == "Server" || gt == "Recorder" || gt == "Hardware" || gt == "DriverHardware" || gt == "SystemDashboard") 
                                return true;

                            // Tier 3: Known Noise Groups (Always Discard)
                            if (group.Contains("Analytics") || gt == "MIPDevice" || gt == "MIP")
                                return false;

                            // Tier 2: Device/DriverDevice - Keep only health-related status
                            if (gt == "Device" || gt == "DriverDevice")
                            {
                                return healthKeywords.Any(k => name.Contains(k));
                            }

                            return false;
                        })
                        .Select(kvp => kvp.Key)
                        .ToList();

                    // "Safe Hybrid" Filter: Wildcard for resources, specific Health GUIDs for events
                    object subscriptionFilter;
                    if (healthGuids.Count > 0) {
                        subscriptionFilter = new { 
                            modifier = "include", 
                            resourceTypes = new[] { "*" }, 
                            eventTypes = healthGuids 
                        };
                        _logger.LogInformation($"[SUBSCRIPTION] {config.Name} is tracking {healthGuids.Count} Health/Status event types.");
                    } else {
                        subscriptionFilter = new { modifier = "include", resourceTypes = new[] { "*" }, sourceIds = new[] { "*" }, eventTypes = new[] { "*" } };
                        _logger.LogWarning($"[SUBSCRIPTION] {config.Name} is using WILDCARD (metadata not ready).");
                    }

                    await SendAsync(ws, new { command = "addSubscription", commandId = 102, filters = new[] { subscriptionFilter } }, config.Name, linkedHandshake.Token);
                    await ReceiveAsync(ws, config.Name, linkedHandshake.Token);

                    _globalStates[cid].Status = "ONLINE";
                    _logger.LogInformation($"[HANDSHAKE] SUCCESS for {config.Name}! Starting unified runtime.");

                    // 2. Heartbeat Task (Sends getState every 5s)
                    _ = Task.Run(async () =>
                    {
                        while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
                        {
                            try {
                                var sw = new Stopwatch();
                                _latencyStopwatches[cid] = sw;
                                sw.Start();
                                
                                await SendAsync(ws, new { command = "getState", commandId = 1 }, config.Name, ct);
                                await Task.Delay(5000, ct);
                            } catch { break; }
                        }
                    }, ct);

                    // 3. Unified Receiver Loop
                    while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
                    {
                        var msg = await ReceiveAsync(ws, config.Name, ct);
                        if (string.IsNullOrEmpty(msg)) break;
                        await ProcessWsMessage(msg, cid, config);
                    }
                }
                catch (Exception ex)
                {
                    _globalStates[cid].Status = "DISCONNECTED";
                    await PushUpdate(cid);
                    _logger.LogError($"[CONNECTION_DEBUG] {config.Name} ({config.IpServer}) failed: {ex.Message}");
                }
                await Task.Delay(10000, ct);
            }
        }

        private async Task ProcessWsMessage(string json, string cid, ConnectorListModel vmsConfig)
        {
            try {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                // A. Handle Responses (Calculates Latency & Processes States)
                if (root.TryGetProperty("commandId", out var cmdIdProp)) {
                    int cmdId = cmdIdProp.GetInt32();
                    if (cmdId == 1) { // Heartbeat/getState response
                        if (_latencyStopwatches.TryRemove(cid, out var sw)) {
                            sw.Stop();
                            var elapsed = sw.ElapsedMilliseconds;
                            _globalStates[cid].LatencyMs = elapsed;
                            
                            if (elapsed > 2000) _globalStates[cid].Status = "BAD";
                            else if (elapsed > 500) _globalStates[cid].Status = "SLOW";
                            else _globalStates[cid].Status = "ONLINE";
                            
                            // 1. Capture and store states for each resource source
                            if (root.TryGetProperty("states", out var statesArray)) {
                                foreach (var state in statesArray.EnumerateArray()) {
                                    string source = state.GetProperty("source").GetString();
                                    string typeGuid = state.GetProperty("type").GetString();
                                    _globalStates[cid].ResourceStates[source] = typeGuid;

                                    // Debug log for Recording Servers to check Milestone-reported state
                                    if (source.StartsWith("recordingServers/")) {
                                        string stateName = _eventDefinitions.TryGetValue(typeGuid, out var def) ? def.Name : typeGuid;
                                        _logger.LogInformation($"[STATE_SYNC] {source} = {stateName}");
                                    }
                                }
                            }

                            await PushUpdate(cid);
                        }
                    }
                    return;
                }

                // B. Handle Events (Audit Log & Live State Updates)
                if (root.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "event") {
                    if (root.TryGetProperty("events", out var eventsArray)) {
                        foreach (var evt in eventsArray.EnumerateArray()) {
                            string eventTypeId = evt.GetProperty("type").GetString();
                            string source = evt.GetProperty("source").GetString();
                            
                            // Update live state in dictionary
                            _globalStates[cid].ResourceStates[source] = eventTypeId;

                            string eventName = _eventDefinitions.ContainsKey(eventTypeId) ? _eventDefinitions[eventTypeId].Name : eventTypeId;
                            string category = _eventDefinitions.ContainsKey(eventTypeId) ? _eventDefinitions[eventTypeId].Category : "Unknown";
                            
                            if (source.Contains("cameras")) {
                                if (IsErrorState(eventTypeId)) _globalStates[cid].OnlineCameras--;
                                else if (eventName.Contains("Established") || eventName.Contains("Started")) _globalStates[cid].OnlineCameras++;
                                _globalStates[cid].OnlineCameras = Math.Clamp(_globalStates[cid].OnlineCameras, 0, _globalStates[cid].TotalCameras);
                            }

                            string actionType = category.Contains("Configuration") ? "CONFIG_CHANGE" : "STATUS_CHANGE";
                            if (IsErrorState(eventTypeId)) actionType = "ERROR_EVENT";

                            AuditLogger.Log("SYSTEM", actionType, $"[{_globalStates[cid].Name}] {source} event: {eventName}", new { source, eventTypeId, eventName }, "System", cid);
                        }
                        await PushUpdate(cid);
                    }
                }
            } catch { }
        }

        private string MapStateGuidToStatus(string guid)
        {
            if (_eventDefinitions.TryGetValue(guid, out var def))
            {
                string name = def.Name.ToLower();
                // Semantic check for broken connection / error states
                if (name.Contains("stopped") || name.Contains("error") || name.Contains("critical") || 
                    name.Contains("lost") || name.Contains("broken") || name.Contains("terminated"))
                {
                    return "MAT KET NOI";
                }
                
                // Semantic check for healthy states
                if (name.Contains("started") || name.Contains("normal") || 
                    name.Contains("available") || name.Contains("connected") || name.Contains("established"))
                {
                    return "ONLINE";
                }
            }
            return "ONLINE"; // Default fallback if name doesn't imply an error
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

            try {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/recordingServers");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode) return;

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var newInfra = new List<InfrastructureHealth>();

                if (doc.RootElement.TryGetProperty("array", out var servers)) {
                    foreach (var s in servers.EnumerateArray()) {
                        string id = s.GetProperty("id").GetString();
                        string name = s.GetProperty("name").GetString();
                        // Milestone 2025 R2 often uses 'hostname' or 'address' for the physical machine link
                        string hostname = s.TryGetProperty("hostname", out var h) ? h.GetString() : 
                                         (s.TryGetProperty("address", out var a) ? a.GetString() : name);

                        bool enabled = s.TryGetProperty("enabled", out var en) ? en.GetBoolean() : true;

                        // Add the Recording Server as a "Parent" item
                        string rsSource = $"recordingServers/{id}";
                        string rsStatus = "ONLINE"; // Default
                        if (_globalStates[cid].ResourceStates.TryGetValue(rsSource, out var rsGuid)) {
                            rsStatus = _eventDefinitions.TryGetValue(rsGuid, out var def) ? def.Name : "ONLINE";
                        }

                        newInfra.Add(new InfrastructureHealth { 
                            Name = "VMS Service", 
                            Type = "server", 
                            Status = rsStatus, 
                            ConnectorId = cid,
                            MachineName = hostname 
                        });

                        // 1. Fetch Hardware for this Recording Server
                        try {
                            var hReq = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/recordingServers/{id}/hardware");
                            hReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                            var hRes = await _httpClient.SendAsync(hReq);
                            if (hRes.IsSuccessStatusCode) {
                                var hJson = await hRes.Content.ReadAsStringAsync();
                                using var hDoc = JsonDocument.Parse(hJson);
                                if (hDoc.RootElement.TryGetProperty("array", out var hardwareList)) {
                                    foreach (var hw in hardwareList.EnumerateArray()) {
                                        string hId = hw.GetProperty("id").GetString();
                                        string hName = hw.GetProperty("name").GetString();
                                        string hSource = $"hardware/{hId}";
                                        string hStatus = "ONLINE";

                                        if (_globalStates[cid].ResourceStates.TryGetValue(hSource, out var hGuid)) {
                                            hStatus = _eventDefinitions.TryGetValue(hGuid, out var def) ? def.Name : "ONLINE";
                                        }

                                        newInfra.Add(new InfrastructureHealth { 
                                            Name = hName, 
                                            Type = "hardware", 
                                            Status = hStatus, 
                                            ConnectorId = cid,
                                            MachineName = hostname
                                        });
                                    }
                                }
                            }
                        } catch { }

                        // 2. Fetch Storages for THIS specific Recording Server
                        try {
                            var sReq = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/recordingServers/{id}/storages");
                            sReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                            var sRes = await _httpClient.SendAsync(sReq);
                            if (sRes.IsSuccessStatusCode) {
                                var diskJson = await sRes.Content.ReadAsStringAsync();
                                using var dDoc = JsonDocument.Parse(diskJson);
                                if (dDoc.RootElement.TryGetProperty("array", out var disks)) {
                                    foreach (var d in disks.EnumerateArray()) {
                                        string storageName = d.GetProperty("name").GetString();
                                        string diskPath = d.TryGetProperty("diskPath", out var p) ? p.GetString() : "Unknown path";

                                        newInfra.Add(new InfrastructureHealth { 
                                            Name = "Storage:" + storageName, 
                                            Type = "storage", 
                                            Status = "ONLINE", 
                                            Description = $"Disk path: {diskPath}",
                                            ConnectorId = cid,
                                            MachineName = hostname 
                                        });
                                    }
                                }
                            }
                        } catch { }

                        // 3. Fetch Cameras for this Recording Server
                        try {
                            var cReq = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/recordingServers/{id}/cameras");
                            cReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                            var cRes = await _httpClient.SendAsync(cReq);
                            if (cRes.IsSuccessStatusCode) {
                                var cJson = await cRes.Content.ReadAsStringAsync();
                                using var cDoc = JsonDocument.Parse(cJson);
                                if (cDoc.RootElement.TryGetProperty("array", out var cameraList)) {
                                    foreach (var cam in cameraList.EnumerateArray()) {
                                        string camId = cam.GetProperty("id").GetString();
                                        string camName = cam.GetProperty("name").GetString();
                                        string camSource = $"cameras/{camId}";
                                        string camStatus = "ONLINE";

                                        if (_globalStates[cid].ResourceStates.TryGetValue(camSource, out var camGuid)) {
                                            camStatus = _eventDefinitions.TryGetValue(camGuid, out var def) ? def.Name : "ONLINE";
                                        }

                                        newInfra.Add(new InfrastructureHealth { 
                                            Name = camName, 
                                            Type = "camera", 
                                            Status = camStatus, 
                                            ConnectorId = cid,
                                            MachineName = hostname
                                        });
                                    }
                                }
                            }
                        } catch { }
                    }
                }

                _globalStates[cid].Infrastructure = newInfra;
                await PushUpdate(cid);
            } catch { }
        }

        private async Task FetchEventDefinitions(ConnectorListModel config, string token)
        {
            try {
                var request = new HttpRequestMessage(HttpMethod.Get, $"http://{config.IpServer}:{config.Port}/api/rest/v1/eventTypes");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode) return;

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("array", out var array)) {
                    foreach (var item in array.EnumerateArray()) {
                        string id = item.GetProperty("id").GetString();
                        string displayName = item.GetProperty("displayName").GetString();
                        string genType = item.TryGetProperty("generatorType", out var gt) ? gt.GetString() : "Unknown";
                        string category = item.TryGetProperty("generatorGroupName", out var c) ? c.GetString() : "General";
                        
                        _eventDefinitions[id] = (displayName, category, genType);
                    }
                }
            } catch { }
        }

        private async Task SendAsync(ClientWebSocket ws, object obj, string vmsName, CancellationToken ct) {
            var json = JsonSerializer.Serialize(obj);
            await ws.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(json)), WebSocketMessageType.Text, true, ct);
        }

        private async Task<string> ReceiveAsync(ClientWebSocket ws, string vmsName, CancellationToken ct) {
            var buffer = new byte[16384];
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
                return response.IsSuccessStatusCode ? JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("access_token").GetString() : null;
            } catch { return null; }
        }

        private bool IsErrorState(string guid) => guid.Contains("6baad64b") || guid.Contains("a334af1c") || guid.Contains("0ee90664");

        private async Task<List<(string Id, bool Enabled)>> GetCamerasViaRest(ConnectorListModel config, string token)
        {
            var list = new List<(string, bool)>();
            try {
                var request = new HttpRequestMessage(HttpMethod.Get, $"http://{config.IpServer}:{config.Port}/api/rest/v1/cameras");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode) {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("array", out var array)) {
                        foreach (var item in array.EnumerateArray()) list.Add((item.GetProperty("id").GetString(), true));
                    }
                }
            } catch { }
            return list;
        }
    }
}
