using System;
using System.Collections.Generic;

namespace LightInsightModel.General
{
    public class CameraStatus
    {
        public string CameraId { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
        public int DeviceType { get; set; } // 1: Camera, 2: Microphone, 3: Speaker
        public bool IsOnline { get; set; }
        public int FailCount { get; set; }
        public DateTime LastChecked { get; set; }
    }

    public class DeviceStatusGroup
    {
        public int Type { get; set; }
        public string TypeName { get; set; } = string.Empty;
        public int Total { get; set; }
        public int Online { get; set; }
        public int Offline { get; set; }
        public List<CameraStatus> Details { get; set; } = new();
    }

    public class CameraStatusSummary
    {
        public int GlobalTotal { get; set; }
        public int GlobalOnline { get; set; }
        public int GlobalOffline { get; set; }
        
        // Cung cấp thêm mảng phẳng để tương thích với các logic cũ và Worker
        public List<CameraStatus> Details { get; set; } = new();
        
        // Danh sách các nhóm đã được phân loại
        public List<DeviceStatusGroup> Groups { get; set; } = new();
    }
}
