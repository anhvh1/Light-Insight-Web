using LightInsightBUS.Interfaces.General;
using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace LightInsightService.Controllers.General
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuditLogController : ControllerBase
    {
        private readonly IAuditLog _service;

        public AuditLogController(IAuditLog service)
        {
            _service = service;
        }

        [HttpGet("GetAll")]
        public async Task<BaseResultModel> GetAll([FromQuery] AuditLogPagingRequest req)
        {
            return await _service.GetAuditLogs(req);
        }
    }
}
