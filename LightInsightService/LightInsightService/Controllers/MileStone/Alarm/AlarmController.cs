using LightInsightBUS.Interfaces.MileStone.Alarm;
using Microsoft.AspNetCore.Mvc;

namespace LightInsightService.Controllers.MileStone.Alarm
{
    [Route("api/[controller]")]
    [ApiController]
    public class AlarmController : ControllerBase
    {
        private readonly IAlarmService _service;

        // Tiêm (Inject) IAlarmService thông qua Constructor
        public AlarmController(IAlarmService service)
        {
            _service = service;
        }

        // Đặt tên Route cho endpoint này, ví dụ: api/Alarm/List
        [HttpGet("GetAll")]
        public async Task<IActionResult> GetAlarmData()
        {
            // Gọi hàm và dùng await để chờ dữ liệu trả về từ tầng BUS
            var result = await _service.GetAlarmData();

            // Trả về HTTP Status 200 (OK) kèm theo danh sách dữ liệu JSON
            return Ok(result);
        }
    }
}
