using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text;

namespace LightInsightService.Controllers.MileStone.Camera
{
    [Route("api/[controller]")]
    [ApiController]
    public class WebhookController : ControllerBase
    {

        // hàm này là đang test nhận dữ liệu từ milestone (Thành công)
        [HttpPost("event")]
        public IActionResult ReceiveEvent([FromBody] JsonElement data)
        {
            try
            {
                // 🔥 lấy JSON raw
                string rawJson = data.ToString();

                // 🔥 tạo folder logs
                string logFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs");
                if (!Directory.Exists(logFolder))
                    Directory.CreateDirectory(logFolder);

                // 🔥 file theo ngày
                string filePath = Path.Combine(logFolder, $"log_{DateTime.Now:yyyyMMdd}.txt");

                // 🔥 nội dung log
                var logBuilder = new StringBuilder();
                logBuilder.AppendLine("=== RECEIVED EVENT ===");
                logBuilder.AppendLine($"Time: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
                logBuilder.AppendLine($"Payload: {rawJson}");
                logBuilder.AppendLine("------------------------------------");

                // 🔥 ghi file
                System.IO.File.AppendAllText(filePath, logBuilder.ToString(), Encoding.UTF8);

                return Ok(new { status = "received" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
    }
}
