using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using LightInsightAgent.Models;

namespace LightInsightAgent.Services
{
    public class WindowsMetricsService : IMetricsService
    {
        private readonly PerformanceCounter? _cpuCounter;
        private readonly PerformanceCounter? _ramCounter;

        public WindowsMetricsService()
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                try {
                    _cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                    _ramCounter = new PerformanceCounter("Memory", "Available MBytes");
                    
                    // First call usually returns 0
                    _cpuCounter.NextValue();
                } catch {
                    // Log or handle counter not available
                }
            }
        }

        public async Task<HardwareMetrics> GetCurrentMetricsAsync()
        {
            var metrics = new HardwareMetrics();

            if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows) || _cpuCounter == null || _ramCounter == null)
            {
                return metrics; // Return empty metrics if not on Windows or counters failed
            }

            try
            {
                metrics.CpuUsage = Math.Round(_cpuCounter.NextValue(), 2);
                
                // Get RAM
                float availableMb = _ramCounter.NextValue();
                metrics.FreeRamGb = Math.Round(availableMb / 1024.0, 2);
                
                MEMORYSTATUSEX memStatus = new MEMORYSTATUSEX();
                if (GlobalMemoryStatusEx(memStatus))
                {
                    double totalRamMb = memStatus.ullTotalPhys / (1024.0 * 1024.0);
                    metrics.TotalRamGb = Math.Round(totalRamMb / 1024.0, 2);
                    metrics.RamUsage = Math.Round(100.0 * (totalRamMb - availableMb) / totalRamMb, 2);
                }

                metrics.LastUpdate = DateTime.Now;

                // Get Disks
                foreach (var drive in DriveInfo.GetDrives())
                {
                    if (drive.IsReady && (drive.DriveType == DriveType.Fixed || drive.DriveType == DriveType.Network))
                    {
                        var disk = new DiskMetric
                        {
                            DriveName = drive.Name,
                            TotalSizeGb = drive.TotalSize / (1024 * 1024 * 1024), // GB
                            FreeSpaceGb = drive.AvailableFreeSpace / (1024 * 1024 * 1024), // GB
                        };
                        
                        if (disk.TotalSizeGb > 0)
                        {
                            disk.UsagePercentage = Math.Round(100.0 * (disk.TotalSizeGb - disk.FreeSpaceGb) / disk.TotalSizeGb, 2);
                        }
                        
                        metrics.Disks.Add(disk);
                    }
                }
            }
            catch (Exception)
            {
                // Log error
            }

            return await Task.FromResult(metrics);
        }

        #region P/Invoke for Total RAM

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
        private class MEMORYSTATUSEX
        {
            public uint dwLength;
            public uint dwMemoryLoad;
            public ulong ullTotalPhys;
            public ulong ullAvailPhys;
            public ulong ullTotalPageFile;
            public ulong ullAvailPageFile;
            public ulong ullTotalVirtual;
            public ulong ullAvailVirtual;
            public ulong ullAvailExtendedVirtual;
            public MEMORYSTATUSEX()
            {
                this.dwLength = (uint)Marshal.SizeOf(typeof(MEMORYSTATUSEX));
            }
        }

        [return: MarshalAs(UnmanagedType.Bool)]
        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        static extern bool GlobalMemoryStatusEx([In, Out] MEMORYSTATUSEX lpBuffer);

        #endregion
    }
}
