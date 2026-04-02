using LightInsightBUS.Interfaces.General;
using LightInsightDAL.Repositories.General;
using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.General
{
    public class DMMapBUS : IDMMap
    {
        private readonly DMMapDAL _dmMapDAL;

        public DMMapBUS()
        {
            _dmMapDAL = new DMMapDAL();
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
    }
}
