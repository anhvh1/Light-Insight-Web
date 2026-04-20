using LightInsightBUS.Interfaces;
using LightInsightDAL.Repositories.MileStone.Camera;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Service
{
    public class CameraServiceBUS:ICameraService
    {
        private static CameraServiceDAL cameraDAL;
        
        public CameraServiceBUS() 
        {
            cameraDAL = new CameraServiceDAL();
        }
        public Dictionary<string, string> LoadCameraUriMap()
        {
            var a = cameraDAL.LoadCameraUriMap();
            // Gọi phương thức DAL để lấy dữ liệu
            return a;
        }
    }
}
