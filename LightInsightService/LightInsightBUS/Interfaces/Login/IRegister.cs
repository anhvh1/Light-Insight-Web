using LightInsightModel.Login;
using LightInsightModel.MileStone.General;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Interfaces.Login
{
    public interface IRegister
    {
        Task<BaseResultModel> Register(RegisterRequest req);
    }
}
