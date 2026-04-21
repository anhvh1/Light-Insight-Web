using LightInsightBUS.Interfaces.General;
using LightInsightModel.General;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace LightInsightService.Controllers.General
{
    [Route("api/[controller]")]
    [ApiController]
    public class IncidentController : ControllerBase
    {
        private readonly IIncident _incidentBUS;

        public IncidentController(IIncident incidentBUS)
        {
            _incidentBUS = incidentBUS;
        }

        [HttpGet("GetPaged")]
        public async Task<IActionResult> GetPaged([FromQuery] IncidentPagingRequest request)
        {
            var result = await _incidentBUS.GetPagedAsync(request);
            return Ok(result);
        }

        [HttpGet("GetById/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _incidentBUS.GetByIdAsync(id);
            return Ok(result);
        }

        [HttpPost("Add")]
        public async Task<IActionResult> Add(IncidentCreateModel model)
        {
            var result = await _incidentBUS.CreateAsync(model);
            return Ok(result);
        }

        [HttpPut("Update")]
        public async Task<IActionResult> Update(IncidentUpdateModel model)
        {
            var result = await _incidentBUS.UpdateAsync(model);
            return Ok(result);
        }

        [HttpDelete("Delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _incidentBUS.DeleteAsync(id);
            return Ok(result);
        }
    }
}
