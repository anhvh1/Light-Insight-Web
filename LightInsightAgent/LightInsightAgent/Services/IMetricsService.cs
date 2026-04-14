using LightInsightAgent.Models;
using System.Threading.Tasks;

namespace LightInsightAgent.Services
{
    public interface IMetricsService
    {
        Task<HardwareMetrics> GetCurrentMetricsAsync();
    }
}
