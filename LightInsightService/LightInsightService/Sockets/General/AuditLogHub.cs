using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace LightInsightService.Sockets.General
{
    public class AuditLogHub : Hub
    {
        // Hub này đóng vai trò là kênh truyền tải Log thời gian thực
        // Các Client (Frontend) sẽ join vào đây để nhận log mới nhất
    }
}
