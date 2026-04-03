using LightInsightBUS.ExternalServices.MileStone;
using LightInsightBUS.Interfaces.Connectors;
using LightInsightDAL.Repositories.Connectors;
using LightInsightModel.Connectors;
using LightInsightModel.MileStone.General;
using Microsoft.Extensions.Caching.Memory;
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
                foreach (var item in connectors)
                {
                    string cacheKey = $"VMS_{item.VmsID}";
                    _cache.Set(cacheKey, item);
                    Console.WriteLine($"[CACHE] Loaded Key: {cacheKey} for Connector: {item.VmsName}");
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
            try
            {

                var result = new BaseResultModel();
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
                    // Cập nhật Cache sau khi thêm thành công - Dùng Key đồng nhất VMS_{id}
                    model.Id = (Guid)newID;
                    _cache.Set($"VMS_{model.VMSID}", model);

                    result.Status = 1;
                    result.Message = "Thêm connector thành công.";
                    result.Data = newID;
                    return result;
                }
                else
                {
                    result.Status = -1;
                    result.Message = "Thêm connector thất bại. Vui lòng thử lại.";
                    return result;
                }

            }
            catch (Exception ex)
            {
                var result = new BaseResultModel();
                result.Status = -1;
                result.Message = ex.Message;
                return result;
            }

        }

        public async Task<BaseResultModel> UpdateConnectorAsync(ConnectorsModel model)
        {
            try
            {
                var result = new BaseResultModel();
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
                    _cache.Set($"VMS_{model.VMSID}", model);

                    result.Status = 1;
                    result.Message = "Cập nhật connector thành công.";
                    return result;
                }
                else
                {
                    result.Status = -1;
                    result.Message = "Cập nhật connector thất bại. Vui lòng thử lại.";
                    return result;
                }

            }
            catch (Exception ex)
            {
                var result = new BaseResultModel();
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
