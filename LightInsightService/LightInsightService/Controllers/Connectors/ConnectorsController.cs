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
    }
}
