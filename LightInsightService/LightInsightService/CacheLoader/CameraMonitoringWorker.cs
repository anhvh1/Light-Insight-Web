using LightInsightBUS.Interfaces.General;
using LightInsightDAL.Repositories.General;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Net.NetworkInformation;
using System.Threading;
using System.Threading.Tasks;

namespace LightInsightService.CacheLoader
{
    public class CameraMonitoringWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ICameraStatusService _statusService;
        private readonly ILogger<CameraMonitoringWorker> _logger;

        public CameraMonitoringWorker(
            IServiceProvider serviceProvider, 
            ICameraStatusService statusService,
            ILogger<CameraMonitoringWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _statusService = statusService;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Camera Monitoring Worker is starting with Adaptive Logic.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var dmMapDAL = new DMMapDAL();
                        
                        // 1. Lấy tất cả markers từ DB
                        var markers = await dmMapDAL.GetAllMarkersWithIpAsync();
                        if (markers == null || !markers.Any())
                        {
                            await Task.Delay(5000, stoppingToken);
                            continue;
                        }

                        // 2. Lấy trạng thái hiện tại từ Cache để phân loại
                        var currentStatus = _statusService.GetSummary().Details.ToDictionary(x => x.CameraId);

                        // 3. Lọc danh sách IP cần Ping trong vòng lặp này
                        var ipGroupsToPing = markers.GroupBy(m => m.IP).Where(group => 
                        {
                            // Kiểm tra xem IP này có camera nào cần ping ngay không?
                            return group.Any(m => 
                            {
                                // Nếu chưa có trong cache -> Ping ngay để khởi tạo
                                if (!currentStatus.TryGetValue(m.CameraId, out var status)) return true;

                                // Nếu đang ONLINE hoặc đang "nghi ngờ" (FailCount 1-2) -> Ping 5s/lần
                                if (status.IsOnline || (status.FailCount > 0 && status.FailCount < 3)) return true;

                                // Nếu đã OFFLINE -> Chỉ ping lại sau mỗi 60 giây (Slow Lane)
                                return (DateTime.Now - status.LastChecked).TotalSeconds >= 15;
                            });
                        }).ToList();

                        if (ipGroupsToPing.Any())
                        {
                            var options = new ParallelOptions
                            {
                                MaxDegreeOfParallelism = 20,
                                CancellationToken = stoppingToken
                            };

                            await Parallel.ForEachAsync(ipGroupsToPing, options, async (group, ct) =>
                            {
                                string ip = group.Key;
                                bool isAlive = await PingHostAsync(ip);

                                foreach (var marker in group)
                                {
                                    // Chuyển đổi Type (int?) sang int, mặc định là 0 (Unknown) nếu null
                                    int deviceType = marker.Type ?? 0;
                                    _statusService.UpdateStatus(marker.CameraId, ip, deviceType, isAlive);
                                }
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred in CameraMonitoringWorker.");
                }

                // Vòng lặp chính chạy 5 giây một lần
                await Task.Delay(5000, stoppingToken);
            }

            _logger.LogInformation("Camera Monitoring Worker is stopping.");
        }

        private async Task<bool> PingHostAsync(string ip)
        {
            if (string.IsNullOrWhiteSpace(ip)) return false;
            try
            {
                using (var ping = new Ping())
                {
                    // Timeout 1000ms theo yêu cầu
                    var reply = await ping.SendPingAsync(ip, 1000);
                    return reply.Status == IPStatus.Success;
                }
            }
            catch
            {
                return false;
            }
        }
    }
}
