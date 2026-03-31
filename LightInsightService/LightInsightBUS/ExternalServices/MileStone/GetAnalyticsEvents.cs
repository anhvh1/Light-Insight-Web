using LightInsightModel.MileStone.General;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace LightInsightBUS.ExternalServices.MileStone
{
    public class GetAnalyticsEvents
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        private const string API_URL = "http://192.168.100.10:80/API/rest/v1/analyticsEvents";
        private string _accessToken;
        private DateTime _expireTime;

        private const string TOKEN_URL = "http://192.168.100.10:80/API/IDP/connect/token";

        public async Task<string> GetTokenAsync()
        {
            // Nếu token còn hạn → dùng lại
            if (!string.IsNullOrEmpty(_accessToken) && DateTime.Now < _expireTime)
            {
                return _accessToken;
            }

            // Nếu hết hạn → gọi lại API
            var request = new HttpRequestMessage(HttpMethod.Post, TOKEN_URL);

            request.Content = new FormUrlEncodedContent(new[]
            {
            new KeyValuePair<string, string>("grant_type", "password"),
            new KeyValuePair<string, string>("username", "admin"),
            new KeyValuePair<string, string>("password", "Promise@123"),
            new KeyValuePair<string, string>("client_id", "GrantValidatorClient"),
        });

            request.Headers.Add("Accept", "application/json");

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();

            var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(json);

            // Lưu token
            _accessToken = tokenResponse.access_token;

            // Trừ buffer 30s để tránh sát hạn bị lỗi
            _expireTime = DateTime.Now.AddSeconds(tokenResponse.expires_in - 30);

            return _accessToken;
        }
        public async Task<List<SimpleEvent>> GetSimpleEventsAsync()
        {
            string token = await GetTokenAsync();

            var request = new HttpRequestMessage(HttpMethod.Get, API_URL);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);

            // retry nếu token hết hạn
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                token = await GetTokenAsync();
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                response = await _httpClient.SendAsync(request);
            }

            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();

            // parse raw JSON
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
    }
}
