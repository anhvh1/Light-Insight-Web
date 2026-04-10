using LightInsightModel.MileStone.General;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Mysqlx.Expect.Open.Types.Condition.Types;

namespace LightInsightBUS.Interfaces.MileStone.General
{
    public interface IPriority
    {
        Task<List<Priority>> GetPrioritiesAsync();
        Task<BaseResultModel> GetAllAsync();
        Task<BaseResultModel> UpdateAsync(int id, int priorityId);
        Task<BaseResultModel> InsertAsync(int priorityId, List<string> eventName);
        Task<BaseResultModel> DeleteAsync(int id);
        Task<BaseResultModel> GetSimpleEventsAsync(Guid key);
    }
}
