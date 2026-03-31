using LightInsightBUS.Interfaces.Login;
using LightInsightDAL.Repositories.Login;
using LightInsightModel.Login;
using LightInsightModel.MileStone.General;
using MySqlX.XDevAPI.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.Login
{
    public class LoginBUS : ILogin
    {
        private static LoginDAL instance;
        public LoginBUS()
        {
            instance = new LoginDAL();
        }
        public async Task<BaseResultModel> Login(string username, string password)
        {
            var user = await instance.Login(username, password);
            if (user == null)
            {
                return new BaseResultModel
                {
                    Status = 0,
                    Message = "Tên đăng nhập hoặc mật khẩu không đúng."
                };
            }
            else if (user.Status != "Active")
            {
                return new BaseResultModel
                {
                    Status = 0,
                    Message = "Tài khoản của bạn bị khóa. Vui lòng liên hệ quản trị viên."
                };
            }
            else
            {
                return new BaseResultModel
                {
                    Status = 1,
                    Message = "Đăng nhập thành công.",
                    Data = instance.GenerateToken(user)
                };
            }

        }
        public async Task<BaseResultModel> GetUsers(string? search, int? page, int? pageSize)
        {
            try
            {
                var result = new BaseResultModel();
                var data = await instance.GetUsers(search, page, pageSize);
                if (data.Item1.Any())
                {
                    result.Status = 1;
                    result.Message = "Get users successfully.";
                    result.Data = data.Item1;
                    result.TotalRow = data.Item2;
                }
                else
                {
                    result.Status = 1;
                    result.Message = "No users found.";
                    result.Data = data.Item1;
                    result.TotalRow = 0;
                }
                return result;
            }
            catch (Exception ex)
            {
                var result = new BaseResultModel();
                result.Status = -1;
                result.Message = ex.Message;
                return result;
            }
            
        }
    }
}
