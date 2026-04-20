using LightInsightBUS.Interfaces.General;
using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Threading.Tasks;

namespace LightInsightService.Controllers.General
{
    [Route("api/[controller]")]
    [ApiController]
    public class SystemConfigController : ControllerBase
    {
        private readonly ISystemConfig _systemConfigBUS;

        public SystemConfigController(ISystemConfig systemConfigBUS)
        {
            _systemConfigBUS = systemConfigBUS;
        }

        [HttpGet("DownloadSampleImage")]
        public async Task<IActionResult> DownloadSampleImage()
        {
            var (filePath, contentType) = await _systemConfigBUS.GetSampleImagePhysicalPathAsync();

            if (string.IsNullOrEmpty(filePath))
            {
                return NotFound("Image configuration key not found or has no value.");
            }

            if (!System.IO.File.Exists(filePath))
            {
                return NotFound($"File not found at path: {filePath}");
            }

            var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
            var fileName = Path.GetFileName(filePath);
            
            return File(fileBytes, contentType, fileName);
        }
    }
}
