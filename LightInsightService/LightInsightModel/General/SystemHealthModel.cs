using System;
using System.Collections.Generic;

namespace LightInsightModel.General
{
    public class SystemHealthModel
    {
        public List<ConnectorHealth> Connectors { get; set; } = new List<ConnectorHealth>();
        public List<InfrastructureHealth> Infrastructure { get; set; } = new List<InfrastructureHealth>();
    }

    public class ConnectorHealth
    {
        public string Name { get; set; }
        public string ApiInfo { get; set; }
        public string Latency { get; set; }
        public string Stats { get; set; }
        public string StatsLabel { get; set; }
        public string EventsPerMin { get; set; }
        public string Status { get; set; }
        public int HealthPercentage { get; set; }
        public string Description { get; set;}
    }

    public class InfrastructureHealth
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string Status { get; set; }
        public string Type { get; set; } // server, storage, camera
        public string ConnectorId { get; set; } // Dùng để lọc hạ tầng theo connector
    }
}
