using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using System.Threading.Tasks;

namespace LightInsightBUS.Interfaces.General
{
    public interface IAuditLog
    {
        Task<BaseResultModel> GetAuditLogs(AuditLogPagingRequest req);
    }
}
