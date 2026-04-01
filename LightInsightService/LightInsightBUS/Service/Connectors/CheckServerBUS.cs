using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.Connectors
{
    public class CheckServerBUS
    {
        public  async Task<bool> CheckTcpConnectionAsync(string ip, long port)
        {
            try
            {
                using var client = new TcpClient();

                var connectTask = client.ConnectAsync(ip,(int)port);
                var timeoutTask = Task.Delay(3000);

                var completedTask = await Task.WhenAny(connectTask, timeoutTask);

                if (completedTask == timeoutTask)
                    return false; // timeout

                // Nếu connectTask bị lỗi sẽ throw ở đây
                await connectTask;

                return client.Connected;
            }
            catch
            {
                return false;
            }
        }
    }
}
