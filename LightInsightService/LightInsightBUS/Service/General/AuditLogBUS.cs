using LightInsightBUS.Interfaces.General;
using LightInsightDAL.Repositories.General;
using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using System;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.General
{
    public class AuditLogBUS : IAuditLog
    {
        private readonly AuditLogDAL _dal;

        public AuditLogBUS()
        {
            _dal = new AuditLogDAL();
        }

        public async Task<BaseResultModel> GetAuditLogs(AuditLogPagingRequest req)
        {
            try
            {
                var (data, total) = await _dal.GetAuditLogs(req);
                return new BaseResultModel
                {
                    Status = 1,
                    Message = "Get audit logs successfully.",
                    Data = data,
                    TotalRow = total
                };
            }
            catch (Exception ex)
            {
                return new BaseResultModel
                {
                    Status = -1,
                    Message = "Error fetching audit logs: " + ex.Message
                };
            }
        }
    }
}
