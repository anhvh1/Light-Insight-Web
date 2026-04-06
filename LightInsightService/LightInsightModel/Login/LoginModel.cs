using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightModel.Login
{
    public class LoginModel
    {

    }
    public class RegisterRequest
    {
        [Required(ErrorMessage = "Username là bắt buộc")]
        public string Username { get; set; }
        [Required(ErrorMessage = "Password là bắt buộc")]
        public string Password { get; set; }
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Status { get; set; }
        public Guid RoleId { get; set; }
    }
    public class User
    {
        public string Username { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public string Status { get; set; }
        public Guid RoleId { get; set; }
        public string RoleName { get; set; }
    }
    public class LoginRequest
    {
        [Required(ErrorMessage = "Tài khoản là bắt buộc")]
        public string Username { get; set; }
        [Required(ErrorMessage = "Mật khẩu là bắt buộc")]
        public string Password { get; set; }
    }
    public class UserInfo
    {
        public string Username { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public string RoleName { get; set; }
        public string Status { get; set; }
        public DateTime? LastLogin { get; set; }
    }
    public class PagingRequest
    {
        public string? Search { get; set; }
        public int? Page { get; set; }
        public int? PageSize { get; set; }
    }

    public class Role
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
    }
}
