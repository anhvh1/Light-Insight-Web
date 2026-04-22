using LightInsightBUS.ExternalServices.MileStone;
using LightInsightBUS.Interfaces.General;
using LightInsightDAL.Repositories.General;
using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.General
{
    public class DMMapBUS : IDMMap
    {
        private readonly DMMapDAL _dmMapDAL;
        private readonly IMemoryCache _cache;
        private readonly GetAnalyticsEvents _getAnalyticsEvents;
        private readonly Microsoft.AspNetCore.Hosting.IWebHostEnvironment _env;

        public DMMapBUS(IMemoryCache cache, Microsoft.AspNetCore.Hosting.IWebHostEnvironment env)
        {
            _dmMapDAL = new DMMapDAL();
            _getAnalyticsEvents = new GetAnalyticsEvents(cache);
            _cache = cache;
            _env = env;
        }

        public async Task<BaseResultModel> SaveMarkersAsync(DMMapSaveMarkersModel model)
        {
            var result = new BaseResultModel();
            try
            {
                if (model == null)
                {
                    result.Status = 0;
                    result.Message = "Dữ liệu không hợp lệ.";
                    return result;
                }

                // Serialize list markers sang JSON string để truyền vào PostgreSQL
                var markersJson = JsonSerializer.Serialize(model.Markers, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower // Để khớp với logic item->>'camera_id' nếu cần, hoặc mặc định tùy DB
                });

                // Tuy nhiên, logic trong SQL của bạn đang dùng: item->>'camera_id'
                // Nên ta cần đảm bảo JSON property name khớp.
                // Nếu FE gửi camera_id thì serialize mặc định sẽ là CameraId.
                // Tôi sẽ tạo một custom anonymous object để đảm bảo key khớp 100% với SQL.
                var dbMarkers = model.Markers.Select(m => new
                {
                    camera_id = m.CameraId,
                    camera_name = m.CameraName,
                    pos_x = m.PosX,
                    pos_y = m.PosY,
                    icon = m.Icon,
                    vms_id = m.VmsId,
                    rotation = m.Rotation,
                    type = m.Type,
                    connectorid = m.Connectorid,
                    ip = m.IP,
                    latitude = m.Latitude,
                    longitude = m.Longitude,
                    iconscale = m.IconScale,
                    range = m.Range,
                    angledegrees = m.AngleDegrees,
                    fovdegrees = m.FovDegrees
                }).ToList();

                var jsonString = JsonSerializer.Serialize(dbMarkers);

                var success = await _dmMapDAL.ReplaceMarkersAsync(model.MapId, jsonString);
                if (success)
                {
                    result.Status = 1;
                    result.Message = "Lưu vị trí camera thành công.";
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Lưu vị trí camera thất bại.";
                }
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> GetMarkersByMapIdAsync(Guid mapId)
        {
            var result = new BaseResultModel();
            try
            {
                var markers = await _dmMapDAL.GetMarkersByMapIdAsync(mapId);
                result.Status = 1;
                result.Message = "Lấy danh sách vị trí camera thành công.";
                result.Data = markers;
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> GetAllMapsTreeAsync(string baseUrl = null)
        {
            var result = new BaseResultModel();
            try
            {
                var allItems = await _dmMapDAL.GetAllMapsAsync();

                // Chuyển đổi sang TreeModel
                var treeNodes = allItems.Select(item => new DMMapTreeModel
                {
                    Id = item.Id,
                    Name = item.Name,
                    Code = item.Code,
                    ParentId = item.ParentId,
                    Type = item.Type,
                    GeoCenterLatitude = item.GeoCenterLatitude,
                    GeoCenterLongitude = item.GeoCenterLongitude,
                    GeoZoom = item.GeoZoom,
                    MapImagePath = string.IsNullOrEmpty(item.MapImagePath) ? null : (baseUrl + item.MapImagePath),
                    CreatedAt = item.CreatedAt
                }).ToList();

                //var tree = BuildTree(treeNodes);

                result.Status = 1;
                result.Message = "Lấy danh sách bản đồ thành công.";
                result.Data = treeNodes;
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> AddMapAsync(DMMapModel model)
        {
            var result = new BaseResultModel();
            try
            {
                var newId = await _dmMapDAL.AddMapAsync(model);
                if (newId != null)
                {
                    result.Status = 1;
                    result.Message = "Thêm bản đồ thành công.";
                    result.Data = newId;
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Thêm bản đồ thất bại.";
                }
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> UpdateMapAsync(DMMapModel model)
        {
            var result = new BaseResultModel();
            try
            {
                var success = await _dmMapDAL.UpdateMapAsync(model);
                if (success)
                {
                    result.Status = 1;
                    result.Message = "Cập nhật bản đồ thành công.";
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Cập nhật bản đồ thất bại.";
                }
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> DeleteMapAsync(Guid id)
        {
            var result = new BaseResultModel();
            try
            {
                var success = await _dmMapDAL.DeleteMapAsync(id);
                if (success)
                {
                    result.Status = 1;
                    result.Message = "Xóa bản đồ thành công.";
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Xóa bản đồ thất bại.";
                }
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> GetMapByIdAsync(Guid id, string baseUrl = null)
        {
            var result = new BaseResultModel();
            try
            {
                var map = await _dmMapDAL.GetMapByIdAsync(id);
                if (map != null)
                {
                    if (!string.IsNullOrEmpty(map.MapImagePath))
                    {
                        map.MapImagePath = baseUrl + map.MapImagePath;
                    }

                    var cameras = map.Markers;
                    map.Markers = null; // Để tránh lặp lại dữ liệu trong JSON trả về

                    result.Status = 1;
                    result.Message = "Lấy thông tin bản đồ thành công.";
                    result.Data = new
                    {
                        map = map,
                        cameras = cameras
                    };
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Không tìm thấy bản đồ.";
                }
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> UpdateMapViewAsync(Guid id, double lat, double lng, double zoom)
        {
            var result = new BaseResultModel();
            try
            {
                if (zoom < 0 || zoom > 24)
                {
                    result.Status = 0;
                    result.Message = "GeoZoom must be between 0 and 24.";
                    return result;
                }

                var success = await _dmMapDAL.UpdateMapViewAsync(id, lat, lng, zoom);
                if (success)
                {
                    result.Status = 1;
                    result.Message = "Cập nhật view thành công.";
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Cập nhật view thất bại.";
                }
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> UploadMapImageAsync(Guid id, Stream fileStream, string fileName, string baseUrl = null)
        {
            var result = new BaseResultModel();

            try
            {
                // 📌 Lấy path chuẩn (root project)
                string rootPath = Directory.GetCurrentDirectory();
                string uploadDir = Path.Combine(rootPath, "Upload", "Map");

                // 📌 Tạo folder nếu chưa có
                if (!Directory.Exists(uploadDir))
                {
                    Directory.CreateDirectory(uploadDir);
                }

                // 📌 Tạo tên file unique
                string extension = Path.GetExtension(fileName);
                string uniqueFileName = $"{Guid.NewGuid()}{extension}";
                string filePath = Path.Combine(uploadDir, uniqueFileName);

                // 📌 Lưu file xuống disk
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await fileStream.CopyToAsync(stream);
                }

                // 📌 Path lưu DB
                string dbPath = $"/Upload/Map/{uniqueFileName}";

                // 📌 Update DB
                var success = await _dmMapDAL.UpdateMapImageAsync(id, dbPath);

                if (success)
                {
                    result.Status = 1;
                    result.Message = "Upload thành công";

                    // 📌 Trả URL đầy đủ cho FE
                    if (!string.IsNullOrEmpty(baseUrl))
                    {
                        result.Data = $"{baseUrl}{dbPath}";
                    }
                    else
                    {
                        result.Data = dbPath;
                    }
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Upload thành công nhưng update DB thất bại";
                }
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }

            return result;
        }

        private List<DMMapTreeModel> BuildTree(List<DMMapTreeModel> nodes)
        {
            var map = nodes.ToDictionary(n => n.Id);
            var rootNodes = new List<DMMapTreeModel>();

            foreach (var node in nodes)
            {
                if (node.ParentId == null || !map.ContainsKey(node.ParentId.Value))
                {
                    rootNodes.Add(node);
                }
                else
                {
                    map[node.ParentId.Value].Children.Add(node);
                }
            }

            return rootNodes;
        }
        public async Task<BaseResultModel> GetAllDevicesAsync(Guid key)
        {
            var result = new BaseResultModel();
            try
            {
                var allDevices = await _getAnalyticsEvents.GetAllDevicesAsync(key);

                result.Status = 1;
                result.Message = "Lấy danh sách thiết bị thành công.";
                result.Data = allDevices;
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> DeleteMapImageAsync(Guid id)
        {
            var result = new BaseResultModel();
            try
            {
                var allMaps = await _dmMapDAL.GetAllMapsAsync();
                var map = allMaps.FirstOrDefault(m => m.Id == id);

                if (map == null)
                {
                    result.Status = 0;
                    result.Message = "Không tìm thấy bản đồ.";
                    return result;
                }

                if (string.IsNullOrEmpty(map.MapImagePath))
                {
                    result.Status = 1;
                    result.Message = "Bản đồ không có ảnh để xóa.";
                    return result;
                }

                try
                {
                    // Sử dụng WebRootPath
                    var relativePath = map.MapImagePath.TrimStart('/');
                    var filePath = System.IO.Path.Combine(_env.WebRootPath, relativePath);

                    if (System.IO.File.Exists(filePath))
                    {
                        System.IO.File.Delete(filePath);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Lỗi khi xóa file ảnh vật lý: {ex.Message}");
                }

                var success = await _dmMapDAL.UpdateMapImageAsync(id, null);

                if (success)
                {
                    result.Status = 1;
                    result.Message = "Xóa ảnh bản đồ thành công.";
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Xóa ảnh thành công nhưng cập nhật CSDL thất bại.";
                }
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> StatisticMarkerByTypeAsync(Guid mapId)
        {
            var result = new BaseResultModel();
            try
            {
                var stats = await _dmMapDAL.StatisticMarkerByTypeAsync(mapId);
                result.Status = 1;
                result.Message = "Lấy dữ liệu thống kê marker thành công.";
                result.Data = stats;
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }
            return result;
        }
    }
}
