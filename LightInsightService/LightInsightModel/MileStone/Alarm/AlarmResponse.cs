using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightModel.MileStone.Alarm
{
    public class AlarmResponse
    {
        public List<MilestoneAlarmItem> array { get; set; }
    }

    public class MilestoneAlarmMessageResponse
    {
        public List<string> array { get; set; }
    }

    public class MilestoneAlarmItem
    {
        public string id { get; set; }
        public string name { get; set; }
        public string message { get; set; }
        public DateTime time { get; set; } // Tự động parse chuỗi ISO 8601
        public AlarmPriority priority { get; set; }
        public AlarmState state { get; set; }
        public string legacyType { get; set; }
        public string cameraId { get; set; }
    }

    public class AlarmPriority
    {
        public int level { get; set; }
        public string name { get; set; }
    }

    public class AlarmState
    {
        public int level { get; set; }
        public string name { get; set; }
    }

    public class MilestoneCameraResponse
    {
        public CameraData data { get; set; }
    }

    public class CameraData
    {
        public string name { get; set; }
    }

    // --- CLASS DỮ LIỆU CHUẨN TRẢ VỀ CHO FRONTEND ---
    public class AlarmData
    {
        public string alarmId { get; set; }
        public string alarmName { get; set; }
        public string location { get; set; }
        public string message { get; set; }
        public int priorityLevel { get; set; }
        public string priorityName { get; set; }
        public string source { get; set; }
        public int stateLevel { get; set; }
        public string stateName { get; set; }
        public string time { get; set; }
        public string type { get; set; }
        public string cameraid { get; set; }
        public string? connectorName { get; set; }
        public string? ipadress { get; set; }
    }
}
