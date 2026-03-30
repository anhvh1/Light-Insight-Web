using LightInsightBUS.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LightInsightService.Controllers.MileStone.Camera
{
    [Route("api/[controller]")]
    [ApiController]
    public class CameraController : ControllerBase
    {
        private readonly ICameraService _service;

        public CameraController(ICameraService service)
        {
            _service = service;
        }

        [HttpGet("uris")]
        public IActionResult GetUris()
        {
            return Ok(_service.LoadCameraUriMap());
        }
    }
}
