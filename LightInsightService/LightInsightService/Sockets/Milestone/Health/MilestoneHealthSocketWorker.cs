using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using LightInsightModel.MileStone.General;
using LightInsightModel.Connectors;
using LightInsightBUS.Interfaces.Connectors;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.SignalR;
using LightInsightService.Sockets.General;
using LightInsightModel.General;
using System.Diagnostics;
using LightInsightUtiltites;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LightInsightService.Sockets.Milestone.Health
{
    public class MilestoneHealthSocketWorker : BackgroundService
    {
        private readonly ILogger<MilestoneHealthSocketWorker> _logger;
        private readonly IServiceProvider _scopeFactory;
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private readonly IHubContext<CameraStatusHub> _hubContext;

        private static readonly ConcurrentDictionary<string, MilestoneLiveState> _globalStates = new ConcurrentDictionary<string, MilestoneLiveState>();
        private readonly ConcurrentDictionary<string, Task> _activeConnections = new ConcurrentDictionary<string, Task>();
        private readonly ConcurrentDictionary<string, (string Name, string Category, string GeneratorType)> _eventDefinitions = new ConcurrentDictionary<string, (string, string, string)>();
        private readonly ConcurrentDictionary<string, string> _sourceNames = new ConcurrentDictionary<string, string>();
        
        // Latency tracking
        private readonly ConcurrentDictionary<string, Stopwatch> _latencyStopwatches = new ConcurrentDictionary<string, Stopwatch>();

        public MilestoneHealthSocketWorker(
            ILogger<MilestoneHealthSocketWorker> logger,
            IServiceProvider scopeFactory,
            HttpClient httpClient,
            IMemoryCache cache,
            IHubContext<CameraStatusHub> hubContext)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
            _httpClient = httpClient;
            _cache = cache;
            _hubContext = hubContext;
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
                                // Each server starts its own isolated sandbox
                                _activeConnections[cid] = Task.Run(() => MaintainWebSocketConnection(vms, stoppingToken), stoppingToken);
                            }
                        }
                    }
                }
                catch (Exception ex) { _logger.LogError($"Main Loop Error: {ex.Message}"); }
                await Task.Delay(30000, stoppingToken); 
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
                    if (string.IsNullOrEmpty(token)) throw new Exception("Authentication failed");

                    using var handshakeCts = new CancellationTokenSource(TimeSpan.FromSeconds(60));
                    using var linkedHandshake = CancellationTokenSource.CreateLinkedTokenSource(ct, handshakeCts.Token);

                    // 1. FAST CONNECT
                    string protocol = (config.Port == 443 || config.Port == 8443) ? "wss" : "ws";
                    var wsUri = new Uri($"{protocol}://{config.IpServer}:{config.Port}/api/ws/events/v1");

                    _logger.LogInformation($"[HANDSHAKE] Connecting to {config.Name} at {wsUri}...");
                    ws.Options.SetRequestHeader("Authorization", $"Bearer {token}");
                    ws.Options.AddSubProtocol("EventsAndStateWebSocketApi");
                    
                    await ws.ConnectAsync(wsUri, linkedHandshake.Token);
                    
                    // 2. START SESSION
                    await SendAsync(ws, new { command = "startSession", commandId = 101, sessionId = "", eventId = "" }, config.Name, linkedHandshake.Token);
                    await ReceiveAsync(ws, config.Name, linkedHandshake.Token);
                    
                    // 3. INITIAL BROAD SUBSCRIPTION
                    var initialFilter = new { modifier = "include", resourceTypes = new[] { "*" }, sourceIds = new[] { "*" }, eventTypes = new[] { "*" } };
                    await SendAsync(ws, new { command = "addSubscription", commandId = 102, filters = new[] { initialFilter } }, config.Name, linkedHandshake.Token);
                    await ReceiveAsync(ws, config.Name, linkedHandshake.Token);

                    _globalStates[cid].Status = "ONLINE";
                    _logger.LogInformation($"[HANDSHAKE] SUCCESS for {config.Name}!");

                    // 4. BACKGROUND DISCOVERY & REFINEMENT
                    _ = Task.Run(async () => {
                        try {
                            await FetchEventDefinitions(config, token);
                            await UpdateStaticData(config, token);

                            // Refine subscription once metadata is ready
                            var healthGuids = _eventDefinitions
                                .Where(kvp => {
                                    string gt = kvp.Value.GeneratorType;
                                    string name = kvp.Value.Name.ToLower();
                                    if (gt == "System" || gt == "Server" || gt == "Recorder" || gt == "Hardware" || gt == "DriverHardware") return true;
                                    if (gt == "Device" || gt == "DriverDevice") return name.Contains("communication") || name.Contains("stopped") || name.Contains("error") || name.Contains("lost") || name.Contains("broken");
                                    return false;
                                })
                                .Select(kvp => kvp.Key).ToList();

                            if (healthGuids.Count > 0) {
                                var refinedFilter = new { modifier = "include", resourceTypes = new[] { "*" }, eventTypes = healthGuids };
                                await SendAsync(ws, new { command = "addSubscription", commandId = 103, filters = new[] { refinedFilter } }, config.Name, ct);
                                _logger.LogInformation($"[REFINE] {config.Name} subscription refined with {healthGuids.Count} health GUIDs.");
                            }
                        } catch { }
                    }, ct);

                    // 5. HEARTBEAT LOOP
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

                    // 6. MESSAGE RECEIVER
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
                    _logger.LogError($"[CONNECTION] {config.Name} ({cid}) error: {ex.Message}");
                }
                await Task.Delay(10000, ct);
            }
        }

        private async Task ProcessWsMessage(string json, string cid, ConnectorListModel vmsConfig)
        {
            try {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                // A. Handle Responses (Snapshot - getState)
                if (root.TryGetProperty("commandId", out var cmdIdProp)) {
                    int cmdId = cmdIdProp.GetInt32();
                    if (cmdId == 1) { 
                        if (_latencyStopwatches.TryRemove(cid, out var sw)) {
                            sw.Stop();
                            var elapsed = sw.ElapsedMilliseconds;
                            _globalStates[cid].LatencyMs = elapsed;
                            
                            if (elapsed > 2000) _globalStates[cid].Status = "BAD";
                            else if (elapsed > 500) _globalStates[cid].Status = "SLOW";
                            else _globalStates[cid].Status = "ONLINE";
                            
                            // Optimized Swap
                            if (root.TryGetProperty("states", out var statesArray)) {
                                var newResourceStates = new Dictionary<string, List<string>>();
                                var alerts = new List<string>();
                                int stateCount = 0;

                                foreach (var state in statesArray.EnumerateArray()) {
                                    string source = state.GetProperty("source").GetString();
                                    string typeGuid = state.GetProperty("type").GetString();
                                    
                                    if (!newResourceStates.ContainsKey(source)) newResourceStates[source] = new List<string>();
                                    newResourceStates[source].Add(typeGuid);
                                    stateCount++;

                                    // Identify Type (for logging clarity)
                                    string typePrefix = source.Split('/')[0].ToUpper();
                                    string deviceName = _sourceNames.TryGetValue(source, out var sn) ? sn : source.Split('/').Last();
                                    string stateName = _eventDefinitions.TryGetValue(typeGuid, out var def) ? def.Name : "Unknown Status";

                                    // Log critical info (Recording Servers or Errors)
                                    bool isProblem = IsErrorState(typeGuid);
                                    if (isProblem || source.StartsWith("recordingServers/")) {
                                        alerts.Add($"[{typePrefix}] {deviceName}: {stateName}");
                                    }
                                }
                                _globalStates[cid].ResourceStates = newResourceStates;
                                
                                if (alerts.Count > 0) {
                                    _logger.LogInformation($"[STATE_SYNC] {vmsConfig.Name} Heartbeat:\n   - {string.Join("\n   - ", alerts.Take(20))}{(alerts.Count > 20 ? "\n   - ..." : "")}");
                                }
                                _logger.LogInformation($"[STATE_SNAPSHOT] {vmsConfig.Name}: Total {stateCount} status points updated.");
                            }
                            await PushUpdate(cid);
                        }
                    }
                    return;
                }

                // B. Handle Events (Deltas)
                if (root.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "event") {
                    if (root.TryGetProperty("events", out var eventsArray)) {
                        foreach (var evt in eventsArray.EnumerateArray()) {
                            string eventTypeId = evt.GetProperty("type").GetString();
                            string source = evt.GetProperty("source").GetString();
                            
                            if (!_globalStates[cid].ResourceStates.ContainsKey(source))
                                _globalStates[cid].ResourceStates[source] = new List<string>();

                            if (!_globalStates[cid].ResourceStates[source].Contains(eventTypeId))
                                _globalStates[cid].ResourceStates[source].Add(eventTypeId);

                            string eventName = _eventDefinitions.ContainsKey(eventTypeId) ? _eventDefinitions[eventTypeId].Name : "Unknown Event";
                            string deviceName = _sourceNames.TryGetValue(source, out var sn) ? sn : source.Split('/').Last();

                            // OPPOSING STATE LOGIC: If this is a "Healthy" event, clear previous errors for this device
                            string lowerName = eventName.ToLower();
                            bool isHealthy = lowerName.Contains("started") || lowerName.Contains("normal") || lowerName.Contains("available") || lowerName.Contains("connected") || lowerName.Contains("ok");
                            if (isHealthy) {
                                _globalStates[cid].ResourceStates[source].RemoveAll(guid => IsErrorState(guid));
                            }

                            if (!_globalStates[cid].ResourceStates[source].Contains(eventTypeId))
                                _globalStates[cid].ResourceStates[source].Add(eventTypeId);

                            _logger.LogInformation($"[LIVE_EVENT] {vmsConfig.Name}: '{deviceName}' changed to '{eventName}'");
                            
                            string category = _eventDefinitions.ContainsKey(eventTypeId) ? _eventDefinitions[eventTypeId].Category : "Unknown";
                            
                            if (source.Contains("cameras")) {
                                if (IsErrorState(eventTypeId)) _globalStates[cid].OnlineCameras--;
                                else if (isHealthy) _globalStates[cid].OnlineCameras++;
                                _globalStates[cid].OnlineCameras = Math.Clamp(_globalStates[cid].OnlineCameras, 0, _globalStates[cid].TotalCameras);
                            }

                            string actionType = category.Contains("Configuration") ? "CONFIG_CHANGE" : "STATUS_CHANGE";
                            if (IsErrorState(eventTypeId)) actionType = "ERROR_EVENT";

                            AuditLogger.Log("SYSTEM", actionType, $"[{vmsConfig.Name}] {deviceName} event: {eventName}", new { source, eventTypeId, eventName }, "System", cid);
                            }
                            SyncInfrastructureStatuses(cid);
                            await PushUpdate(cid);
                            }
                            }
                            } catch { }
                            }

                            private void SyncInfrastructureStatuses(string cid)
                            {
                            var state = _globalStates[cid];
                            foreach (var item in state.Infrastructure)
                            {
                            string sourceKey = "";
                            if (item.Type == "server") {
                            var rsMatch = _sourceNames.FirstOrDefault(kvp => kvp.Key.StartsWith("recordingServers/") && kvp.Value == item.MachineName);
                            sourceKey = rsMatch.Key;
                            } else if (item.Type == "hardware") {
                            var hwMatch = _sourceNames.FirstOrDefault(kvp => kvp.Key.StartsWith("hardware/") && kvp.Value == item.Name);
                            sourceKey = hwMatch.Key;
                            } else if (item.Type == "camera") {
                            var camMatch = _sourceNames.FirstOrDefault(kvp => kvp.Key.StartsWith("cameras/") && kvp.Value == item.Name);
                            sourceKey = camMatch.Key;
                            }

                            if (!string.IsNullOrEmpty(sourceKey) && state.ResourceStates.TryGetValue(sourceKey, out var guids))
                            {
                            item.Status = MapStateGuidToStatus(guids);
                            }
                            }
                            }

        private string MapStateGuidToStatus(List<string> guids)
        {
            if (guids == null || guids.Count == 0) return "ONLINE";
            var resolvedNames = new List<(string Name, bool IsProblem)>();
            foreach (var guid in guids) {
                if (_eventDefinitions.TryGetValue(guid, out var def)) {
                    string name = def.Name;
                    string lower = name.ToLower();
                    bool isProblem = lower.Contains("stopped") || lower.Contains("error") || lower.Contains("critical") || 
                                     lower.Contains("lost") || lower.Contains("broken") || lower.Contains("terminated") ||
                                     lower.Contains("unavailable") || lower.Contains("fail");
                    resolvedNames.Add((name, isProblem));
                }
            }
            var problem = resolvedNames.FirstOrDefault(r => r.IsProblem);
            if (problem.Name != null) return problem.Name;
            return resolvedNames.FirstOrDefault().Name ?? "ONLINE";
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
                        string hostname = s.TryGetProperty("hostname", out var h) ? h.GetString() : 
                                         (s.TryGetProperty("address", out var a) ? a.GetString() : name);

                        // Identify Connection Status
                        string rsSource = $"recordingServers/{id}";
                        _sourceNames[rsSource] = name; // Map RS name
                        string rsStatus = "ONLINE";
                        if (_globalStates[cid].ResourceStates.TryGetValue(rsSource, out var rsGuids)) {
                            rsStatus = MapStateGuidToStatus(rsGuids);
                        }

                        newInfra.Add(new InfrastructureHealth { 
                            Name = "VMS Service", 
                            Type = "server", 
                            Status = rsStatus, 
                            ConnectorId = cid,
                            MachineName = hostname 
                        });

                        // 1. Fetch Hardware
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
                                        _sourceNames[hSource] = hName; // Map HW name
                                        
                                        string hStatus = "ONLINE";
                                        if (_globalStates[cid].ResourceStates.TryGetValue(hSource, out var hGuids)) hStatus = MapStateGuidToStatus(hGuids);

                                        newInfra.Add(new InfrastructureHealth { Name = hName, Type = "hardware", Status = hStatus, ConnectorId = cid, MachineName = hostname });
                                    }
                                }
                            }
                        } catch { }

                        // 2. Fetch Storage
                        try {
                            var sReq = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/recordingServers/{id}/storages");
                            sReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                            var sRes = await _httpClient.SendAsync(sReq);
                            if (sRes.IsSuccessStatusCode) {
                                var diskJson = await sRes.Content.ReadAsStringAsync();
                                using var dDoc = JsonDocument.Parse(diskJson);
                                if (dDoc.RootElement.TryGetProperty("array", out var disks)) {
                                    foreach (var d in disks.EnumerateArray()) {
                                        string storageId = d.GetProperty("id").GetString();
                                        string storageName = d.GetProperty("name").GetString();
                                        string diskPath = d.TryGetProperty("diskPath", out var p) ? p.GetString() : "Unknown path";
                                        
                                        _sourceNames[$"storages/{storageId}"] = storageName;

                                        newInfra.Add(new InfrastructureHealth { 
                                            Name = storageName, 
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

                        // 3. Fetch Cameras
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
                                        _sourceNames[camSource] = camName; // Map Camera name
                                        
                                        string camStatus = "ONLINE";
                                        if (_globalStates[cid].ResourceStates.TryGetValue(camSource, out var camGuids)) camStatus = MapStateGuidToStatus(camGuids);

                                        newInfra.Add(new InfrastructureHealth { Name = camName, Type = "camera", Status = camStatus, ConnectorId = cid, MachineName = hostname });
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

        private bool IsErrorState(string eventTypeId) {
            if (_eventDefinitions.TryGetValue(eventTypeId, out var def)) {
                string n = def.Name.ToLower();
                // Exclude "Motion Stopped" or other non-critical stopped events
                if (n.Contains("motion")) return false;
                
                return n.Contains("error") || n.Contains("stopped") || n.Contains("lost") || n.Contains("critical") || n.Contains("fail") || n.Contains("unavailable");
            }
            return false;
        }

        private async Task<string> GetTokenAsync(ConnectorListModel config)
        {
            try {
                var request = new HttpRequestMessage(HttpMethod.Post, $"http://{config.IpServer}:{config.Port}/api/idp/connect/token");
                var content = new FormUrlEncodedContent(new[] {
                    new KeyValuePair<string, string>("grant_type", "password"),
                    new KeyValuePair<string, string>("username", config.Username),
                    new KeyValuePair<string, string>("password", config.Password),
                    new KeyValuePair<string, string>("client_id", "GrantValidatorClient")
                });
                request.Content = content;
                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode) {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    return doc.RootElement.GetProperty("access_token").GetString();
                }
            } catch { }
            return null;
        }

        private async Task SendAsync(ClientWebSocket ws, object data, string serverName, CancellationToken ct) {
            var json = JsonSerializer.Serialize(data);
            var bytes = Encoding.UTF8.GetBytes(json);
            await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, ct);
        }

        private async Task<string> ReceiveAsync(ClientWebSocket ws, string serverName, CancellationToken ct) {
            var buffer = new byte[1024 * 64];
            var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
            if (result.MessageType == WebSocketMessageType.Close) return null;
            return Encoding.UTF8.GetString(buffer, 0, result.Count);
        }
    }
}
