using System.Net.WebSockets;
using System.Text;
using LightInsightBUS.Interfaces.General;
using LightInsightModel.General;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json.Linq;

namespace LightInsightService.Sockets.Milestone.Alarms
{
    public class MilestoneAlarmSocketWorker : BackgroundService
    {
        // Nhúng SignalR Hub Context để có thể gọi FE
        private readonly IHubContext<MilestoneAlarmHub> _hubContext;
        private readonly IServiceScopeFactory _scopeFactory;

        public MilestoneAlarmSocketWorker(
            IHubContext<MilestoneAlarmHub> hubContext,
            IServiceScopeFactory scopeFactory)
        {
            _hubContext = hubContext;
            _scopeFactory = scopeFactory;
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
                            await TryCreateIncidentFromAlarmAsync(transformedData, stoppingToken);
                            await Broadcast(transformedData, stoppingToken);
                        }
                    }
                }
                catch { /* Tự động kết nối lại nếu Milestone sập */ }

                await Task.Delay(5000, stoppingToken);
            }
        }

        // Đổi kiểu trả về thành object để SignalR tự động map ra JSON
        private MilestoneAlarmPayload Transform(string json)
        {
            try
            {
                var raw = JObject.Parse(json);
                var feData = new MilestoneAlarmPayload
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
                    priorityLevel = (int?)raw["PriorityLevel"],
                    // Giữ tương thích payload với API /Alarm/GetAll để FE dùng chung mapper/playback
                    cameraid = raw["CameraId"]?.ToString() ?? raw["cameraid"]?.ToString() ?? raw["cameraId"]?.ToString(),
                    connectorName = raw["ConnectorName"]?.ToString() ?? "MileStone",
                    ipadress = raw["IpAddress"]?.ToString() ?? raw["IPAddress"]?.ToString() ?? raw["ipadress"]?.ToString()
                };
                return feData;
            }
            catch
            {
                return new MilestoneAlarmPayload();
            }
        }

        private async Task TryCreateIncidentFromAlarmAsync(MilestoneAlarmPayload payload, CancellationToken ct)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var autoIncidentService = scope.ServiceProvider.GetRequiredService<IAutoIncidentFromAlarm>();
                await autoIncidentService.TryCreateFromAlarmAsync(payload, ct);
            }
            catch
            {
                // Không throw để không ảnh hưởng luồng realtime push sang FE.
            }
        }

        private async Task Broadcast(MilestoneAlarmPayload data, CancellationToken ct)
        {
            // Gửi dữ liệu tới tất cả client đang kết nối vào Hub
            // Gọi hàm có tên "ReceiveAlarm" trên Frontend (React)
            await _hubContext.Clients.All.SendAsync("ReceiveAlarm", data, cancellationToken: ct);
        }
    }
}