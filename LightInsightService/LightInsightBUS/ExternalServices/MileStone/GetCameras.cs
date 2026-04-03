using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace LightInsightBUS.ExternalServices.MileStone
{
    class GetCameras
    {
        public string GetCameraById(string baseUrl, string token, string cameraId)
        {
            string result = string.Empty;
            try
            {
                // Khởi tạo handler (Bao gồm bỏ qua lỗi SSL đề phòng sau này bạn dùng HTTPS)
                var handler = new HttpClientHandler();
                handler.ServerCertificateCustomValidationCallback = (message, cert, chain, sslPolicyErrors) => true;

                using (var client = new HttpClient(handler))
                {
                    // Thiết lập địa chỉ gốc
                    client.BaseAddress = new Uri(baseUrl);

                    // Cấu hình Header nhận JSON
                    client.DefaultRequestHeaders.Accept.Clear();
                    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                    // Thêm Bearer Token vào Header
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    // Ghép tham số cameraId vào đường dẫn API
                    string endpoint = $"api/rest/v1/cameras/{cameraId}";

                    // Thực hiện gọi API (Sử dụng .Result để ép chạy đồng bộ giống code cũ của bạn)
                    HttpResponseMessage response = client.GetAsync(endpoint).Result;

                    if (response.IsSuccessStatusCode)
                    {
                        // Đọc dữ liệu JSON trả về
                        result = response.Content.ReadAsStringAsync().Result;
                    }
                    else
                    {
                        Console.WriteLine($"API Error: {response.StatusCode} - {response.ReasonPhrase}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error fetching camera by id: " + ex.Message);
            }

            return result;
        }
    }
}