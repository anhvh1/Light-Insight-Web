using LightInsightModel.General;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LightInsightBUS.Interfaces.General
{
    public interface ICameraStatusService
    {
        event Func<CameraStatus, Task> OnStatusChanged;
        void UpdateStatus(string cameraId, string ip, int deviceType, bool isSuccess);
        CameraStatusSummary GetSummary(IEnumerable<string> cameraIds = null);
    }
}
