using LightInsightModel.MileStone.General;
using Microsoft.Extensions.Caching.Memory;
using LightInsightModel.Connectors;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Runtime.CompilerServices;
using LightInsightModel.Enums;
using LightInsightModel.General;
using System.Collections.Concurrent;
using System.Net;

namespace LightInsightBUS.ExternalServices.MileStone
{
    public class GetAnalyticsEvents
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        private readonly IMemoryCache _cache;

        public GetAnalyticsEvents(IMemoryCache cache)
        {
            _cache = cache;
        }

        public ConnectorsModel GetVmsConfig(Guid key)
        {
            string cacheKey = $"{key}";
            if (_cache.TryGetValue(cacheKey, out object cacheObj))
            {
                if (cacheObj is ConnectorsModel model) return model;
                if (cacheObj is ConnectorListModel listModel)
                {
                    return new ConnectorsModel
                    {
                        Name = listModel.Name,
                        IpServer = listModel.IpServer,
                        Port = listModel.Port,
                        Username = listModel.Username,
                        Password = listModel.Password,
                        VMSID = listModel.VmsID
                    };
                }
            }
            return null;
        }

        private static readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

        public async Task<string> GetTokenAsync(Guid key)
        {
            string cacheKey = $"TOKEN_{key}";

            // 1. Check cache trước
            if (_cache.TryGetValue(cacheKey, out string token))
            {
                return token;
            }

            // 2. Lock theo key để tránh gọi API nhiều lần
            var myLock = _locks.GetOrAdd(cacheKey, _ => new SemaphoreSlim(1, 1));

            await myLock.WaitAsync();
            try
            {
                // 3. Check lại cache sau khi lock (rất quan trọng)
                if (_cache.TryGetValue(cacheKey, out token))
                {
                    return token;
                }

                // 4. Lấy config
                var config = GetVmsConfig(key);
                if (config == null) return null;

                string tokenUrl = $"http://{config.IpServer}:{config.Port}/API/IDP/connect/token";

                var request = new HttpRequestMessage(HttpMethod.Post, tokenUrl);
                request.Content = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("grant_type", "password"),
                    new KeyValuePair<string, string>("username", config.Username),
                    new KeyValuePair<string, string>("password", config.Password),
                    new KeyValuePair<string, string>("client_id", "GrantValidatorClient"),
                });

                request.Headers.Add("Accept", "application/json");

                var response = await _httpClient.SendAsync(request);
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync();
                var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(json);

                token = tokenResponse?.access_token;

                if (string.IsNullOrEmpty(token)) return null;

                // 5. TTL an toàn (tránh expires_in nhỏ)
                var ttl = Math.Max(10, tokenResponse.expires_in - 30);

                _cache.Set(cacheKey, token, TimeSpan.FromSeconds(ttl));

