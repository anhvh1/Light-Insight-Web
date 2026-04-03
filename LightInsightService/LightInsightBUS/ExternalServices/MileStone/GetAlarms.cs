using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace LightInsightBUS.ExternalServices.MileStone
{
    class GetAlarms
    {
        /// <summary>
        /// Hàm lấy dữ liệu Alarms dùng HttpClient có sẵn của .NET
        /// </summary>
        public string GetAlarmsList(string baseUrl, string token, int pageIndex, int pageSize)
        {
            string result = string.Empty;

            try
            {
                // Bỏ qua lỗi SSL khi gọi HTTPS qua IP (giống như cách làm trước đó)
                var handler = new HttpClientHandler();
                handler.ServerCertificateCustomValidationCallback = (message, cert, chain, sslPolicyErrors) => true;

                // Khởi tạo HttpClient với handler ở trên
                using (var client = new HttpClient(handler))
                {
                    // Thiết lập địa chỉ gốc
                    client.BaseAddress = new Uri(baseUrl);

                    // Thêm Header Accept báo rằng ta muốn nhận về định dạng JSON
                    client.DefaultRequestHeaders.Accept.Clear();
                    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                    // Thêm Header Authorization chứa Bearer Token
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    // Thực hiện gọi API (Phương thức GET)
                    // Lưu ý: HttpClient mặc định là bất đồng bộ (async), dùng .Result để ép nó chạy đồng bộ cho giống hàm gốc của bạn
                    string endpoint = $"/api/rest/v1/alarms?page={pageIndex}&size={pageSize}";
                    HttpResponseMessage response = client.GetAsync(endpoint).Result;

                    if (response.IsSuccessStatusCode)
                    {
                        // Đọc dữ liệu trả về
                        result = response.Content.ReadAsStringAsync().Result;
                    }
                    else
                    {
                        Console.WriteLine($"API Error: {response.StatusCode}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error fetching alarms: " + ex.Message);
            }

            return result;
        }
    }
}