using LightInsightBUS.Interfaces.MileStone.General;
using LightInsightModel.MileStone.General;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LightInsightService.Controllers.MileStone.General
{
    [Route("api/[controller]")]
    [ApiController]
    public class PrioritiesController : ControllerBase
    {
        private readonly IPriority _service;
        public PrioritiesController(IPriority service)
        {
            _service = service;
        }
        [HttpGet("Priority")]
        public async Task<IActionResult> GetPriority()
        {
            var data = await _service.GetPrioritiesAsync();
            return Ok(data);
        }
        [HttpGet("AnalyticsEvents")]
        public async Task<IActionResult> AnalyticsEvents(Guid key)
        {
            var data = await _service.GetSimpleEventsAsync(key);
            return Ok(data);
        }
        // ================= GET =================
        [HttpGet("GetAll")]
        public async Task<IActionResult> GetAll()
        {
            var data = await _service.GetAllAsync();

            return Ok(new
            {
                success = true,
                data
            });
        }

        // ================= INSERT =================
        [HttpPost("Insert")]
        public async Task<IActionResult> Insert([FromBody] MappingVMSPriorityInsertModel request)
        {
            if (request == null || request.AnalyticsEvents == null || !request.AnalyticsEvents.Any())
            {
                return BadRequest("Dữ liệu không hợp lệ");
            }

            var result = await _service.InsertAsync(request.PriorityID, request.AnalyticsEvents);

            return Ok(result);
        }

        // ================= UPDATE =================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] MappingVMSPriorityUpdateModel request)
        {
            if (request == null)
            {
                return BadRequest("Dữ liệu không hợp lệ");
            }

            var result = await _service.UpdateAsync(id, request.PriorityID);

            return Ok(result);
        }

        // ================= DELETE =================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            return Ok(result);
        }
    }
}
