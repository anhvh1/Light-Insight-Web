using LightInsightModel.Login;
using LightInsightUtiltites;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightDAL.Repositories.Login
{
    public class RegisterDAL
    {
        public async Task<string> Register(RegisterRequest req)
        {
            using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var hash = PasswordHelper.HashPassword(req.Username, req.Password);

            var cmd = new NpgsqlCommand("SELECT fn_register_user(@u,@p,@n,@e,@ph,@r,@s)", conn);

            cmd.Parameters.AddWithValue("u", req.Username);
            cmd.Parameters.AddWithValue("p", hash);
            cmd.Parameters.AddWithValue("n", req.Name ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("e", req.Email ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("ph", req.PhoneNumber ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("r", req.RoleId);
            cmd.Parameters.AddWithValue("s", req.Status ?? "Active");

            var result = await cmd.ExecuteScalarAsync();

            return result?.ToString() ?? "OK";
        }
        public async Task<bool> CheckUsernameExists(string username)
        {
            using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var cmd = new NpgsqlCommand("SELECT fn_check_username_exists(@u)", conn);
            cmd.Parameters.AddWithValue("u", username);

            var result = await cmd.ExecuteScalarAsync();

            return result != null && (bool)result;
        }
    }
}
