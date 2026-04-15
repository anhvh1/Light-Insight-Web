using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace LightInsightModel.MileStone.General
{
    public class AlarmResponseModel
    {
        [JsonPropertyName("array")]
        public List<AlarmModel> Array { get; set; }
    }

    public class AlarmModel
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }

        [JsonPropertyName("localId")]
        public int LocalId { get; set; }

        [JsonPropertyName("source")]
        public string Source { get; set; }

        [JsonPropertyName("time")]
        public DateTime Time { get; set; }

        [JsonPropertyName("lastUpdatedTime")]
        public DateTime LastUpdatedTime { get; set; }

        [JsonPropertyName("assignedTo")]
        public object AssignedTo { get; set; } // Can be null

        [JsonPropertyName("name")]
        public string Name { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; }

        [JsonPropertyName("category")]
        public object Category { get; set; } // Can be null

        [JsonPropertyName("priority")]
        public PriorityModel Priority { get; set; }

        [JsonPropertyName("state")]
        public StateModel State { get; set; }

        [JsonPropertyName("data")]
        public AlarmDataModel Data { get; set; }

        [JsonPropertyName("tag")]
        public string Tag { get; set; }

        [JsonPropertyName("legacyType")]
        public string LegacyType { get; set; }

        [JsonPropertyName("cameraId")]
        public string CameraId { get; set; }
    }

    public class PriorityModel
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }

        [JsonPropertyName("level")]
        public int Level { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; }
    }

    public class StateModel
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }

        [JsonPropertyName("level")]
        public int Level { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; }
    }

    public class AlarmDataModel
    {
        [JsonPropertyName("description")]
        public object Description { get; set; } // Can be null

        [JsonPropertyName("startTime")]
        public object StartTime { get; set; } // Can be null

        [JsonPropertyName("endTime")]
        public object EndTime { get; set; } // Can be null

        [JsonPropertyName("location")]
        public object Location { get; set; } // Can be null

        [JsonPropertyName("count")]
        public int Count { get; set; }

        [JsonPropertyName("rules")]
        public List<RuleModel> Rules { get; set; }

        [JsonPropertyName("objects")]
        public List<ObjectItemModel> Objects { get; set; } // Renamed to ObjectItem to avoid conflict with System.Object

        [JsonPropertyName("references")]
        public object References { get; set; } // Can be null

        [JsonPropertyName("vendor")]
        public object Vendor { get; set; } // Can be null
    }

    public class RuleModel
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }

        [JsonPropertyName("name")]
        public object Name { get; set; } // Can be null

        [JsonPropertyName("type")]
        public string Type { get; set; }

        [JsonPropertyName("polygons")]
        public object Polygons { get; set; } // Can be null
    }

    public class ObjectItemModel
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }

        [JsonPropertyName("name")]
        public object Name { get; set; } // Can be null

        [JsonPropertyName("type")]
        public object Type { get; set; } // Can be null

        [JsonPropertyName("description")]
        public object Description { get; set; } // Can be null

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }

        [JsonPropertyName("value")]
        public string Value { get; set; }

        [JsonPropertyName("alarmTrigger")]
        public bool AlarmTrigger { get; set; }

        [JsonPropertyName("removed")]
        public bool Removed { get; set; }

        [JsonPropertyName("color")]
        public object Color { get; set; } // Can be null

        [JsonPropertyName("size")]
        public double Size { get; set; }

        [JsonPropertyName("sizeUnit")]
        public object SizeUnit { get; set; } // Can be null

        [JsonPropertyName("boundingBox")]
        public object BoundingBox { get; set; } // Can be null

        [JsonPropertyName("polygon")]
        public object Polygon { get; set; } // Can be null

        [JsonPropertyName("motion")]
        public object Motion { get; set; } // Can be null

        [JsonPropertyName("mask")]
        public object Mask { get; set; } // Can be null

        [JsonPropertyName("data")]
        public object Data { get; set; } // Can be null
    }
}