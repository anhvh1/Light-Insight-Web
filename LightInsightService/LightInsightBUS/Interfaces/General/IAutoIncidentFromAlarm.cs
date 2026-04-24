using System.Threading;
using System.Threading.Tasks;
using LightInsightModel.General;

namespace LightInsightBUS.Interfaces.General
{
    public interface IAutoIncidentFromAlarm
    {
        Task TryCreateFromAlarmAsync(MilestoneAlarmPayload payload, CancellationToken cancellationToken = default);
    }
}
