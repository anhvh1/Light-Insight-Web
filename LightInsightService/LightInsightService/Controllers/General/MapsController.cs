using LightInsightModel.MileStone.General;
using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Threading.Tasks;

namespace LightInsightService.Controllers.General
{
    [ApiController]
    [Route("api/v1/maps")]
    public class MapsController : ControllerBase
    {
        [HttpGet("options")]
        public IActionResult GetOptions()
        {
            //var result = new BaseResultModel();
            //result.Data = 
            //result.Message = "Thành công";
            //result.Status = 1;
            return Ok(new
            {
                geoStyleUrl = "/mapstyles/vietnam-omt-style.json",
                routingEnabled = true
            });
        }
    }
}

