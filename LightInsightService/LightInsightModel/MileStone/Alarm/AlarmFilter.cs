using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightModel.MileStone.Alarm
{
    public class AlarmFilter
    {
        public string? priorityName { get; set; }     // Priority level
        public string? stateName { get; set; }        // State name (VD: "New", "In progress")
        //public string CategoryName { get; set; }     // Category name
        public string? message { get; set; }          // Message (VD: "CrosslineHuman", "Registered face detection")

        // --- Nhóm Textbox (Thường dùng contains hoặc equals) ---
        public string? source { get; set; }           // Source (hoặc CameraId)
        //public int? LocalId { get; set; }            // ID (Dùng LocalId như 58682 sẽ thân thiện với user hơn GUID)
        //public string? AssignedTo { get; set; }       // Owner
        //public string? Name { get; set; }             // Alarm (Tên sự kiện, VD: "Crossline")

        // --- Nhóm Checkbox & Datetime ---
        //public bool? ExcludeClosedAlarms { get; set; } // Loại trừ trạng thái "Closed"
        public DateTime? fromTime { get; set; }       // From
        public DateTime? toTime { get; set; }         // To
    }
}
