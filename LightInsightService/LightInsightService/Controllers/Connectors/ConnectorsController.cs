using LightInsightBUS.Interfaces.Connectors;
using LightInsightBUS.Service.Connectors;
using LightInsightModel.Connectors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LightInsightService.Controllers.Connectors
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConnectorsController : ControllerBase
    {
        private readonly IConnectors iconnectors;
        public ConnectorsController(IConnectors connectors)
        {
            iconnectors = connectors;
        }
        [HttpPost("Connect")]
        public async Task<IActionResult> Connect(ConnectorsModel req)
        {
            var result = await iconnectors.AddConnectorAsync(req);
            return Ok(result);
        }

        [HttpPut("Update")]
        public async Task<IActionResult> Update(ConnectorsModel req)
        {
            var result = await iconnectors.UpdateConnectorAsync(req);
            return Ok(result);
        }

        [HttpDelete("Delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await iconnectors.DeleteConnectorAsync(id);
            return Ok(result);
        }

        [HttpGet("GetAllConnectors")]
        public async Task<IActionResult> GetAllConnectors()
        {
            var result = await iconnectors.GetAllConnectorsAsync();
            return Ok(result);
        }

        [HttpGet("GetAllVMS")]
        public async Task<IActionResult> GetAllVMS()
        {
            var result = await iconnectors.GetAllVMSAsync();
            return Ok(result);
        }
    }
}
