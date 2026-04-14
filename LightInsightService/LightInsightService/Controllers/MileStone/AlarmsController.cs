using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using LightInsightBUS.Interfaces.MileStone.Alarm;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LightInsightService.Controllers.MileStone
{
    [ApiController]
    [Route("api/milestone")]
    [Authorize] // Requires authentication for all actions in this controller
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
            public List<string> CameraIds { get; set; }

            [Required]
            public DateTime StartTime { get; set; }

            [Required]
            public DateTime EndTime { get; set; }
        }

        [HttpGet("{vmsId}/alarms")]
        public async Task<IActionResult> GetAlarms(
            [FromRoute] int vmsId,
            [FromQuery] GetAlarmsRequest request)
        {
            try
            {
                // Extract the token from the Authorization header
                var authHeader = Request.Headers["Authorization"].ToString();
                if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                {
                    return Unauthorized("Bearer token is missing or invalid.");
                }
                var token = authHeader.Substring("Bearer ".Length).Trim();

                if (request.CameraIds == null || !request.CameraIds.Any())
                {
                    return BadRequest("CameraIds list cannot be empty.");
                }

                var alarms = await _alarmService.GetAlarmsAsync(token, vmsId, request.CameraIds, request.StartTime, request.EndTime);
                return Ok(alarms);
            }
            catch (Exception ex)
            {
                // Log the exception details here
                return StatusCode(500, $"An internal error occurred: {ex.Message}");
            }
        }
    }
}
