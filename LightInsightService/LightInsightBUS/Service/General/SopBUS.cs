using LightInsightBUS.Interfaces.General;
using LightInsightDAL.Repositories.General;
using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.General
{
    public class SopBUS : ISop
    {
        private readonly SopDAL _dal;

        private static readonly JsonSerializerOptions _readOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        public SopBUS()
        {
            _dal = new SopDAL();
        }

        public async Task<BaseResultModel> GetPagedAsync(SopPagingRequest request)
        {
            var result = new BaseResultModel();
            try
            {
                request ??= new SopPagingRequest();
                if (request.Page < 1) request.Page = 1;
                if (request.PageSize < 1) request.PageSize = 10;

                var keyword = request.Keyword ?? string.Empty;
                var offset = (request.Page - 1) * request.PageSize;

                var (items, total) = await _dal.GetPagedAsync(keyword, request.PageSize, offset);

                result.Status = 1;
                result.Message = "Lấy danh sách SOP thành công.";
                result.Data = items;
                result.TotalRow = (int)total;
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = "Lỗi khi lấy danh sách SOP: " + ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> GetByIdAsync(Guid id)
        {
            var result = new BaseResultModel();
            try
            {
                var json = await _dal.GetByIdJsonAsync(id);
                if (string.IsNullOrWhiteSpace(json) || json == "null")
                {
                    result.Status = 0;
                    result.Message = "Không tìm thấy SOP.";
                    return result;
                }

                var detail = JsonSerializer.Deserialize<SopDetailModel>(json, _readOptions);
                result.Status = 1;
                result.Message = "Lấy chi tiết SOP thành công.";
                result.Data = detail;
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = "Lỗi khi lấy chi tiết SOP: " + ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> CreateAsync(SopCreateModel model)
        {
            var result = new BaseResultModel();
            try
            {
                var validateMsg = ValidateSop(model?.Name, model?.Steps);
                if (model == null || validateMsg != null)
                {
                    result.Status = 0;
                    result.Message = validateMsg ?? "Dữ liệu không hợp lệ.";
                    return result;
                }

                var newId = await _dal.CreateAsync(model);
                if (newId.HasValue && newId.Value != Guid.Empty)
                {
                    result.Status = 1;
                    result.Message = "Thêm SOP thành công.";
                    result.Data = newId.Value;
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Thêm SOP thất bại.";
                }
            }
            catch (PostgresException pgEx) when (IsDuplicateName(pgEx))
            {
                result.Status = 2;
                result.Message = "Tên SOP đã tồn tại.";
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = "Lỗi khi thêm SOP: " + ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> UpdateAsync(SopUpdateModel model)
        {
            var result = new BaseResultModel();
            try
            {
                if (model == null || model.Id == Guid.Empty)
                {
                    result.Status = 0;
                    result.Message = "Dữ liệu không hợp lệ.";
                    return result;
                }

                var validateMsg = ValidateSop(model.Name, model.Steps);
                if (validateMsg != null)
                {
                    result.Status = 0;
                    result.Message = validateMsg;
                    return result;
                }

                var ok = await _dal.UpdateAsync(model);
                if (ok)
                {
                    result.Status = 1;
                    result.Message = "Cập nhật SOP thành công.";
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Không tìm thấy SOP để cập nhật.";
                }
            }
            catch (PostgresException pgEx) when (IsDuplicateName(pgEx))
            {
                result.Status = 2;
                result.Message = "Tên SOP đã tồn tại.";
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = "Lỗi khi cập nhật SOP: " + ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> DeleteAsync(Guid id)
        {
            var result = new BaseResultModel();
            try
            {
                if (id == Guid.Empty)
                {
                    result.Status = 0;
                    result.Message = "Id không hợp lệ.";
                    return result;
                }

                var ok = await _dal.DeleteAsync(id);
                if (ok)
                {
                    result.Status = 1;
                    result.Message = "Xóa SOP thành công.";
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Không tìm thấy SOP để xóa.";
                }
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = "Lỗi khi xóa SOP: " + ex.Message;
            }
            return result;
        }

        private static string? ValidateSop(string? name, List<SopStepModel>? steps)
        {
            if (string.IsNullOrWhiteSpace(name))
                return "Tên SOP không được để trống.";

            if (steps != null && steps.Count > 0)
            {
                var duplicatedOrder = steps
                    .GroupBy(s => s.StepOrder)
                    .FirstOrDefault(g => g.Count() > 1);

                if (duplicatedOrder != null)
                    return $"step_order bị trùng: {duplicatedOrder.Key}.";
            }

            return null;
        }

        private static bool IsDuplicateName(PostgresException ex)
        {
            return (ex.MessageText != null && ex.MessageText.Contains("DUPLICATE_SOP_NAME"))
                || (ex.Message != null && ex.Message.Contains("DUPLICATE_SOP_NAME"));
        }
    }
}
