using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace LightInsightService.Sockets.General
{
    public class CameraStatusHub : Hub
    {
        // Hub này có thể để trống nếu chỉ dùng để Server đẩy dữ liệu xuống Client.
        // Frontend chỉ cần connect tới /camera-status-hub và lắng nghe event "CameraStatusChanged".
    }
}
