using LightInsightModel.General;
using LightInsightUtiltites;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LightInsightDAL.Repositories.General
{
    public class AuditLogDAL
    {
        public async Task<(List<AuditLogModel>, int)> GetAuditLogs(AuditLogPagingRequest req)
        {
            var result = new List<AuditLogModel>();
            int total = 0;

            using (var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings))
            {
                await conn.OpenAsync();

                // 1. Đếm tổng số dòng (Sử dụng ::text để tránh lỗi 42P08)
                string countSql = "SELECT COUNT(*) FROM public.audit_logs WHERE (@s::text IS NULL OR username ILIKE @s::text OR description ILIKE @s::text)";
                using (var countCmd = new NpgsqlCommand(countSql, conn))
                {
                    countCmd.Parameters.AddWithValue("s", string.IsNullOrEmpty(req.Search) ? (object)DBNull.Value : $"%{req.Search}%");
                    total = Convert.ToInt32(await countCmd.ExecuteScalarAsync());
                }

                // 2. Lấy dữ liệu
                string sql = @"
                    SELECT id, created_at, username, user_role, ip_address, action_type, description, metadata
                    FROM public.audit_logs
                    WHERE (@s::text IS NULL OR username ILIKE @s::text OR description ILIKE @s::text)
                    ORDER BY created_at DESC
                    LIMIT @ps OFFSET @offset";

                using (var cmd = new NpgsqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("s", string.IsNullOrEmpty(req.Search) ? (object)DBNull.Value : $"%{req.Search}%");
                    cmd.Parameters.AddWithValue("ps", req.PageSize);
                    cmd.Parameters.AddWithValue("offset", (req.Page - 1) * req.PageSize);

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            result.Add(new AuditLogModel
                            {
                                Id = reader.GetGuid(0),
                                CreatedAt = reader.GetDateTime(1),
                                Username = reader.GetString(2),
                                UserRole = reader.IsDBNull(3) ? "" : reader.GetString(3),
                                IpAddress = reader.IsDBNull(4) ? "" : reader.GetString(4),
                                ActionType = reader.GetString(5),
                                Description = reader.GetString(6),
                                Metadata = reader.IsDBNull(7) ? "{}" : reader.GetString(7)
                            });
                        }
                    }
                }
            }

            return (result, total);
        }
    }
}
