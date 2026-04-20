using LightInsightBUS.MapTiles;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using System.Threading;
using System.Threading.Tasks;

namespace LightInsightService.Controllers.General
{
    [ApiController]
    [EnableCors("_myAllowSpecificOrigins")]
    [Route("maptiles")]
    public sealed class MapTilesController : ControllerBase
    {
        private readonly MapTileRepository _repository;

        public MapTilesController(MapTileRepository repository)
        {
            _repository = repository;
        }

        [HttpGet("{z:int}/{x:int}/{y:int}.pbf")]
        public async Task<IActionResult> GetTile(int z, int x, int y, CancellationToken cancellationToken)
        {
            var tile = await _repository.GetTileAsync(z, x, y, cancellationToken);
            if (tile is null)
            {
                return NotFound();
            }

            var isGzip = tile.Length > 2 && tile[0] == 0x1F && tile[1] == 0x8B;
            Response.Headers["Content-Encoding"] = isGzip ? "gzip" : "identity";
            Response.Headers["Cache-Control"] = "public, max-age=3600";
            Response.Headers["Vary"] = "Accept-Encoding";
            return File(tile, "application/x-protobuf", enableRangeProcessing: true);
        }
    }
}
