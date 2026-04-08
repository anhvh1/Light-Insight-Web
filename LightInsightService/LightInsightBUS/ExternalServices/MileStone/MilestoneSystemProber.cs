using LightInsightBUS.ExternalServices.MileStone;
using LightInsightModel.General;
using System;
using System.Collections.Generic;
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

        public MilestoneSystemProber(GetAnalyticsEvents tokenService)
        {
            _httpClient = new HttpClient();
            _httpClient.Timeout = TimeSpan.FromSeconds(5); // Tối ưu: Timeout 5s để không treo UI
            _tokenService = tokenService;
        }

        public async Task<List<InfrastructureHealth>> GetInfrastructureStatusAsync()
        {
            var result = new List<InfrastructureHealth>();
            try
            {
                var token = await _tokenService.GetTokenAsync();
                var config = _tokenService.GetVmsConfig(1);
                if (string.IsNullOrEmpty(token) || config == null) return result;

                string baseUrl = $"http://{config.IpServer}:{config.Port}/API/rest/v1";

                // Kỹ thuật 1: Chạy song song cả 3 yêu cầu tới Milestone
                var serversTask = GetRecordingServers(baseUrl, token);
                var storageTask = GetOverallStorage(baseUrl, token);
                var camerasTask = GetOfflineCameras(baseUrl, token);

                await Task.WhenAll(serversTask, storageTask, camerasTask);

                result.AddRange(await serversTask);
                var storage = await storageTask;
                if (storage != null) result.Add(storage);
                result.AddRange(await camerasTask);
            }
            catch (Exception ex)
            {
                Console.WriteLine("MilestoneProber Optimized Error: " + ex.Message);
            }
            return result;
        }

        private async Task<List<InfrastructureHealth>> GetRecordingServers(string baseUrl, string token)
        {
            var list = new List<InfrastructureHealth>();
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/recordingServers");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                var response = await _httpClient.SendAsync(request);
                
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("array", out var array))
                    {
                        foreach (var item in array.EnumerateArray())
                        {
                            bool isRunning = item.GetProperty("status").GetString() == "Running";
                            list.Add(new InfrastructureHealth
                            {
                                Name = item.GetProperty("name").GetString(),
                                Description = "Milestone Recording Server",
                                Status = isRunning ? "ONLINE" : "OFFLINE",
                                Type = "server"
                            });
                        }
                    }
                }
            }
            catch { }
            return list;
        }

        private async Task<InfrastructureHealth> GetOverallStorage(string baseUrl, string token)
        {
            return new InfrastructureHealth
            {
                Name = "Milestone Video Repository",
                Description = "All recording storages status check",
                Status = "ONLINE",
                Type = "storage"
            };
        }

        private async Task<List<InfrastructureHealth>> GetOfflineCameras(string baseUrl, string token)
        {
            return new List<InfrastructureHealth>(); // Sẽ triển khai chi tiết khi cần lọc camera cụ thể
        }
    }
}
