using LightInsightBUS.ExternalServices.MileStone;
using LightInsightModel.General;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;

namespace LightInsightBUS.ExternalServices.MileStone
{
    public class MilestoneSystemProber
    {
        private readonly HttpClient _httpClient;
        private readonly GetAnalyticsEvents _tokenService;
        private static PerformanceCounter _cpuCounter;

        public MilestoneSystemProber(GetAnalyticsEvents tokenService)
        {
            _httpClient = new HttpClient();
            _httpClient.Timeout = TimeSpan.FromSeconds(5);
            _tokenService = tokenService;

            try {
                if (OperatingSystem.IsWindows())
                {
                    _cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                    _cpuCounter.NextValue(); // Khởi động counter
                }
            } catch (Exception ex) {
                Console.WriteLine("[SystemHealth] CPU Counter Init Error: " + ex.Message);
            }
        }

        public async Task<List<InfrastructureHealth>> GetInfrastructureStatusAsync()
        {
            var finalResult = new List<InfrastructureHealth>();
            try
            {
                var token = await _tokenService.GetTokenAsync();
                var config = _tokenService.GetVmsConfig(1);
                
                if (string.IsNullOrEmpty(token)) {
                    Console.WriteLine("[SystemHealth] Error: Could not get Milestone Token.");
                    return finalResult;
                }
                
                if (config == null) {
                    Console.WriteLine("[SystemHealth] Error: VMS Config not found in cache.");
                    return finalResult;
                }

                string baseUrl = $"http://{config.IpServer}:{config.Port}/API/rest/v1";
                Console.WriteLine($"[SystemHealth] Probing Milestone at: {baseUrl}");

                // Thực hiện các task và bẫy lỗi riêng cho từng task để không làm hỏng cả result
                var servers = await SafeGetRecordingServers(baseUrl, token);
                var storages = await SafeGetDetailedStorage(baseUrl, token);
                var events = await SafeGetEventServers(baseUrl, token);

                finalResult.AddRange(servers);
                finalResult.AddRange(storages);
                finalResult.AddRange(events);

                Console.WriteLine($"[SystemHealth] Prober scan complete. Found: {servers.Count} servers, {storages.Count} storages, {events.Count} event servers.");
            }
            catch (Exception ex)
            {
                Console.WriteLine("[SystemHealth] Critical Prober Error: " + ex.Message);
            }
            return finalResult;
        }

        public int GetCurrentCpuUsage()
        {
            try {
                if (_cpuCounter != null) return (int)_cpuCounter.NextValue();
            } catch { }
            return 0;
        }

        private async Task<List<InfrastructureHealth>> SafeGetRecordingServers(string baseUrl, string token)
        {
            var list = new List<InfrastructureHealth>();
            try {
                var response = await _httpClient.SendAsync(new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/recordingServers") { 
                    Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) } 
                });
                if (response.IsSuccessStatusCode) {
                    var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                    if (doc.RootElement.TryGetProperty("array", out var array)) {
                        foreach (var item in array.EnumerateArray()) {
                            string name = item.GetProperty("name").GetString();
                            string status = item.GetProperty("status").GetString();
                            list.Add(new InfrastructureHealth { Name = name, Description = "Milestone Recording Server", Status = status == "Running" ? "ONLINE" : "OFFLINE", Type = "server" });
                        }
                    }
                } else {
                    Console.WriteLine($"[SystemHealth] RecordingServers API Failed: {response.StatusCode}");
                }
            } catch (Exception ex) { Console.WriteLine("[SystemHealth] RecordingServers Exception: " + ex.Message); }
            return list;
        }

        private async Task<List<InfrastructureHealth>> SafeGetEventServers(string baseUrl, string token)
        {
            var list = new List<InfrastructureHealth>();
            try {
                var response = await _httpClient.SendAsync(new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/eventServers") { 
                    Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) } 
                });
                if (response.IsSuccessStatusCode) {
                    var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                    if (doc.RootElement.TryGetProperty("array", out var array)) {
                        foreach (var item in array.EnumerateArray()) {
                            list.Add(new InfrastructureHealth { Name = item.GetProperty("name").GetString(), Description = "Milestone Event Server", Status = "ONLINE", Type = "server" });
                        }
                    }
                }
            } catch { }
            return list;
        }

        private async Task<List<InfrastructureHealth>> SafeGetDetailedStorage(string baseUrl, string token)
        {
            var list = new List<InfrastructureHealth>();
            try
            {
                var response = await _httpClient.SendAsync(new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/recordingServers") { 
                    Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) } 
                });
                
                if (response.IsSuccessStatusCode)
                {
                    var serversDoc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                    foreach (var server in serversDoc.RootElement.GetProperty("array").EnumerateArray())
                    {
                        string serverId = server.GetProperty("id").GetString();
                        string serverName = server.GetProperty("name").GetString();

                        var storageRes = await _httpClient.SendAsync(new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/recordingServers/{serverId}/storages") { 
                            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) } 
                        });

                        if (storageRes.IsSuccessStatusCode)
                        {
                            var storagesDoc = JsonDocument.Parse(await storageRes.Content.ReadAsStringAsync());
                            if (storagesDoc.RootElement.TryGetProperty("array", out var storageArray))
                            {
                                foreach (var storage in storageArray.EnumerateArray())
                                {
                                    long capacity = GetLongValue(storage, "capacity", "totalSize");
                                    long usage = GetLongValue(storage, "usage", "usedSize");

                                    if (capacity > 0)
                                    {
                                        double totalTB = Math.Round(capacity / 1024.0 / 1024.0 / 1024.0 / 1024.0, 2);
                                        double usedTB = Math.Round(usage / 1024.0 / 1024.0 / 1024.0 / 1024.0, 2);
                                        int percent = (int)((usage * 100) / capacity);

                                        list.Add(new InfrastructureHealth { Name = $"Storage - {serverName}", Description = $"{usedTB}TB / {totalTB}TB", Status = $"{percent}%", Type = "storage" });
                                    }
                                }
                            }
                        }
                    }
                }
            } catch { }
            return list;
        }

        private long GetLongValue(JsonElement element, params string[] propertyNames)
        {
            foreach (var name in propertyNames)
            {
                if (element.TryGetProperty(name, out var prop))
                {
                    if (prop.ValueKind == JsonValueKind.Number) return prop.GetInt64();
                    if (prop.ValueKind == JsonValueKind.String && long.TryParse(prop.GetString(), out long val)) return val;
                }
            }
            return 0;
        }
    }
}
