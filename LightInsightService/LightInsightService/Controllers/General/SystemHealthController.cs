using LightInsightBUS.Interfaces.General;
using LightInsightModel.MileStone.General;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace LightInsightService.Controllers.General
{
    [Route("api/[controller]")]
    [ApiController]
    public class SystemHealthController : ControllerBase
    {
        private readonly ISystemHealth _systemHealthBUS;

        public SystemHealthController(ISystemHealth systemHealthBUS)
        {
            _systemHealthBUS = systemHealthBUS;
        }

        [HttpGet("Status")]
        public async Task<BaseResultModel> GetStatus()
        {
            return await _systemHealthBUS.GetSystemHealth();
        }
    }
}
