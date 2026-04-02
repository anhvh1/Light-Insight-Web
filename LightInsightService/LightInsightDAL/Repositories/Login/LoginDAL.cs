using LightInsightModel.Login;
using LightInsightUtiltites;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightDAL.Repositories.Login
{
    public class LoginDAL
    {
        public async Task<User> Login(string username, string password)
        {
            using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var hash = PasswordHelper.HashPassword(username, password);

            var cmd = new NpgsqlCommand("SELECT * FROM fn_login_user(@u,@p)", conn);
            cmd.Parameters.AddWithValue("u", username);
            cmd.Parameters.AddWithValue("p", hash);

            using var reader = await cmd.ExecuteReaderAsync();

            if (!reader.Read()) return null;

            return new User
            {
                Username = reader.GetString(0),
                Name = reader.IsDBNull(1) ? null : reader.GetString(1),
                Email = reader.IsDBNull(2) ? null : reader.GetString(2),
                PhoneNumber = reader.IsDBNull(3) ? null : reader.GetString(3),
                RoleId = reader.GetGuid(4),
                Status = reader.IsDBNull(5) ? null : reader.GetString(5),
                RoleName = reader.IsDBNull(6) ? "Operator" : reader.GetString(6)
            };
        }
        public string GenerateToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("LIGHT_JSC_SECRET_KEY_ANHVH_8715693847"));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim("username", user.Username),
                new Claim("name", user.Name ?? ""),
                new Claim("email", user.Email ?? ""),
                new Claim("phone", user.PhoneNumber ?? ""),
                new Claim("roleId", user.RoleId.ToString()),
                new Claim("roleName", user.RoleName ?? "Operator")
            };

            var token = new JwtSecurityToken(
                issuer: "lightjsc",
                audience: "lightjsc",
                claims: claims,
                expires: DateTime.Now.AddHours(1),
                signingCredentials: creds
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
        public async Task<(List<UserInfo>, int)> GetUsers(string? search, int? page, int? pageSize)
        {
            var result = new List<UserInfo>();
            int total = 0;

            // fix NULL + validate
            page = (!page.HasValue || page <= 0) ? 1 : page;
            pageSize = (!pageSize.HasValue || pageSize <= 0) ? 10 : pageSize;

            // limit max (rất nên có)
            if (pageSize > 100) pageSize = 100;

            search = string.IsNullOrWhiteSpace(search) ? null : search;

            using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var cmd = new NpgsqlCommand("SELECT * FROM fn_get_users(@s,@p,@ps)", conn);

            // ❗ set type rõ ràng (tránh lỗi Npgsql)
            cmd.Parameters.Add("s", NpgsqlTypes.NpgsqlDbType.Text)
                .Value = (object?)search ?? DBNull.Value;

            cmd.Parameters.Add("p", NpgsqlTypes.NpgsqlDbType.Integer)
                .Value = page.Value;

            cmd.Parameters.Add("ps", NpgsqlTypes.NpgsqlDbType.Integer)
                .Value = pageSize.Value;

            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                result.Add(new UserInfo
                {
                    Username = reader["username"]?.ToString(),
                    Name = reader["name"]?.ToString(),
                    Email = reader["email"]?.ToString(),
                    PhoneNumber = reader["phone_number"]?.ToString(),
                    RoleName = reader["role_name"]?.ToString(),
                    Status = reader["status"]?.ToString(),
                    // Đổi từ "last_login" thành "latest_login" cho khớp với SQL
                    LastLogin = reader["latest_login"] == DBNull.Value
                                ? null
                                : (DateTime?)reader["latest_login"]
                });

                if (total == 0)
                {
                    total = Convert.ToInt32(reader["total_count"]);
                }
            }

            return (result, total);
        }
    }
}
