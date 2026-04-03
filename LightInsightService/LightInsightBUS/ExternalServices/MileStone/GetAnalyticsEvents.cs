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

namespace LightInsightBUS.ExternalServices.MileStone
{
    public class GetAnalyticsEvents
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        private string _accessToken;
        private DateTime _expireTime;
        private readonly IMemoryCache _cache;

        public GetAnalyticsEvents(IMemoryCache cache)
        {
            _cache = cache;
        }

        public ConnectorsModel GetVmsConfig(int vmsid = 1)
        {
            string cacheKey = $"VMS_{vmsid}";
            if (_cache.TryGetValue(cacheKey, out object cacheObj))
            {
                if (cacheObj is ConnectorsModel model) return model;
                if (cacheObj is ConnectorListModel listModel)
                {
                    return new ConnectorsModel
                    {
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

        public async Task<string> GetTokenAsync()
        {
            try
            {
                // 1. Lấy cấu hình từ Cache (mặc định VMSID = 1)
                var config = GetVmsConfig(1);
                if (config == null) return null;

                // 2. Nếu token còn hạn → dùng lại
                if (!string.IsNullOrEmpty(_accessToken) && DateTime.Now < _expireTime)
                {
                    return _accessToken;
                }

                // 3. Xây dựng URL từ Cache
                string tokenUrl = $"http://{config.IpServer}:{config.Port}/API/IDP/connect/token";

                // 4. Gọi API lấy Token
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

                _accessToken = tokenResponse.access_token;
                _expireTime = DateTime.Now.AddSeconds(tokenResponse.expires_in - 30);

                return _accessToken;
            }
            catch (Exception)
            {
                return null;
            }
        }
        public async Task<string> CheckTokenAsync(string username, string password, string ipserver, long port)
        {
            try
            {

                // 2. Nếu token còn hạn → dùng lại
                if (!string.IsNullOrEmpty(_accessToken) && DateTime.Now < _expireTime)
                {
                    return _accessToken;
                }

                // 3. Xây dựng URL từ Cache
                string tokenUrl = $"http://{ipserver}:{port}/API/IDP/connect/token";

                // 4. Gọi API lấy Token
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

                _accessToken = tokenResponse.access_token;
                _expireTime = DateTime.Now.AddSeconds(tokenResponse.expires_in - 30);

                return _accessToken;
            }
            catch (Exception)
            {
                return null;
            }
        }

        public async Task<List<SimpleEvent>> GetSimpleEventsAsync()
        {
            var config = GetVmsConfig(1);
            if (config == null) return new List<SimpleEvent>();

            string token = await GetTokenAsync();
            if (string.IsNullOrEmpty(token)) return new List<SimpleEvent>();

            string apiUrl = $"http://{config.IpServer}:{config.Port}/API/rest/v1/analyticsEvents";
            
            var request = new HttpRequestMessage(HttpMethod.Get, apiUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);

            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                token = await GetTokenAsync();
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
        public async Task<List<CameraItem>> GetCamerasAsync()
        {
            var config = GetVmsConfig(1);
            if (config == null) return new List<CameraItem>();

            string token = await GetTokenAsync();
            if (string.IsNullOrEmpty(token)) return new List<CameraItem>();

            string apiUrl = $"http://{config.IpServer}:{config.Port}/API/rest/v1/Cameras";

            var request = new HttpRequestMessage(HttpMethod.Get, apiUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);

            // 🔁 retry nếu token hết hạn
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                token = await GetTokenAsync();
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                response = await _httpClient.SendAsync(request);
            }

            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(json);
            var list = new List<CameraItem>();

            if (doc.RootElement.TryGetProperty("array", out var array))
            {
                foreach (var item in array.EnumerateArray())
                {
                    list.Add(new CameraItem
                    {
                        Id = item.GetProperty("id").GetString(),
                        Name = item.GetProperty("name").GetString()
                    });
                }
            }

            return list;
        }
    }
}
