using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightModel.MileStone.General
{
    public class TokenResponse
    {
        public string? access_token { get; set; }
        public int expires_in { get; set; }
        public string? token_type { get; set; }
        public string? scope { get; set; }
    }
    public class AnalyticsEventResponse
    {
        public List<AnalyticsEvent> array { get; set; }
    }

    public class AnalyticsEvent
    {
        public string displayName { get; set; }
        public string id { get; set; }
        public string name { get; set; }
        public DateTime lastModified { get; set; }
        public string description { get; set; }
        public List<string> sourceArray { get; set; }
        public Relations relations { get; set; }
    }

    public class Relations
    {
        public Self self { get; set; }
    }

    public class Self
    {
        public string type { get; set; }
        public string id { get; set; }
    }
    public class SimpleEvent
    {
        public string ID { get; set; }
        public string Name { get; set; }
    }
    public class WebRTCToken
    {
        public string baseUrl { get; set; }
        public string bearerToken { get; set; }
    }
}
