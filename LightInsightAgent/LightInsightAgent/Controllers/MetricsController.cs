using Microsoft.AspNetCore.Mvc;
using LightInsightAgent.Services;
using System.Threading.Tasks;

namespace LightInsightAgent.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MetricsController : ControllerBase
    {
        private readonly IMetricsService _metricsService;

        public MetricsController(IMetricsService metricsService)
        {
            _metricsService = metricsService;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var metrics = await _metricsService.GetCurrentMetricsAsync();
            return Ok(metrics);
        }
    }
}
