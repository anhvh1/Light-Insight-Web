using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LightInsightModel.MileStone.Alarm;

namespace LightInsightBUS.Interfaces.MileStone.Alarm
{
    public interface IAlarmService
    {
        Task<List<AlarmData>> GetAlarmData(int page, int pageSize);
    }
}
