using LightInsightBUS.Interfaces.General;
using LightInsightDAL.Repositories.General;
using LightInsightModel.MileStone.General;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LightInsightService.Controllers.General
{
    [Route("api/cameras")]
    [ApiController]
    public class CameraStatusController : ControllerBase
    {
        private readonly ICameraStatusService _statusService;
        private readonly DMMapDAL _dmMapDAL = new DMMapDAL();

        public CameraStatusController(ICameraStatusService statusService)
        {
            _statusService = statusService;
        }

        /// <summary>
        /// Lấy trạng thái ONLINE/OFFLINE của toàn bộ hoặc theo bản đồ.
        /// </summary>
        /// <param name="mapId">Optional: Lọc theo MapId</param>
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus([FromQuery] Guid? mapId)
        {
            try
            {
                IEnumerable<string> filterCameraIds = null;
                
                if (mapId.HasValue)
                {
                    var markers = await _dmMapDAL.GetMarkersByMapIdAsync(mapId.Value);
                    filterCameraIds = markers.Select(m => m.CameraId).Distinct();
                }
                var result = new BaseResultModel();
                var data = _statusService.GetSummary(filterCameraIds);
                result.Data = data;
                result.Status = 1;
                result.Message = "Thành công";
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }
    }
}
