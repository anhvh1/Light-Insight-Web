using System;
using System.Collections.Generic;

namespace LightInsightAgent.Models
{
    public class HardwareMetrics
    {
        public string? ServerId { get; set; }
        public string? ServerName { get; set; }
        public double CpuUsage { get; set; }
        public double RamUsage { get; set; } 
        public double TotalRamGb { get; set; } // Added
        public double FreeRamGb { get; set; }  // Added
        public List<DiskMetric> Disks { get; set; } = new List<DiskMetric>();
        public DateTime LastUpdate { get; set; }
    }

    public class DiskMetric
    {
        public string? DriveName { get; set; }
        public double UsagePercentage { get; set; }
        public long TotalSizeGb { get; set; }
        public long FreeSpaceGb { get; set; }
    }
}
