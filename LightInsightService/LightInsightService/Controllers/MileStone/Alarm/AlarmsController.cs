using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using LightInsightBUS.Interfaces.MileStone.Alarm;
using LightInsightModel.MileStone.General;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LightInsightService.Controllers.MileStone.Alarm
{
    [ApiController]
    [Route("api/milestone")]
    public class AlarmsController : ControllerBase
    {
        private readonly IAlarmService _alarmService;

        public AlarmsController(IAlarmService alarmService)
        {
            _alarmService = alarmService;
        }

        public class GetAlarmsRequest
        {
            [Required]
            public Guid MapId { get; set; }
            public int Page { get; set; }
            public int Size { get; set; }
        }

        [HttpGet("GetAlarms")]
        public async Task<IActionResult> GetAlarms([FromQuery] GetAlarmsRequest request)
        {
            try
            {
                if (request.MapId == Guid.Empty)
                {
                    return BadRequest("MapId cannot be empty.");
                }
                var alarms = await _alarmService.GetAlarmsAsync(request.MapId, request.Page, request.Size);
                var result = new BaseResultModel();
                result.Data = alarms;
                result.Message = "Thành công";
                result.Status = 1;
                return Ok(result);
            }
            catch (Exception ex)
            {
                // Log the exception details here
                return StatusCode(500, $"An internal error occurred: {ex.Message}");
            }
        }
    }
}
