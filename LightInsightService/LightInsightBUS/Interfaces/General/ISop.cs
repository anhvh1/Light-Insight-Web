using LightInsightModel.General;
using LightInsightModel.MileStone.General;
using System;
using System.Threading.Tasks;

namespace LightInsightBUS.Interfaces.General
{
    public interface ISop
    {
        Task<BaseResultModel> GetPagedAsync(SopPagingRequest request);
        Task<BaseResultModel> GetByIdAsync(Guid id);
        Task<BaseResultModel> CreateAsync(SopCreateModel model);
        Task<BaseResultModel> UpdateAsync(SopUpdateModel model);
        Task<BaseResultModel> DeleteAsync(Guid id);
    }
}
