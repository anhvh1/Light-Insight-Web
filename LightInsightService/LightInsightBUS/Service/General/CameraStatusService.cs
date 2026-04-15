using LightInsightBUS.Interfaces.General;
using LightInsightModel.General;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;

namespace LightInsightBUS.Service.General
{
    public class CameraStatusService : ICameraStatusService
    {
        // Key: CameraId
        private readonly ConcurrentDictionary<string, CameraStatus> _cache = new();

        public event Func<CameraStatus, Task> OnStatusChanged;

        public void UpdateStatus(string cameraId, string ip, int deviceType, bool isSuccess)
        {
            bool statusChanged = false;
            CameraStatus updatedStatus = null;

            _cache.AddOrUpdate(cameraId,
                // Add new
                id => {
                    var newStatus = new CameraStatus { 
                        CameraId = id, 
                        IpAddress = ip, 
                        DeviceType = deviceType,
                        IsOnline = isSuccess, 
                        FailCount = isSuccess ? 0 : 1, 
                        LastChecked = DateTime.Now 
                    };
                    statusChanged = true;
                    updatedStatus = newStatus;
                    return newStatus;
                },
                // Update existing
                (id, existing) => {
                    bool oldIsOnline = existing.IsOnline;
                    existing.IpAddress = ip;
                    existing.DeviceType = deviceType;
                    existing.LastChecked = DateTime.Now;
                    if (isSuccess)
                    {
                        existing.IsOnline = true;
                        existing.FailCount = 0;
                    }
                    else
                    {
                        if (existing.FailCount < 3) existing.FailCount++;
                        if (existing.FailCount >= 3) existing.IsOnline = false;
                    }

                    if (oldIsOnline != existing.IsOnline)
                    {
                        statusChanged = true;
                    }
                    updatedStatus = existing;
                    return existing;
                });

            if (statusChanged && updatedStatus != null && OnStatusChanged != null)
            {
                // Fire and forget event
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await OnStatusChanged(updatedStatus);
                    }
                    catch { /* ignore */ }
                });
            }
        }

        public CameraStatusSummary GetSummary(IEnumerable<string> cameraIds = null)
        {
            var allValues = _cache.Values.ToList();
            var filteredDetails = cameraIds != null 
                ? allValues.Where(x => cameraIds.Contains(x.CameraId)).ToList() 
                : allValues;

            var summary = new CameraStatusSummary
            {
                GlobalTotal = filteredDetails.Count,
                GlobalOnline = filteredDetails.Count(x => x.IsOnline),
                GlobalOffline = filteredDetails.Count(x => !x.IsOnline),
                Details = filteredDetails // Thêm dòng này để fix lỗi Details missing
            };

            // Gom nhóm theo DeviceType
            var groupedData = filteredDetails
                .GroupBy(x => x.DeviceType)
                .Select(g => new DeviceStatusGroup
                {
                    Type = g.Key,
                    TypeName = GetDeviceTypeName(g.Key),
                    Total = g.Count(),
                    Online = g.Count(x => x.IsOnline),
                    Offline = g.Count(x => !x.IsOnline),
                    Details = g.ToList()
                })
                .OrderBy(g => g.Type)
                .ToList();

            summary.Groups = groupedData;

            return summary;
        }

        private string GetDeviceTypeName(int type)
        {
            return type switch
            {
                1 => "Camera",
                2 => "Microphone",
                3 => "Speaker",
                _ => "Unknown"
            };
        }
    }
}
