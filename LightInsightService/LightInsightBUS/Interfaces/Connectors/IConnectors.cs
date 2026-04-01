using LightInsightModel.Connectors;
using LightInsightModel.MileStone.General;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Interfaces.Connectors
{
    public interface IConnectors
    {
        Task<BaseResultModel> AddConnectorAsync(ConnectorsModel model);
    }
}
