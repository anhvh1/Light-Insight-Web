using System;
using System.Threading.Tasks;
using Npgsql;
using System.Text.Json;

namespace LightInsightUtiltites
{
    public static class AuditLogger
    {
        // Delegate để tránh việc Utilities phụ thuộc vào SignalR library
        public static Func<object, Task> OnLogCreated;

        public static void Log(string username, string actionType, string description, object? metadata = null, string? role = null, string? ip = null)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                    await conn.OpenAsync();

                    string sql = @"
                        INSERT INTO public.audit_logs (username, user_role, ip_address, action_type, description, metadata)
                        VALUES (@u, @r, @ip, @at, @d, @m::jsonb)
                        RETURNING id, created_at";

                    using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.AddWithValue("u", username);
                    cmd.Parameters.AddWithValue("r", role ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("ip", ip ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("at", actionType);
                    cmd.Parameters.AddWithValue("d", description);
                    
                    string jsonMetadata = metadata != null ? JsonSerializer.Serialize(metadata) : "{}";
                    cmd.Parameters.AddWithValue("m", jsonMetadata);

                    // Lấy lại ID và Thời gian vừa tạo để gửi qua SignalR
                    using var reader = await cmd.ExecuteReaderAsync();
                    if (await reader.ReadAsync())
                    {
                        var logId = reader.GetGuid(0);
                        var createdAt = reader.GetDateTime(1);

                        // Phát tin qua SignalR (nếu đã được đăng ký)
                        if (OnLogCreated != null)
                        {
                            await OnLogCreated(new {
                                Id = logId,
                                CreatedAt = createdAt,
                                Username = username,
                                UserRole = role,
                                IpAddress = ip,
                                ActionType = actionType,
                                Description = description,
                                Metadata = jsonMetadata
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[AuditLog Error] Failed to write log: {ex.Message}");
                }
            });
        }
    }
}
