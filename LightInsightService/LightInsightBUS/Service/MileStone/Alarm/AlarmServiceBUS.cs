using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;
using LightInsightBUS.ExternalServices.MileStone;
using LightInsightBUS.Interfaces.MileStone.Alarm;
using LightInsightModel.MileStone.General;
using LightInsightModel.MileStone.Alarm;
using Microsoft.Extensions.Caching.Memory;
using LightInsightDAL.Repositories.MileStone.General;
using LightInsightModel.Connectors;
using static Org.BouncyCastle.Math.EC.ECCurve;

namespace LightInsightBUS.Service.MileStone.Alarm
{
    public class AlarmServiceBUS : IAlarmService
    {
        // Lưu ý: Các biến này cần được khởi tạo (new) trước khi dùng để tránh lỗi NullReferenceException
        private static GetAlarms alarm = new GetAlarms();
        private static GetCameras camera = new GetCameras();
        private readonly GetAnalyticsEvents tocken;
        private readonly IMemoryCache _cache;

        public AlarmServiceBUS(IMemoryCache cache)
        {
            tocken = new GetAnalyticsEvents(cache);
        }

        public async Task<List<AlarmData>> GetAlarmData(int page, int pageSize)
        {
            var resultList = new List<AlarmData>();

            // 1. Lấy Token
            var accessToken = await tocken.GetTokenAsync();

            var config = tocken.GetVmsConfig(1);
            var baseUrl = $"http://{config.IpServer}:{config.Port}";

            // Xử lý logic trang: Frontend gửi lên 1, 2, 3... nhưng API Milestone đếm từ 0, 1, 2...
            int milestonePageIndex = page - 1;
            if (milestonePageIndex < 0) milestonePageIndex = 0;

            // 2. Lấy dữ liệu raw (chuỗi JSON) từ API Alarm
            string rawAlarmJson = alarm.GetAlarmsList(baseUrl, accessToken, milestonePageIndex, pageSize);

            if (string.IsNullOrEmpty(rawAlarmJson))
            {
                return resultList; // Trả về list rỗng nếu lỗi
            }

            // Parse JSON thành Object
            var alarmDataResponse = JsonConvert.DeserializeObject<AlarmResponse>(rawAlarmJson);

            // 3. TẠO BỘ NHỚ ĐỆM (CACHE) ĐỂ LƯU TÊN CAMERA
            // Key: cameraId | Value: Tên camera
            Dictionary<string, string> cameraCache = new Dictionary<string, string>();

            // 4. Duyệt qua từng Alarm và map dữ liệu
            if (alarmDataResponse?.array != null)
            {
                foreach (var item in alarmDataResponse.array)
                {
                    string camName = "Unknown Camera";
                    string camId = item.cameraId;

                    // Nếu có cameraId thì tiến hành lấy tên
                    if (!string.IsNullOrEmpty(camId))
                    {
                        // Kiểm tra xem ID này đã được gọi API chưa
                        if (cameraCache.ContainsKey(camId))
                        {
                            // Đã có trong cache -> Lấy ra dùng luôn, KHÔNG gọi API nữa
                            camName = cameraCache[camId];
                        }
                        else
                        {
                            // Chưa có -> Gọi API lấy thông tin
                            string rawCameraJson = camera.GetCameraById(baseUrl, accessToken, camId);

                            if (!string.IsNullOrEmpty(rawCameraJson))
                            {
                                var cameraDataResponse = JsonConvert.DeserializeObject<MilestoneCameraResponse>(rawCameraJson);
                                if (cameraDataResponse?.data != null)
                                {
                                    camName = cameraDataResponse.data.name;

                                    // Lưu vào cache để dùng cho các alarm sau bị trùng ID
                                    cameraCache.Add(camId, camName);
                                }
                            }
                        }
                    }

                    // 5. Chuẩn hóa dữ liệu đẩy ra list cho FE
                    var feItem = new AlarmData
                    {
                        alarmId = item.id,
                        alarmName = item.name,
                        location = "", // Để trống như yêu cầu
                        message = item.message,
                        priorityLevel = item.priority?.level ?? 0,
                        priorityName = item.priority?.name ?? "Unknown",
                        source = camName, // Lấy tên camera từ logic Cache bên trên
                        stateLevel = item.state?.level ?? 0,
                        stateName = item.state?.name ?? "Unknown",

                        // Chuyển UTC Time về Local Time và Format theo DD-MM-YYYY HH:mm:ss
                        time = item.time.ToLocalTime().ToString("dd-MM-yyyy HH:mm:ss"),

                        type = item.legacyType
                    };

                    resultList.Add(feItem);
                }
            }

            return resultList;
        }
    }
}