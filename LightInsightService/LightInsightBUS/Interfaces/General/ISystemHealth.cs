using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using System.Threading.Tasks;

namespace LightInsightBUS.Interfaces.General
{
    public interface ISystemHealth
    {
        Task<BaseResultModel> GetSystemHealth();
        Task<BaseResultModel> ReportMetrics(MilestoneServerMetric report);
    }
}
