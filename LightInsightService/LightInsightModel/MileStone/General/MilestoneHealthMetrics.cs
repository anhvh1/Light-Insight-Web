using System;
using System.Collections.Generic;

namespace LightInsightModel.MileStone.General
{
    public class MilestoneServerMetric
    {
        public string ServerId { get; set; }
        public string ServerName { get; set; }
        public double CpuUsage { get; set; }
        public double RamUsage { get; set; }
        public List<MilestoneDiskMetric> Disks { get; set; } = new List<MilestoneDiskMetric>();
        public DateTime LastUpdate { get; set; }
    }

    public class MilestoneDiskMetric
    {
        public string DriveName { get; set; }
        public double UsagePercentage { get; set; }
        public long TotalSizeGb { get; set; }
        public long FreeSpaceGb { get; set; }
    }

    public class MilestoneDeviceStatus
    {
        public string DeviceId { get; set; }
        public string DeviceName { get; set; }
        public string Status { get; set; } // ONLINE, OFFLINE
        public string Message { get; set; }
        public DateTime LastChanged { get; set; }
    }
}
