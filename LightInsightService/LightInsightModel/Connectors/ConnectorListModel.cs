using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightModel.Connectors
{
    public class ConnectorListModel
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Status { get; set; }
        public string IpServer { get; set; }
        public long Port { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
        public string VmsName { get; set; }
        public int VmsID { get; set; }
    }
}
