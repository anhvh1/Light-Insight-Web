using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightModel.MileStone.General
{
    public class CameraResponse
    {
        public List<CameraItem> Array { get; set; }
    }

    public class CameraItem
    {
        public string Id { get; set; }
        public string Name { get; set; }
    }
}
