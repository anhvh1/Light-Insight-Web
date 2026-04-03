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
        public DMMapBUS(IMemoryCache cache)
        {
            _dmMapDAL = new DMMapDAL();
            _getAnalyticsEvents = new GetAnalyticsEvents(cache);
            _cache = cache;
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
                    icon = m.Icon
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
                    MapImagePath = string.IsNullOrEmpty(item.MapImagePath) ? null : (baseUrl + item.MapImagePath),
                    CreatedAt = item.CreatedAt
                }).ToList();

                var tree = BuildTree(treeNodes);

                result.Status = 1;
                result.Message = "Lấy danh sách bản đồ thành công.";
                result.Data = tree;
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

        public async Task<BaseResultModel> UploadMapImageAsync(Guid id, System.IO.Stream fileStream, string fileName, string baseUrl = null)
        {
            var result = new BaseResultModel();
            try
            {
                // 1. Tạo thư mục nếu chưa tồn tại
                string uploadDir = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Upload", "Map");
                if (!System.IO.Directory.Exists(uploadDir))
                {
                    System.IO.Directory.CreateDirectory(uploadDir);
                }

                // 2. Tạo tên file duy nhất để tránh trùng
                string extension = System.IO.Path.GetExtension(fileName);
                string uniqueFileName = $"{Guid.NewGuid()}{extension}";
                string filePath = System.IO.Path.Combine(uploadDir, uniqueFileName);

                // 3. Lưu file xuống server
                using (var stream = new System.IO.FileStream(filePath, System.IO.FileMode.Create))
                {
                    await fileStream.CopyToAsync(stream);
                }

                // 4. Lưu đường dẫn vào CSDL (Đường dẫn tương đối để FE dễ truy cập)
                string dbPath = $"/Upload/Map/{uniqueFileName}";
                var success = await _dmMapDAL.UpdateMapImageAsync(id, dbPath);

                if (success)
                {
                    result.Status = 1;
                    result.Message = "Tải ảnh lên và cập nhật thành công.";
                    result.Data = baseUrl + dbPath;
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Tải ảnh thành công nhưng cập nhật CSDL thất bại.";
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
        public async Task<BaseResultModel> GetCamerasAsync(int id)
        {
            var result = new BaseResultModel();

            try
            {
                if (id == 1)
                {
                    var cameras = await _getAnalyticsEvents.GetCamerasAsync();
                    result.Data = cameras;
                }
                else
                {
                    result.Data = new List<CameraItem>();
                }
                result.Status = 1;
                result.Message = "Lấy danh sách camera thành công.";
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
