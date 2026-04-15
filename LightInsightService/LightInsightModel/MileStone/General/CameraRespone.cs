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
        public RelationsModel Relations { get; set; }

        // Một thuộc tính tiện ích (Helper) để lấy nhanh HardwareId mà không cần truy cập sâu
        public string HardwareId => Relations?.Parent?.Id;
    }
    public class RelationsModel
    {
        public Parent Parent { get; set; }
    }

    public class Parent
    {
        public string Type { get; set; }
        public string Id { get; set; }
    }
}
