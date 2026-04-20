using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Cors;

namespace LightInsightService.Controllers.General
{
    [ApiController]
    [EnableCors("_myAllowSpecificOrigins")]
    [Route("mapstyles")]
    public sealed class MapStylesController : ControllerBase
    {
        private readonly IWebHostEnvironment _environment;

        public MapStylesController(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        [HttpGet("{*fileName}")]
        public async Task<IActionResult> GetStyle(string fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName))
            {
                return BadRequest();
            }

            // Bảo mật: Không cho phép quay lui thư mục
            if (fileName.Contains("..") || fileName.Contains('\\'))
            {
                return BadRequest();
            }

            // Đường dẫn gốc: MapData/mapstyles
            var mapStylesPath = Path.Combine(_environment.ContentRootPath, "MapData", "mapstyles");
            var mapStylesRoot = Path.GetFullPath(mapStylesPath + Path.DirectorySeparatorChar);
            var fullPath = Path.GetFullPath(Path.Combine(mapStylesRoot, fileName));

            // Kiểm tra xem file có nằm trong thư mục mapstyles không
            if (!fullPath.StartsWith(mapStylesRoot, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest();
            }

            if (!System.IO.File.Exists(fullPath))
            {
                return NotFound();
            }

            var extension = Path.GetExtension(fileName).ToLowerInvariant();

            // Nếu là file JSON (style), thực hiện replace đường dẫn động
            if (extension == ".json")
            {
                var content = await System.IO.File.ReadAllTextAsync(fullPath);
                var baseUrl = $"{Request.Scheme}://{Request.Host.Value}";

                // Thay thế /maptiles/ -> baseUrl/maptiles/
                if (content.Contains("/maptiles/"))
                {
                    content = content.Replace("/maptiles/", $"{baseUrl}/maptiles/");
                }

                // Thay thế /mapstyles/ -> baseUrl/mapstyles/
                if (content.Contains("/mapstyles/"))
                {
                    content = content.Replace("/mapstyles/", $"{baseUrl}/mapstyles/");
                }

                return Content(content, "application/json");
            }

            // Xử lý Content-Type cho các loại file khác (sprite, fonts)
            var contentType = extension switch
            {
                ".png" => "image/png",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                ".json" => "application/json",
                ".pbf" => "application/x-protobuf",
                _ => "application/octet-stream"
            };

            if (extension == ".pbf")
            {
                return PhysicalFile(fullPath, "application/x-protobuf");
            }

            return PhysicalFile(fullPath, contentType);
        }
    }
}
