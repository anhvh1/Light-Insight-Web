using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using System;
using System.Threading.Tasks;

namespace LightInsightBUS.Interfaces.General
{
    public interface IIncident
    {
        Task<BaseResultModel> GetPagedAsync(IncidentPagingRequest request);
        Task<BaseResultModel> GetByIdAsync(Guid id);
        Task<BaseResultModel> CreateAsync(IncidentCreateModel model);
        Task<BaseResultModel> UpdateAsync(IncidentUpdateModel model);
        Task<BaseResultModel> DeleteAsync(Guid id);
    }
}
