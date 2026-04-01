using LightInsightBUS.ExternalServices.MileStone;
using LightInsightBUS.Interfaces.Connectors;
using LightInsightDAL.Repositories.Connectors;
using LightInsightModel.Connectors;
using LightInsightModel.MileStone.General;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.Connectors
{
    public class ConnectorsBUS : IConnectors
    {
        private static ConnectorsDAL connectorsDAL;
        private static CheckServerBUS checkServerBUS;
        private static GetAnalyticsEvents getAnalyticsEvents;
        public ConnectorsBUS()
        {
            connectorsDAL = new ConnectorsDAL();
            checkServerBUS = new CheckServerBUS();
            getAnalyticsEvents = new GetAnalyticsEvents();
        }
        public async Task<BaseResultModel> AddConnectorAsync(ConnectorsModel model)
        {
            try
            {
                var result = new BaseResultModel();
                var ping = await checkServerBUS.CheckTcpConnectionAsync(model.IpServer, model.Port);
                var token = await getAnalyticsEvents.GetTokenAsync(model.Username, model.Password);
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
                var newID = await connectorsDAL.AddConnectorAsync(model.Name, model.IpServer, model.Port, model.Username, model.Password, model.VMSID, model.Status);
                if (newID != null)
                {
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

        public async Task<BaseResultModel> GetAllVMSAsync()
        {
            try
            {
                var result = new BaseResultModel();
                var data = await connectorsDAL.GetAllVMSAsync();

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
