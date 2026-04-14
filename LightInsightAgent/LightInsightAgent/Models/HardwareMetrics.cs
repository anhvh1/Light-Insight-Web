using System;
using System.Collections.Generic;

namespace LightInsightAgent.Models
{
    public class HardwareMetrics
    {
        public string? ServerId { get; set; } // The ID or IP of the machine sending the report
        public double CpuUsage { get; set; }
        public long TotalRam { get; set; }
        public long AvailableRam { get; set; }
        public double RamUsagePercentage { get; set; }
        public List<DiskMetric> Disks { get; set; } = new List<DiskMetric>();
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class DiskMetric
    {
        public string? DriveName { get; set; }
        public string? VolumeLabel { get; set; }
        public long TotalSize { get; set; }
        public long FreeSpace { get; set; }
        public double UsagePercentage { get; set; }
    }
}
