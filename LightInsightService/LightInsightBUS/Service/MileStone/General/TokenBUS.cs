using LightInsightBUS.ExternalServices.MileStone;
using LightInsightBUS.Interfaces.MileStone.General;
using LightInsightModel.MileStone.Alarm;
using LightInsightModel.MileStone.General;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.MileStone.General
{
    public class TokenBUS: IToken
    {
        private readonly GetAnalyticsEvents tocken;

        public TokenBUS(IMemoryCache cache)
        {
            tocken = new GetAnalyticsEvents(cache);
        }
        public async Task<WebRTCToken> GetTokenForWebRTC(Guid key)
        {
            // Lấy Token và cấu hình
            var accessToken = await tocken.GetTokenAsync(key);
            var config = tocken.GetVmsConfig(key);
            var baseUrl = $"https://{config.IpServer}/api";

            return new WebRTCToken
            {
                baseUrl = baseUrl,
                bearerToken = accessToken.ToString()
            };
        }
    }
}
