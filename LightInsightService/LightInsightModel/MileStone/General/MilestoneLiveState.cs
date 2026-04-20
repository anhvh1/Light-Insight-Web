using System.Collections.Generic;
using LightInsightModel.General;

namespace LightInsightModel.MileStone.General
{
    public class MilestoneLiveState
    {
        public string Name { get; set; }
        public string Status { get; set; }
        public long LatencyMs { get; set; }
        public int TotalCameras { get; set; }
        public int OnlineCameras { get; set; }
        public List<InfrastructureHealth> Infrastructure { get; set; } = new List<InfrastructureHealth>();
    }
}
