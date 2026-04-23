using LightInsightBUS.Interfaces.General;
using LightInsightDAL.Repositories.General;
using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using Npgsql;
using System;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.General
{
    public class IncidentBUS : IIncident
    {
        private readonly IncidentDAL _dal;

        public IncidentBUS()
        {
            _dal = new IncidentDAL();
        }

        public async Task<BaseResultModel> GetPagedAsync(IncidentPagingRequest request)
        {
            var result = new BaseResultModel();
            try
            {
                request ??= new IncidentPagingRequest();
                if (request.Page < 1) request.Page = 1;
                if (request.PageSize < 1) request.PageSize = 10;

                var keyword = request.Keyword ?? string.Empty;
                var status = request.Status ?? string.Empty;
                var offset = (request.Page - 1) * request.PageSize;

                var (items, total) = await _dal.GetPagedAsync(keyword, status, request.PageSize, offset);

                result.Status = 1;
                result.Message = "Lấy danh sách incident thành công.";
                result.Data = items;
                result.TotalRow = (int)total;
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = "Lỗi khi lấy danh sách incident: " + ex.Message;
            }

            return result;
        }

        public async Task<BaseResultModel> GetByIdAsync(Guid id)
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

                var detail = await _dal.GetByIdAsync(id);
                if (detail == null)
                {
                    result.Status = 0;
                    result.Message = "Không tìm thấy incident.";
                    return result;
                }

                result.Status = 1;
                result.Message = "Lấy chi tiết incident thành công.";
                result.Data = detail;
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = "Lỗi khi lấy chi tiết incident: " + ex.Message;
            }

            return result;
        }

        public async Task<BaseResultModel> CreateAsync(IncidentCreateModel model)
        {
            var result = new BaseResultModel();
            try
            {
                var validateMsg = ValidateIncident(model?.SourceId);
                if (model == null || validateMsg != null)
                {
                    result.Status = 0;
                    result.Message = validateMsg ?? "Dữ liệu không hợp lệ.";
                    return result;
                }

                model.Priority = NormalizePriority(model.Priority);
                model.Status = NormalizeStatus(model.Status);

                var newId = await _dal.CreateAsync(model);
                if (newId.HasValue && newId.Value != Guid.Empty)
                {
                    result.Status = 1;
                    result.Message = "Thêm incident thành công.";
                    result.Data = newId.Value;
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Thêm incident thất bại.";
                }
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = "Lỗi khi thêm incident: " + ex.Message;
            }

            return result;
        }

        public async Task<BaseResultModel> UpdateAsync(IncidentUpdateModel model)
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

                var validateMsg = ValidateIncident(model.SourceId);
                if (validateMsg != null)
                {
                    result.Status = 0;
                    result.Message = validateMsg;
                    return result;
                }

                model.Priority = NormalizePriority(model.Priority);
                model.Status = NormalizeStatus(model.Status);

                var ok = await _dal.UpdateAsync(model);
                if (ok)
                {
                    result.Status = 1;
                    result.Message = "Cập nhật incident thành công.";
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Không tìm thấy incident để cập nhật.";
                }
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = "Lỗi khi cập nhật incident: " + ex.Message;
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
                    result.Message = "Xóa incident thành công.";
                }
                else
                {
                    result.Status = 0;
                    result.Message = "Không tìm thấy incident để xóa.";
                }
            }
            catch (PostgresException pgEx) when (pgEx.SqlState == "42883")
            {
                result.Status = -1;
                result.Message = "Thiếu function public.incident_delete trong database.";
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = "Lỗi khi xóa incident: " + ex.Message;
            }

            return result;
        }

        private static string? ValidateIncident(string? sourceId)
        {
            if (string.IsNullOrWhiteSpace(sourceId))
                return "SourceId không được để trống.";

            return null;
        }

        private static string NormalizePriority(string? priority)
            => string.IsNullOrWhiteSpace(priority) ? "LOW" : priority.Trim().ToUpperInvariant();

        private static string NormalizeStatus(string? status)
            => string.IsNullOrWhiteSpace(status) ? "NEW" : status.Trim().ToUpperInvariant();
    }
}
