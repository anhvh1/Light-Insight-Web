using LightInsightBUS.ExternalServices.MileStone;
using LightInsightBUS.Interfaces.MileStone.General;
using LightInsightDAL.Repositories.MileStone.General;
using LightInsightModel.MileStone.General;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.MileStone.General
{
    public class PriorityBUS : IPriority
    {
        private static PriorityDAL instance;
        public PriorityBUS()
        {
            instance = new PriorityDAL();
        }
        public async Task<List<Priority>> GetPrioritiesAsync()
        {
            return await instance.GetPrioritiesAsync();
        }
        public async Task<BaseResultModel> GetAllAsync()
        {
            var result = new BaseResultModel();
            var data = await instance.GetAllAsync();
            if (data.Any())
            {
                result.Status = 1;
                result.Message = "Get all mapping VMS priority successfully.";
                result.Data = data;
                result.TotalRow = data.Count;
            }
            else
            {
                result.Status = 1;
                result.Message = "No mapping VMS priority found.";
                result.Data = data;
                result.TotalRow = 0;
            }
            return result;
        }
        public async Task<BaseResultModel> UpdateAsync(int id, int priorityId)
        {
            var result = new BaseResultModel();
            var boolResult = await instance.UpdateAsync(id, priorityId);
            if (boolResult)
            {
                result.Status = 1;
                result.Message = "Update mapping VMS priority successfully.";
            }
            else
            {
                result.Status = -1;
                result.Message = "Failed to update mapping VMS priority.";
            }
            return result;
        }
        public async Task<BaseResultModel> InsertAsync(int priorityId, List<string> eventName)
        {
            var result = new BaseResultModel();
            var boolResult = await instance.InsertAsync(priorityId, eventName);
            if (boolResult)
            {
                result.Status = 1;
                result.Message = "Insert mapping VMS priority successfully.";
            }
            else
            {
                result.Status = -1;
                result.Message = "Failed to insert mapping VMS priority.";
            }
            return result;
        }
        public async Task<BaseResultModel> DeleteAsync(int id)
        {
            var result = new BaseResultModel();
            var boolResult = await instance.DeleteAsync(id);
            if (boolResult)
            {
                result.Status = 1;
                result.Message = "Delete mapping VMS priority successfully.";
            }
            else
            {
                result.Status = -1;
                result.Message = "Failed to delete mapping VMS priority.";
            }
            return result;
        }
        public async Task<BaseResultModel> GetSimpleEventsAsync()
        {
            try
            {
                var result = new BaseResultModel();
                var data = await new GetAnalyticsEvents().GetSimpleEventsAsync();
                if (data.Any())
                {
                    result.Status = 1;
                    result.Message = "Get all analytics events successfully.";
                    result.Data = data;
                }
                else
                {
                    result.Status = 1;
                    result.Message = "No analytics events found.";
                    result.Data = data;
                }
                return result;
            }
            catch (Exception ex)
            {
                var result = new BaseResultModel
                {
                    Status = -1,
                    Message = $"Failed to get analytics events: {ex.Message}"
                };
                return result;
            }
            
        }

    }
}
