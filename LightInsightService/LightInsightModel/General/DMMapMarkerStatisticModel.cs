using System.Text.Json.Serialization;

namespace LightInsightModel.General
{
    public class DMMapMarkerStatisticModel
    {
        [JsonPropertyName("marker_type")]
        public int MarkerType { get; set; }

        [JsonPropertyName("total_count")]
        public long TotalCount { get; set; }
    }
}
