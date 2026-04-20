using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightModel.MileStone.General
{
    public class MappingVMSPriority
    {
        public int ID { get; set; }
        public int PriorityID { get; set; }
        public string? PriorityName { get; set; }
        public List<string> AnalyticsEvents { get; set; } = new List<string>();
    }
    public class MappingVMSPriorityInsertModel
    {
        public int PriorityID { get; set; }
        public List<string> AnalyticsEvents { get; set; } = new List<string>();
    }
    public class MappingVMSPriorityUpdateModel
    {
        public int ID { get; set; }
        public int PriorityID { get; set; }
    }
    public class MappingVMSPriorityDeleteModel
    {
        public int ID { get; set; }
    }
}