                return token;
            }
            catch
            {
                return null;
            }
            finally
            {
                myLock.Release();
            }
        }
        public async Task<string> CheckTokenAsync(string username, string password, string ipserver, long port)
        {
            try
            {

                string tokenUrl = $"http://{ipserver}:{port}/API/IDP/connect/token";

                var request = new HttpRequestMessage(HttpMethod.Post, tokenUrl);
                request.Content = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("grant_type", "password"),
                    new KeyValuePair<string, string>("username", username),
                    new KeyValuePair<string, string>("password", password),
                    new KeyValuePair<string, string>("client_id", "GrantValidatorClient"),
                });

                request.Headers.Add("Accept", "application/json");

                var response = await _httpClient.SendAsync(request);
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync();
                var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(json);

                var token = tokenResponse.access_token;

                return token;
            }
            catch (Exception)
            {
                return null;
            }
        }

        public async Task<List<SimpleEvent>> GetSimpleEventsAsync(Guid key)
        {
            var config = GetVmsConfig(key);
            if (config == null) return new List<SimpleEvent>();

            string token = await GetTokenAsync(key);
            if (string.IsNullOrEmpty(token)) return new List<SimpleEvent>();

            string apiUrl = $"http://{config.IpServer}:{config.Port}/API/rest/v1/alarmDefinitions";

            var request = new HttpRequestMessage(HttpMethod.Get, apiUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);

            // 🔥 FIX QUAN TRỌNG
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                // ❗ XÓA TOKEN CŨ TRONG CACHE
                _cache.Remove($"TOKEN_{key}");

                // ❗ LẤY TOKEN MỚI
                token = await GetTokenAsync(key);

                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                response = await _httpClient.SendAsync(request);
            }

            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(json);
            var list = new List<SimpleEvent>();

            if (doc.RootElement.TryGetProperty("array", out var array))
            {
                foreach (var item in array.EnumerateArray())
                {
                    list.Add(new SimpleEvent
                    {
                        ID = item.GetProperty("id").GetString(),
                        Name = item.GetProperty("name").GetString()
                    });
                }
            }

            return list;
        }
        public async Task<List<CameraItem>> GetCamerasAsync(Guid key)
        {
            var config = GetVmsConfig(key);
            if (config == null) return new List<CameraItem>();

            var token = await GetTokenAsync(key);
            if (string.IsNullOrEmpty(token)) return new List<CameraItem>();

            var apiUrl = $"http://{config.IpServer}:{config.Port}/API/rest/v1/Cameras";

            var response = await SendRequestAsync(apiUrl, token);

            // retry nếu token hết hạn
            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                token = await GetTokenAsync(key);
                if (string.IsNullOrEmpty(token)) return new List<CameraItem>();

                response = await SendRequestAsync(apiUrl, token);
            }

            response.EnsureSuccessStatusCode();

            return await ParseResponseAsync(response);
        }
        private async Task<List<CameraItem>> GetMicrophonesAsync(Guid key)
        {
            var config = GetVmsConfig(key);
            if (config == null) return new List<CameraItem>();

            var token = await GetTokenAsync(key);
            if (string.IsNullOrEmpty(token)) return new List<CameraItem>();

            var apiUrl = $"http://{config.IpServer}:{config.Port}/API/rest/v1/Microphones";

            var response = await SendRequestAsync(apiUrl, token);

            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                token = await GetTokenAsync(key);
                if (string.IsNullOrEmpty(token)) return new List<CameraItem>();

                response = await SendRequestAsync(apiUrl, token);
            }

            response.EnsureSuccessStatusCode();

            return await ParseResponseAsync(response);
        }
        private async Task<List<CameraItem>> GetSpeakersAsync(Guid key)
        {
            var config = GetVmsConfig(key);
            if (config == null) return new List<CameraItem>();

            var token = await GetTokenAsync(key);
            if (string.IsNullOrEmpty(token)) return new List<CameraItem>();

            var apiUrl = $"http://{config.IpServer}:{config.Port}/API/rest/v1/Speakers";

            var response = await SendRequestAsync(apiUrl, token);

            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                token = await GetTokenAsync(key);
                if (string.IsNullOrEmpty(token)) return new List<CameraItem>();

                response = await SendRequestAsync(apiUrl, token);
            }

            response.EnsureSuccessStatusCode();

            return await ParseResponseAsync(response);
        }
        private async Task<HttpResponseMessage> SendRequestAsync(string url, string token)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            return await _httpClient.SendAsync(request);
        }
        private async Task<List<CameraItem>> ParseResponseAsync(HttpResponseMessage response)
        {
            var json = await response.Content.ReadAsStringAsync();

            // Cấu hình để không phân biệt hoa thường (vì JSON là "array", "id"... còn Class là "Array", "Id"...)
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var result = JsonSerializer.Deserialize<CameraResponse>(json, options);

            return result?.Array ?? new List<CameraItem>();
        }
        public async Task<string> GetHardwareIpAsync(Guid key, string hardwareId)
        {
            if (string.IsNullOrEmpty(hardwareId)) return string.Empty;

            string cacheKey = $"HW_IP_{hardwareId}";
            if (_cache.TryGetValue(cacheKey, out string cachedIp))
            {
                return cachedIp;
            }

            var config = GetVmsConfig(key);
            if (config == null) return string.Empty;

            string token = await GetTokenAsync(key);
            if (string.IsNullOrEmpty(token)) return string.Empty;

            string apiUrl = $"http://{config.IpServer}:{config.Port}/api/rest/v1/hardware/{hardwareId}";
            var response = await SendRequestAsync(apiUrl, token);

            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                _cache.Remove($"TOKEN_{key}");
                token = await GetTokenAsync(key);
                response = await SendRequestAsync(apiUrl, token);
            }

            if (!response.IsSuccessStatusCode) return string.Empty;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("data", out var data) && data.TryGetProperty("address", out var addressProp))
            {
                string address = addressProp.GetString();
                string ip = ExtractIpFromAddress(address);
                _cache.Set(cacheKey, ip, TimeSpan.FromHours(24)); // IP hardware ít thay đổi
                return ip;
            }

            return string.Empty;
        }

        private string ExtractIpFromAddress(string address)
        {
            if (string.IsNullOrEmpty(address)) return string.Empty;
            try
            {
                // Xử lý chuỗi như http://192.168.100.66:554/ hoặc rtsp://192.168.100.66...
                if (address.Contains("://"))
                {
                    Uri uri = new Uri(address);
                    return uri.Host;
                }
                // Nếu là chuỗi thuần IP hoặc kèm port mà không có scheme
                return address.Split(':')[0].Replace("/", "").Trim();
            }
            catch
            {
                return address;
            }
        }
        public async Task<List<GenericDeviceModel>> GetAllDevicesAsync(Guid key)
        {
            var camerasTask = GetCamerasAsync(key);
            var microphonesTask = GetMicrophonesAsync(key);
            var speakersTask = GetSpeakersAsync(key);

            await Task.WhenAll(camerasTask, microphonesTask, speakersTask);

            var cameras = await camerasTask;
            var microphones = await microphonesTask;
            var speakers = await speakersTask;

            var allDevices = new List<GenericDeviceModel>();

            // Lấy IP cho từng camera song song để tăng hiệu năng
            var cameraDeviceTasks = cameras.Select(async c => new GenericDeviceModel
            {
                Id = c.Id,
                Name = c.Name,
                Type = DeviceType.Camera,
                Connectorid = key,
                IP = await GetHardwareIpAsync(key, c.HardwareId)
            }).ToList();

            var cameraDevices = await Task.WhenAll(cameraDeviceTasks);
            allDevices.AddRange(cameraDevices);

            allDevices.AddRange(microphones.Select(m => new GenericDeviceModel { Id = m.Id, Name = m.Name, Type = DeviceType.Microphone, Connectorid = key }));
            allDevices.AddRange(speakers.Select(s => new GenericDeviceModel { Id = s.Id, Name = s.Name, Type = DeviceType.Speaker, Connectorid = key }));

            return allDevices;
        }
    }
}
