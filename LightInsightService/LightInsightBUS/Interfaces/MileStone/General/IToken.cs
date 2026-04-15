using LightInsightModel.MileStone.General;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Interfaces.MileStone.General
{
    public interface IToken
    {
        Task<WebRTCToken> GetTokenForWebRTC(Guid key);
    }
}
