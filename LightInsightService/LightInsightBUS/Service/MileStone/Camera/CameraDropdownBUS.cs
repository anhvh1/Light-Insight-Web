using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LightInsightBUS.ExternalServices.MileStone;
using LightInsightBUS.Interfaces.MileStone.Camera;
using LightInsightModel.MileStone.Camera;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;

namespace LightInsightBUS.Service.MileStone.Camera
{
    public class CameraDropdownBUS : ICameraDropDown
    {
        private static GetCameras cameraApi = new GetCameras();
        private readonly GetAnalyticsEvents tocken;

        public CameraDropdownBUS(IMemoryCache cache)
        {
            tocken = new GetAnalyticsEvents(cache);
        }

        public async Task<List<CameraDropDown>> GetCameraDropdownAsync(Guid key)
        {
            var resultList = new List<CameraDropDown>();

            // 1. Lấy Token và Config
            var accessToken = await tocken.GetTokenAsync(key);
            var config = tocken.GetVmsConfig(key);
            var baseUrl = $"http://{config.IpServer}:{config.Port}";

            // 2. Gọi External Service lấy cục raw JSON
            string rawCameraJson = cameraApi.GetAllCameras(baseUrl, accessToken);

            if (string.IsNullOrEmpty(rawCameraJson))
            {
                return resultList;
            }

            // 3. Deserialize và map sang dữ liệu Dropdown
            var cameraDataResponse = JsonConvert.DeserializeObject<MilestoneCameraListResponse>(rawCameraJson);

            if (cameraDataResponse?.array != null)
            {
                foreach (var item in cameraDataResponse.array)
                {
                    resultList.Add(new CameraDropDown
                    {
                        name = item.name
                    });
                }
            }

            return resultList;
        }
    }
}
