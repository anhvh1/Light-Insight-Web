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

        public async Task<List<string>> GetAlarmMessageDropdownAsync()
        {
            // Lấy Token và cấu hình
            var accessToken = await tocken.GetTokenAsync();
            var config = tocken.GetVmsConfig(1);
            var baseUrl = $"http://{config.IpServer}:{config.Port}";

            // Gọi API của Milestone
            string rawJson = alarm.GetAllAlarmMessages(baseUrl, accessToken);

            if (string.IsNullOrEmpty(rawJson))
            {
                return new List<string>(); // Trả về list rỗng nếu lỗi
            }

            // Ép kiểu JSON
            var responseData = JsonConvert.DeserializeObject<MilestoneAlarmMessageResponse>(rawJson);

            // Bốc nguyên cái mảng chuỗi ném thẳng cho Frontend, không cần foreach gì hết!
            if (responseData?.array != null)
            {
                return responseData.array;
            }

            return new List<string>();
        }

        public async Task<List<AlarmData>> GetAlarmData(int page, int pageSize, AlarmFilter filter = null)
        {
            var resultList = new List<AlarmData>();

            // 1. Lấy Token
            var accessToken = await tocken.GetTokenAsync();

            var config = tocken.GetVmsConfig(1);
            var baseUrl = $"http://{config.IpServer}:{config.Port}";

            // Xử lý logic trang: Frontend gửi lên 1, 2, 3... nhưng API Milestone đếm từ 0, 1, 2...
            int milestonePageIndex = page - 1;
            if (milestonePageIndex < 0) milestonePageIndex = 0;

            // Chuyển đổi Object Filter thành chuỗi Query String
            string filterQuery = BuildMilestoneFilterQuery(filter);

            // 2. Lấy dữ liệu raw (chuỗi JSON) từ API Alarm
            string rawAlarmJson = alarm.GetAlarmsList(baseUrl, accessToken, milestonePageIndex, pageSize, filterQuery);

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

        // =========================================================================
        // HÀM HELPER: BIẾN OBJECT THÀNH CHUỖI QUERY CHO MILESTONE
        // =========================================================================
        private string BuildMilestoneFilterQuery(AlarmFilter filter)
        {
            if (filter == null) return string.Empty;

            var queryParts = new List<string>();

            if (!string.IsNullOrEmpty(filter.priorityName))
                queryParts.Add($"priority.name='{EscapeString(filter.priorityName)}'");

            if (!string.IsNullOrEmpty(filter.message))
                queryParts.Add($"message='{EscapeString(filter.message)}'");

            if (!string.IsNullOrEmpty(filter.source))
                queryParts.Add($"cameraId='{EscapeString(filter.source)}'");

            //if (filter.ExcludeClosedAlarms)
            //{
            //    queryParts.Add("state.name=notEquals:'Closed'");
            //}
            //else if (!string.IsNullOrEmpty(filter.StateName))
            //{
            //    queryParts.Add($"state.name='{EscapeString(filter.StateName)}'");
            //}

            if (!string.IsNullOrEmpty(filter.stateName))
            {
                queryParts.Add($"state.name='{EscapeString(filter.stateName)}'");
            }

            var timeFilters = new List<string>();
            if (filter.fromTime.HasValue)
            {
                string fromStr = filter.fromTime.Value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
                timeFilters.Add($"gt:'{fromStr}'");
            }

            if (filter.toTime.HasValue)
            {
                string toStr = filter.toTime.Value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
                timeFilters.Add($"lt:'{toStr}'");
            }

            if (timeFilters.Count > 0)
            {
                queryParts.Add($"time={string.Join(",", timeFilters)}");
            }

            return queryParts.Count > 0 ? string.Join("&", queryParts) : string.Empty;
        }

        private string EscapeString(string input)
        {
            return input?.Replace("'", "''");
        }
    }
}