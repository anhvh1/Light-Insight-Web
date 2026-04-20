using LightInsightBUS.Interfaces.General;
using LightInsightModel.MileStone.General;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using LightInsightService.Sockets.General;
using System.Threading.Tasks;

namespace LightInsightService.Controllers.General
{
    [Route("api/[controller]")]
    [ApiController]
    public class SystemHealthController : ControllerBase
    {
        private readonly ISystemHealth _systemHealthBUS;
        private readonly IHubContext<AuditLogHub> _hubContext;
        private readonly ILogger<SystemHealthController> _logger;

        public SystemHealthController(ISystemHealth systemHealthBUS, IHubContext<AuditLogHub> hubContext, ILogger<SystemHealthController> logger)
        {
            _systemHealthBUS = systemHealthBUS;
            _hubContext = hubContext;
            _logger = logger;
        }

        [HttpGet("Status")]
        public async Task<BaseResultModel> GetStatus()
        {
            return await _systemHealthBUS.GetSystemHealth();
        }

        [HttpPost("Report")]
        public async Task<BaseResultModel> Report([FromBody] MilestoneServerMetric report)
        {
            string json = System.Text.Json.JsonSerializer.Serialize(report);
            _logger.LogInformation("RECEIVED REPORT: {Json}", json);

            var result = await _systemHealthBUS.ReportMetrics(report);
            if (result.Status == 1)
            {
                _logger.LogInformation("PUSHING TO SIGNALR: {Id}", report.ServerId);
                await _hubContext.Clients.All.SendAsync("ReceiveAgentMetrics", report);
            }
            return result;
        }
    }
}
