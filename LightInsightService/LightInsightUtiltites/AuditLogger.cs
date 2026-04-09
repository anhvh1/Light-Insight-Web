using System;
using System.Threading.Tasks;
using Npgsql;
using System.Text.Json;

namespace LightInsightUtiltites
{
    public static class AuditLogger
    {
        /// <summary>
        /// Ghi log hành động vào Database (Chạy ngầm - Task.Run)
        /// </summary>
        public static void Log(string username, string actionType, string description, object? metadata = null, string? role = null, string? ip = null)
        {
            // Chạy trong Task.Run để không làm chậm API chính (Fire and Forget)
            _ = Task.Run(async () =>
            {
                try
                {
                    using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                    await conn.OpenAsync();

                    string sql = @"
                        INSERT INTO public.audit_logs (username, user_role, ip_address, action_type, description, metadata)
                        VALUES (@u, @r, @ip, @at, @d, @m::jsonb)";

                    using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.AddWithValue("u", username);
                    cmd.Parameters.AddWithValue("r", role ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("ip", ip ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("at", actionType);
                    cmd.Parameters.AddWithValue("d", description);
                    
                    string jsonMetadata = metadata != null ? JsonSerializer.Serialize(metadata) : "{}";
                    cmd.Parameters.AddWithValue("m", jsonMetadata);

                    await cmd.ExecuteNonQueryAsync();
                }
                catch (Exception ex)
                {
                    // Nếu ghi log lỗi, in ra console để debug, không làm crash app
                    Console.WriteLine($"[AuditLog Error] Failed to write log: {ex.Message}");
                }
            });
        }
    }
}
