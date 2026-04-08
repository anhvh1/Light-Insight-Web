using System.Threading.Tasks;

namespace LightInsightBUS.Interfaces.General
{
    public interface ISystemConfig
    {
        Task<(string FilePath, string ContentType)> GetSampleImagePhysicalPathAsync();
    }
}
