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
    public class RegisterBUS : IRegister
    {
        private static RegisterDAL instance;
        public RegisterBUS()
        {
            instance = new RegisterDAL();
        }
        public async Task<BaseResultModel> Register(RegisterRequest req)
        {
            try
            {
                var result = new BaseResultModel();
                if (req.Username.Length < 6)
                {
                    result.Status = 0;
                    result.Message = "Tên tài khoản phải >= 6 ký tự";
                    return result;
                }
                // Kiểm tra username đã tồn tại chưa
                bool exists = await instance.CheckUsernameExists(req.Username);
                if (exists)
                {
                    result.Status = 0;
                    result.Message = "Tên tài khoản đã tồn tại";
                    return result;
                }
                // Thực hiện đăng ký
                string registerResult = await instance.Register(req);
                if (registerResult == "OK")
                {
                    // Ghi nhận Audit Log
                    AuditLogger.Log("SYSTEM", "USER_REGISTER", $"Hệ thống đã tạo tài khoản người dùng mới: {req.Name} (@{req.Username})", 
                        new { Username = req.Username, Name = req.Name, RoleId = req.RoleId });

                    result.Status = 1;
                    result.Message = "User registered successfully.";
                }
                else
                {
                    result.Status = -1;
                    result.Message = registerResult; // Trả về lỗi cụ thể từ DAL
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
