using LightInsightBUS.Interfaces.MileStone.Alarm;
using LightInsightBUS.Interfaces.MileStone.Camera;
using LightInsightModel.MileStone.Alarm;
using Microsoft.AspNetCore.Mvc;

namespace LightInsightService.Controllers.MileStone.Alarm
{
    [Route("api/[controller]")]
    [ApiController]
    public class AlarmController : ControllerBase
    {
        private readonly IAlarmService _service;
        private readonly ICameraDropDown _cameraDropDown;

        // Tiêm (Inject) IAlarmService thông qua Constructor
        public AlarmController(IAlarmService service, ICameraDropDown cameraDropDown)
        {
            _service = service;
            _cameraDropDown = cameraDropDown;
        }

        // Đặt tên Route cho endpoint này, ví dụ: api/Alarm/List
        [HttpGet("GetAll")]
        public async Task<IActionResult> GetAlarmData([FromQuery] Guid key, [FromQuery] int page = 1, [FromQuery] int pageSize = 100, [FromQuery] AlarmFilter filter = null)
        {
            if (key == Guid.Empty)
            {
                return BadRequest("Missing or invalid connector key.");
            }

            // Đảm bảo dữ liệu hợp lệ
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 100;

            // Gọi hàm và dùng await để chờ dữ liệu trả về từ tầng BUS
            var result = await _service.GetAlarmData(key, page, pageSize, filter);

            // Trả về HTTP Status 200 (OK) kèm theo danh sách dữ liệu JSON
            return Ok(result);
        }

        [HttpGet("MessageDropdown")]
        public async Task<IActionResult> GetMessageDropdown([FromQuery] Guid key)
        {
            if (key == Guid.Empty)
            {
                return BadRequest("Missing or invalid connector key.");
            }

            // Tận dụng biến _service có sẵn để gọi hàm lấy danh sách Message
            var result = await _service.GetAlarmMessageDropdownAsync(key);

            // Trả về HTTP Status 200 (OK) kèm theo mảng chuỗi (List<string>)
            return Ok(result);
        }

        [HttpGet("CameraDropdown")]
        public async Task<IActionResult> GetCameraDropdown(Guid key)
        {
            if (key == Guid.Empty)
            {
                return BadRequest("Missing or invalid connector key.");
            }

            var result = await _cameraDropDown.GetCameraDropdownAsync(key);
            return Ok(result);
        }
    }
}
