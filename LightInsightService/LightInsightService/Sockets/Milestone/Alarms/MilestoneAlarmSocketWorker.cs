using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace LightInsightService.Sockets.Milestone.Alarms
{
    public class MilestoneAlarmSocketWorker : BackgroundService
    {
        // Danh sách các kết nối từ React FE
        public static readonly ConcurrentDictionary<string, WebSocket> Clients = new();

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

                            // --- BƯỚC: GỬI SANG REACT FE ---
                            await Broadcast(transformedData, stoppingToken);
                        }
                    }
                }
                catch { /* Tự động kết nối lại nếu Milestone sập */ }
                await Task.Delay(5000, stoppingToken);
            }
        }

        private string Transform(string json)
        {
            try
            {
                // Parse JSON an toàn bằng JObject
                var raw = JObject.Parse(json);

                // Tạo Object mới với bộ Key chuẩn camelCase cho FE
                var feData = new
                {
                    alarmId = raw["AlarmId"]?.ToString(),
                    alarmName = raw["AlarmName"]?.ToString(),
                    type = raw["Type"]?.ToString(),
                    source = raw["Source"]?.ToString(),
                    location = raw["Location"]?.ToString(),
                    message = raw["Message"]?.ToString(),
                    time = raw["Time"]?.ToString(),

                    // Nhóm trạng thái
                    stateName = raw["StateName"]?.ToString(),
                    stateLevel = (int?)raw["StateLevel"],

                    // Nhóm độ ưu tiên
                    priorityName = raw["PriorityName"]?.ToString(),
                    priorityLevel = (int?)raw["PriorityLevel"]
                };

                // Serialize lại thành chuỗi JSON với key mới
                return JsonConvert.SerializeObject(feData);
            }
            catch
            {
                // Nếu parse lỗi, trả về nguyên gốc để không mất data
                return json;
            }
        }

        private async Task Broadcast(string message, CancellationToken ct)
        {
            var bytes = Encoding.UTF8.GetBytes(message);
            foreach (var client in Clients)
            {
                if (client.Value.State == WebSocketState.Open)
                {
                    await client.Value.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, ct);
                }
                else
                {
                    Clients.TryRemove(client.Key, out _);
                }
            }
        }
    }
}