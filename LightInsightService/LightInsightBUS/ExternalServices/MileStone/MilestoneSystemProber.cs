using LightInsightBUS.ExternalServices.MileStone;
using LightInsightModel.General;
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace LightInsightBUS.ExternalServices.MileStone
{
    public class MilestoneSystemProber
    {
        private static PerformanceCounter _cpuCounter;

        public MilestoneSystemProber(GetAnalyticsEvents tokenService)
        {
            // Chúng ta chỉ giữ lại logic đo CPU ở đây
            try {
                if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                {
                    _cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                    _cpuCounter.NextValue(); 
                }
            } catch (Exception ex) {
                Console.WriteLine("[SystemHealth] CPU Counter Init Error: " + ex.Message);
            }
        }

        public int GetCurrentCpuUsage()
        {
            try {
                if (_cpuCounter != null) return (int)_cpuCounter.NextValue();
            } catch { }
            return 0;
        }

        // Hàm này giờ trả về danh sách rỗng vì chúng ta không dùng API Milestone cho hạ tầng nữa
        public async Task<List<InfrastructureHealth>> GetInfrastructureStatusAsync()
        {
            return new List<InfrastructureHealth>();
        }
    }
}
