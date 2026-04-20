using LightInsightBUS.Interfaces.Connectors;
using LightInsightBUS.Service.Connectors;
using LightInsightModel.Connectors;
using LightInsightService.CacheLoader;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace LightInsightService.Controllers.Connectors
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConnectorsController : ControllerBase
    {
        private readonly IConnectors iconnectors;
        private readonly IMemoryCache _cache;

        public ConnectorsController(IMemoryCache cache, IConnectors connectors)
        {
            iconnectors = connectors;
            _cache = cache;
        }
        [HttpGet("cache/{vmsid}")] 
        public IActionResult CheckCacheByVmsId(int vmsid) 
        { 
            string cacheKey = $"VMS_{vmsid}"; 
            if (_cache.TryGetValue(cacheKey, out object data)) 
            { 
                return Ok(new { Status = 1, Message = "Cache HIT", Key = cacheKey, Data = data }); 
            } 
            return Ok(new { Status = 0, Message = "Cache MISS", Key = cacheKey }); 
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
