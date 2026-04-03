using LightInsightModel.MileStone.General;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Interfaces.Login
{
    public interface ILogin
    {
        Task<BaseResultModel> Login(string username, string password);
        Task<BaseResultModel> GetUsers(string? search, int? page, int? pageSize);
        Task<BaseResultModel> GetRoles();
    }
}
