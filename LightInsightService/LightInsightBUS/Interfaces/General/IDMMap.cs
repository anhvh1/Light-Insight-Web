using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using System;
using System.Threading.Tasks;

namespace LightInsightBUS.Interfaces.General
{
    public interface IDMMap
    {
        Task<BaseResultModel> GetAllMapsTreeAsync(string baseUrl = null);
        Task<BaseResultModel> AddMapAsync(DMMapModel model);
        Task<BaseResultModel> UpdateMapAsync(DMMapModel model);
        Task<BaseResultModel> DeleteMapAsync(Guid id);
        Task<BaseResultModel> UploadMapImageAsync(Guid id, System.IO.Stream fileStream, string fileName, string baseUrl = null);
        Task<BaseResultModel> SaveMarkersAsync(DMMapSaveMarkersModel model);
        Task<BaseResultModel> GetMarkersByMapIdAsync(Guid mapId);
        Task<BaseResultModel> DeleteMapImageAsync(Guid id);
        Task<BaseResultModel> GetAllDevicesAsync(Guid key);
        Task<BaseResultModel> StatisticMarkerByTypeAsync(Guid mapId);
    }
}
