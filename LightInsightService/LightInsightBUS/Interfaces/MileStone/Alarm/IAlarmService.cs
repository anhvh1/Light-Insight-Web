using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LightInsightModel.MileStone.Alarm;
using LightInsightModel.MileStone.General;

namespace LightInsightBUS.Interfaces.MileStone.Alarm
{
    public interface IAlarmService
    {
        Task<List<AlarmData>> GetAlarmData(Guid key,int page, int pageSize, AlarmFilter filter = null);
        Task<List<string>> GetAlarmMessageDropdownAsync(Guid key);
        Task<List<AlarmModel>> GetAlarmsAsync(Guid key, List<string> cameraIds, DateTime startTime, DateTime endTime);
    }
}
