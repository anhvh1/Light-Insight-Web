using System;
using System.Collections.Generic;

namespace LightInsightModel.General
{
    public class DMMapTreeModel : DMMapModel
    {
        public List<DMMapTreeModel> Children { get; set; } = new List<DMMapTreeModel>();
    }
}
