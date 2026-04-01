using System.Net.WebSockets;
using System.Text;
using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json.Linq;

namespace LightInsightService.Sockets.Milestone.Alarms
{
    public class MilestoneAlarmSocketWorker : BackgroundService
    {
        // Nhúng SignalR Hub Context để có thể gọi FE
        private readonly IHubContext<MilestoneAlarmHub> _hubContext;

        public MilestoneAlarmSocketWorker(IHubContext<MilestoneAlarmHub> hubContext)
        {
            _hubContext = hubContext;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                using var milestoneWs = new ClientWebSocket();
                try
                {
                    await milestoneWs.ConnectAsync(new Uri("ws://192.168.100.10:8866/ws/"), stoppingToken);

                    var buffer = new byte[1024 * 4];
                    while (milestoneWs.State == WebSocketState.Open && !stoppingToken.IsCancellationRequested)
                    {
                        var result = await milestoneWs.ReceiveAsync(new ArraySegment<byte>(buffer), stoppingToken);
                        if (result.MessageType == WebSocketMessageType.Text)
                        {
                            var rawStr = Encoding.UTF8.GetString(buffer, 0, result.Count);

                            // --- BƯỚC: CHỈNH SỬA KEY VALUE ---
                            var transformedData = Transform(rawStr);

                            // --- BƯỚC: GỬI SANG REACT FE QUA SIGNALR ---
                            await Broadcast(transformedData, stoppingToken);
                        }
                    }
                }
                catch { /* Tự động kết nối lại nếu Milestone sập */ }

                await Task.Delay(5000, stoppingToken);
            }
        }

        // Đổi kiểu trả về thành object để SignalR tự động map ra JSON
        private object Transform(string json)
        {
            try
            {
                var raw = JObject.Parse(json);
                var feData = new
                {
                    alarmId = raw["AlarmId"]?.ToString(),
                    alarmName = raw["AlarmName"]?.ToString(),
                    type = raw["Type"]?.ToString(),
                    source = raw["Source"]?.ToString(),
                    location = raw["Location"]?.ToString(),
                    message = raw["Message"]?.ToString(),
                    time = raw["Time"]?.ToString(),
                    stateName = raw["StateName"]?.ToString(),
                    stateLevel = (int?)raw["StateLevel"],
                    priorityName = raw["PriorityName"]?.ToString(),
                    priorityLevel = (int?)raw["PriorityLevel"]
                };
                return feData;
            }
            catch
            {
                // Trả về chuỗi gốc nếu parse lỗi
                return json;
            }
        }

        private async Task Broadcast(object data, CancellationToken ct)
        {
            // Gửi dữ liệu tới tất cả client đang kết nối vào Hub
            // Gọi hàm có tên "ReceiveAlarm" trên Frontend (React)
            await _hubContext.Clients.All.SendAsync("ReceiveAlarm", data, cancellationToken: ct);
        }
    }
}