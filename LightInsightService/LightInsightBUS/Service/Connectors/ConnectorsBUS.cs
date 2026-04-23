using LightInsightBUS.ExternalServices.MileStone;
using LightInsightBUS.Interfaces.Connectors;
using LightInsightDAL.Repositories.Connectors;
using LightInsightModel.Connectors;
using LightInsightModel.MileStone.General;
using Microsoft.Extensions.Caching.Memory;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.Connectors
{
    public class ConnectorsBUS : IConnectors
    {
        private readonly ConnectorsDAL _connectorsDAL;
        private readonly CheckServerBUS _checkServerBUS;
        private readonly GetAnalyticsEvents _getAnalyticsEvents;
        private readonly IMemoryCache _cache;


        public ConnectorsBUS(IMemoryCache cache)
        {
            _connectorsDAL = new ConnectorsDAL();
            _checkServerBUS = new CheckServerBUS();
            _getAnalyticsEvents = new GetAnalyticsEvents(cache);
            _cache = cache;
        }

        public async Task<BaseResultModel> LoadAllConnectorsToCacheAsync()
        {
            var result = new BaseResultModel();
            try
            {
                var connectors = await _connectorsDAL.GetAllConnectorsAsync();
                var cacheEntryOptions = new MemoryCacheEntryOptions()
                    .SetPriority(CacheItemPriority.NeverRemove);

                foreach (var item in connectors)
                {
                    string cacheKey = $"{item.Id}";
                    _cache.Set(cacheKey, item, cacheEntryOptions);
                    Console.WriteLine($"[CACHE] Loaded Key: {cacheKey} for Connector: {item.Name}");
                }

                result.Status = 1;
                result.Message = $"Đã nạp {connectors.Count} connectors vào Cache thành công.";
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
            }
            return result;
        }

        public async Task<BaseResultModel> AddConnectorAsync(ConnectorsModel model)
        {
            var result = new BaseResultModel();
            try
            {
                var ping = await _checkServerBUS.CheckTcpConnectionAsync(model.IpServer, model.Port);
                var token = await _getAnalyticsEvents.CheckTokenAsync(model.Username, model.Password, model.IpServer, model.Port);
                if (!ping)
                {
                    result.Status = 0;
                    result.Message = "Không thể kết nối đến server. Vui lòng kiểm tra lại thông tin kết nối.";
                    return result;
                }
                if (string.IsNullOrEmpty(token))
                {
                    result.Status = 0;
                    result.Message = "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.";
                    return result;
                }
                else
                {
                    model.Status = "Connected";
                }

                var newID = await _connectorsDAL.AddConnectorAsync(model.Name, model.IpServer, model.Port, model.Username, model.Password, model.VMSID, model.Status);

                if (newID != null)
                {
                    model.Id = (Guid)newID;
                    var cacheEntryOptions = new MemoryCacheEntryOptions()
                        .SetPriority(CacheItemPriority.NeverRemove);
                    _cache.Set($"{newID}", model, cacheEntryOptions);

                    result.Status = 1;
                    result.Message = "Thêm connector thành công.";
                    result.Data = newID;
                }
                else
                {
                    result.Status = -1;
                    result.Message = "Thêm connector thất bại do lỗi không xác định.";
                }
                return result;
            }
            catch (PostgresException ex)
            {
                // Handle specific database errors from the RAISE EXCEPTION calls
                result.Status = 0; // Use 0 for validation/business rule errors
                if (ex.Message.Contains("DUPLICATE_NAME"))
                {
                    result.Message = "Tên connector đã tồn tại. Vui lòng chọn tên khác.";
                }
                else if (ex.Message.Contains("DUPLICATE_IP"))
                {
                    result.Message = "Địa chỉ IP đã tồn tại. Vui lòng kiểm tra lại.";
                }
                else
                {
                    result.Status = -1; // System-level DB error
                    result.Message = "Lỗi cơ sở dữ liệu không xác định.";
                    Console.WriteLine($"PostgresException: {ex.Message}");
                }
                return result;
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
                return result;
            }
        }

        public async Task<BaseResultModel> UpdateConnectorAsync(ConnectorsModel model)
        {
            var result = new BaseResultModel();
            try
            {
                var ping = await _checkServerBUS.CheckTcpConnectionAsync(model.IpServer, model.Port);
                var token = await _getAnalyticsEvents.CheckTokenAsync(model.Username, model.Password, model.IpServer, model.Port);

                if (!ping)
                {
                    result.Status = 0;
                    result.Message = "Không thể kết nối đến server. Vui lòng kiểm tra lại thông tin kết nối.";
                    return result;
                }
                if (string.IsNullOrEmpty(token))
                {
                    result.Status = 0;
                    result.Message = "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.";
                    return result;
                }
                else
                {
                    model.Status = "Connected";
                }

                var success = await _connectorsDAL.UpdateConnectorAsync(model.Id, model.Name, model.IpServer, model.Port, model.Username, model.Password, model.VMSID, model.Status);
                if (success)
                {
                    // Cập nhật Cache sau khi cập nhật thành công - Dùng Key đồng nhất VMS_{id}
                    var cacheEntryOptions = new MemoryCacheEntryOptions()
                        .SetPriority(CacheItemPriority.NeverRemove);
                    _cache.Set($"{model.Id}", model, cacheEntryOptions);

                    result.Status = 1;
                    result.Message = "Cập nhật connector thành công.";
                }
                else
                {
                    result.Status = -1;
                    result.Message = "Cập nhật connector thất bại. Không tìm thấy ID để cập nhật.";
                }
                return result;
            }
            catch (PostgresException ex)
            {
                result.Status = 0; // Validation/Business rule error
                if (ex.Message.Contains("DUPLICATE_NAME"))
                {
                    result.Message = "Tên connector đã tồn tại. Vui lòng chọn tên khác.";
                }
                else if (ex.Message.Contains("DUPLICATE_IP"))
                {
                    result.Message = "Địa chỉ IP đã tồn tại. Vui lòng kiểm tra lại.";
                }
                else
                {
                    result.Status = -1; // System-level DB error
                    result.Message = "Lỗi cơ sở dữ liệu không xác định khi cập nhật.";
                    Console.WriteLine($"PostgresException: {ex.Message}");
                }
                return result;
            }
            catch (Exception ex)
            {
                result.Status = -1;
                result.Message = ex.Message;
                return result;
            }
        }

        public async Task<BaseResultModel> DeleteConnectorAsync(Guid id)
        {
            try
            {
                var result = new BaseResultModel();

                // Cần biết VmsID để xóa cache trước khi xóa trong DB
                var connectors = await _connectorsDAL.GetAllConnectorsAsync();
                var itemToDelete = connectors.FirstOrDefault(x => x.Id == id);

                var success = await _connectorsDAL.DeleteConnectorAsync(id);

                if (success)
                {
                    // Xóa Cache nếu thành công - Dùng Key đồng nhất VMS_{id}
                    if (itemToDelete != null)
                    {
                        _cache.Remove($"VMS_{itemToDelete.VmsID}");
                    }

                    result.Status = 1;
                    result.Message = "Xóa connector thành công.";
                }
                else
                {
                    result.Status = -1;
                    result.Message = "Xóa connector thất bại. Không tìm thấy connector hoặc có lỗi xảy ra.";
                }

                return result;
            }
            catch (Exception ex)
            {
                var result = new BaseResultModel();
                result.Status = -1;
                result.Message = ex.Message;
                return result;
            }
        }

        public async Task<BaseResultModel> GetAllConnectorsAsync()
        {
            try
            {
                var result = new BaseResultModel();
                var data = await _connectorsDAL.GetAllConnectorsAsync();

                result.Status = 1;
                result.Message = "Lấy danh sách connectors thành công.";
                result.Data = data;

                return result;
            }
            catch (Exception ex)
            {
                var result = new BaseResultModel();
                result.Status = -1;
                result.Message = ex.Message;
                return result;
            }
        }

        public async Task<BaseResultModel> GetAllVMSAsync()
        {
            try
            {
                var result = new BaseResultModel();
                var data = await _connectorsDAL.GetAllVMSAsync();

                result.Status = 1;
                result.Message = "Lấy danh sách VMS thành công.";
                result.Data = data;

                return result;
            }
            catch (Exception ex)
            {
                var result = new BaseResultModel();
                result.Status = -1;
                result.Message = ex.Message;
                return result;
            }
        }
    }
}
