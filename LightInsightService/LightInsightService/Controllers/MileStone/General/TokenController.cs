using LightInsightBUS.Interfaces.MileStone.General;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.MileStone.General
{
    [Route("api/[controller]")]
    [ApiController]
    public class TokenController: ControllerBase
    {
        private readonly IToken _token;
        public TokenController(IToken token)
        {
            _token = token;
        }
        [HttpGet("WebRTC")]
        public async Task<IActionResult> GetTokenForWebRTC(Guid key)
        {
            var data = await _token.GetTokenForWebRTC(key);
            return Ok(data);
        }

    }
}
