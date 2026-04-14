using System;
using System.Collections.Generic;

namespace LightInsightAgent.Models
{
    public class HardwareMetrics
    {
        public string? ServerId { get; set; }
        public string? ServerName { get; set; }
        public double CpuUsage { get; set; }
        public double RamUsage { get; set; } // Match Backend: RamUsage
        public List<DiskMetric> Disks { get; set; } = new List<DiskMetric>();
        public DateTime LastUpdate { get; set; } // Match Backend: LastUpdate
    }

    public class DiskMetric
    {
        public string? DriveName { get; set; }
        public double UsagePercentage { get; set; }
        public long TotalSizeGb { get; set; } // Match Backend: TotalSizeGb
        public long FreeSpaceGb { get; set; } // Match Backend: FreeSpaceGb
    }
}
