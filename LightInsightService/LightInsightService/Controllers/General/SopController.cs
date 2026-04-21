using LightInsightBUS.Interfaces.General;
using LightInsightModel.General;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace LightInsightService.Controllers.General
{
    [Route("api/[controller]")]
    [ApiController]
    public class SopController : ControllerBase
    {
        private readonly ISop _sopBUS;

        public SopController(ISop sopBUS)
        {
            _sopBUS = sopBUS;
        }

        [HttpGet("GetPaged")]
        public async Task<IActionResult> GetPaged([FromQuery] SopPagingRequest request)
        {
            var result = await _sopBUS.GetPagedAsync(request);
            return Ok(result);
        }

        [HttpGet("GetById/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _sopBUS.GetByIdAsync(id);
            return Ok(result);
        }

        [HttpPost("Add")]
        public async Task<IActionResult> Add(SopCreateModel model)
        {
            var result = await _sopBUS.CreateAsync(model);
            return Ok(result);
        }

        [HttpPut("Update")]
        public async Task<IActionResult> Update(SopUpdateModel model)
        {
            var result = await _sopBUS.UpdateAsync(model);
            return Ok(result);
        }

        [HttpDelete("Delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _sopBUS.DeleteAsync(id);
            return Ok(result);
        }
    }
}
