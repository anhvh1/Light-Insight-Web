using LightInsightBUS.Interfaces.General;
using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace LightInsightService.Controllers.General
{
    [Route("api/[controller]")]
    [ApiController]
    public class DMMapController : ControllerBase
    {
        private readonly IDMMap _dmMapBUS;

        public DMMapController(IDMMap dmMapBUS)
        {
            _dmMapBUS = dmMapBUS;
        }

        [HttpGet("GetAllTree")]
        public async Task<IActionResult> GetAllTree()
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _dmMapBUS.GetAllMapsTreeAsync(baseUrl);
            return Ok(result);
        }

        [HttpGet("GetById/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _dmMapBUS.GetMapByIdAsync(id, baseUrl);
            return Ok(result);
        }

        [HttpPut("{id}/view")]
        public async Task<IActionResult> UpdateView(Guid id, [FromBody] MapViewRequest request)
        {
            var result = await _dmMapBUS.UpdateMapViewAsync(id, request.GeoCenterLatitude, request.GeoCenterLongitude, request.GeoZoom);
            return Ok(result);
        }

        [HttpPost("Add")]
        public async Task<IActionResult> Add(DMMapModel model)
        {
            var result = await _dmMapBUS.AddMapAsync(model);
            return Ok(result);
        }

        [HttpPut("Update")]
        public async Task<IActionResult> Update(DMMapModel model)
        {
            var result = await _dmMapBUS.UpdateMapAsync(model);
            return Ok(result);
        }

        [HttpDelete("Delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _dmMapBUS.DeleteMapAsync(id);
            return Ok(result);
        }

        [HttpDelete("DeleteImage/{id}")]
        public async Task<IActionResult> DeleteImage(Guid id)
        {
            var result = await _dmMapBUS.DeleteMapImageAsync(id);
            return Ok(result);
        }

        [HttpPost("UploadImage/{id}")]
        public async Task<IActionResult> UploadImage(Guid id, Microsoft.AspNetCore.Http.IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("Không có file nào được chọn.");
            }

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            using (var stream = file.OpenReadStream())
            {
                var result = await _dmMapBUS.UploadMapImageAsync(id, stream, file.FileName, baseUrl);
                return Ok(result);
            }
        }

        [HttpPost("SaveMarkers")]
        public async Task<IActionResult> SaveMarkers(DMMapSaveMarkersModel model)
        {
            var result = await _dmMapBUS.SaveMarkersAsync(model);
            return Ok(result);
        }

        [HttpGet("GetMarkers/{mapId}")]
        public async Task<IActionResult> GetMarkers(Guid mapId)
        {
            var result = await _dmMapBUS.GetMarkersByMapIdAsync(mapId);
            return Ok(result);
        }

        [HttpGet("GetConnectorIdByCameraId")]
        public async Task<IActionResult> GetConnectorIdByCameraId(string cameraId)
        {
            var result = await _dmMapBUS.GetConnectorIdByCameraIdAsync(cameraId);
            return Ok(result);
        }

        [HttpGet("GetAllDevicesAsync")]
        public async Task<IActionResult> GetAllDevicesAsync([FromQuery] Guid key)
        {
            var result = await _dmMapBUS.GetAllDevicesAsync(key);
            return Ok(result);
        }

        [HttpGet("Statistic/{mapId}")]
        public async Task<IActionResult> StatisticMarkerByType(Guid mapId)
        {
            var result = await _dmMapBUS.StatisticMarkerByTypeAsync(mapId);
            return Ok(result);
        }

        [HttpGet("GetMapOptions")]
        public IActionResult GetOptions()
        {
            var result = new BaseResultModel
            {
                Data = new
                {
                    geoStyleUrl = "/mapstyles/vietnam-omt-style.json",
                    routingEnabled = true
                },
                Message = "thành công",
                Status = 1
            };
            return Ok(result);
        }
    }

    public class MapViewRequest
    {
        public double GeoCenterLatitude { get; set; }
        public double GeoCenterLongitude { get; set; }
        public double GeoZoom { get; set; }
    }
}
