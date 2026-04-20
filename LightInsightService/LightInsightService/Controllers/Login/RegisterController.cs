using LightInsightBUS.Interfaces.Login;
using LightInsightBUS.Interfaces.MileStone.General;
using LightInsightModel.Login;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LightInsightService.Controllers.Login
{
    [Route("api/[controller]")]
    [ApiController]
    public class RegisterController : ControllerBase
    {
        private readonly IRegister _service;
        public RegisterController(IRegister service)
        {
            _service = service;
        }
        [HttpPost("Register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            var result = await _service.Register(req);
            return Ok(result);
        }
    }
}
