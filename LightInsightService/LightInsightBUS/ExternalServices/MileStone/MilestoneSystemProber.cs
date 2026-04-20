using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace LightInsightBUS.ExternalServices.MileStone
{
    public class MilestoneSystemProber
    {
        private static PerformanceCounter _cpuCounter;

        public MilestoneSystemProber()
        {
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
    }
}
