using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightModel.MileStone.Camera
{
    public class MilestoneCameraListResponse
    {
        public List<MilestoneCameraData> array { get; set; }
    }

    public class MilestoneCameraData
    {
        public string id { get; set; }
        public string name { get; set; }
    }

    public class CameraDropDown
    {
        public string id { get; set; }
        public string name { get; set; }
    }
}
