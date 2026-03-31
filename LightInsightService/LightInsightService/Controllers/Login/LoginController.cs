using LightInsightBUS.Interfaces.Login;
using LightInsightModel.Login;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LightInsightService.Controllers.Login
{
    [Route("api/[controller]")]
    [ApiController]
    public class LoginController : ControllerBase
    {
        private readonly ILogin _service;
        public LoginController(ILogin login)
        {
            _service = login;
        }
        [HttpPost("Login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            var result = await _service.Login(req.Username,req.Password);
            return Ok(result);
        }
        [HttpGet("Users")]
        public async Task<IActionResult> Users([FromQuery] PagingRequest req)
        {
            var result = await _service.GetUsers(req.Search,req.Page,req.PageSize);
            return Ok(result);
        }
    }

    
}
