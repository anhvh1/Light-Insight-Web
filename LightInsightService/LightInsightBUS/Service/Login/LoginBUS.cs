using LightInsightBUS.Interfaces.Login;
using LightInsightDAL.Repositories.Login;
using LightInsightModel.Login;
using LightInsightModel.MileStone.General;
using LightInsightUtiltites;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.Login
{
    public class LoginBUS : ILogin
    {
        private readonly LoginDAL _loginDAL;
        public LoginBUS()
        {
            _loginDAL = new LoginDAL();
        }
        public async Task<BaseResultModel> Login(string username, string password)
        {
            var user = await _loginDAL.Login(username, password);
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
                // Ghi nhận Audit Log khi đăng nhập thành công
                AuditLogger.Log(user.Username, "AUTH_LOGIN", $"Người dùng {user.Name} (@{user.Username}) đã đăng nhập vào hệ thống.", 
                    new { Name = user.Name, RoleId = user.RoleId }, user.RoleName);

                return new BaseResultModel
                {
                    Status = 1,
                    Message = "Đăng nhập thành công.",
                    Data = _loginDAL.GenerateToken(user)
                };
            }

        }
        public async Task<BaseResultModel> GetUsers(string? search, int? page, int? pageSize)
        {
            try
            {
                var data = await _loginDAL.GetUsers(search, page, pageSize);
                return new BaseResultModel
                {
                    Status = 1,
                    Message = "Get users successfully.",
                    Data = data.Item1,
                    TotalRow = data.Item2
                };
            }
            catch (Exception ex)
            {
                return new BaseResultModel
                {
                    Status = -1,
                    Message = "Backend Error: " + ex.Message
                };
            }
            
        }
        public async Task<BaseResultModel> GetRoles()
        {
            try
            {
                var roles = _loginDAL.GetRoles();
                return new BaseResultModel
                {
                    Status = 1,
                    Message = "Get roles successfully.",
                    Data = roles
                };
            }
            catch (Exception ex)
            {
                return new BaseResultModel
                {
                    Status = -1,
                    Message = "Backend Error: " + ex.Message
                };
            }
        }
        public async Task<BaseResultModel> Logout(string username)
        {
            AuditLogger.Log(username, "AUTH_LOGOUT", $"Người dùng {username} đã đăng xuất khỏi hệ thống.");
            return new BaseResultModel { Status = 1, Message = "Logout logged successfully." };
        }
    }
}
