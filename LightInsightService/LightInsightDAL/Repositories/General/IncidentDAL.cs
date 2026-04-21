using LightInsightModel.General;
using LightInsightUtiltites;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LightInsightDAL.Repositories.General
{
    public class IncidentDAL
    {
        public async Task<Guid?> CreateAsync(IncidentCreateModel model)
        {
            await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var sql = "SELECT public.incident_create(@p_priority, @p_source_id, @p_status, @p_type, @p_user_id, @p_sop_id)";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("p_priority", (object?)model.Priority ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_source_id", model.SourceId ?? string.Empty);
            cmd.Parameters.AddWithValue("p_status", (object?)model.Status ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_type", model.Type ?? string.Empty);
            cmd.Parameters.AddWithValue("p_user_id", (object?)model.UserId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_sop_id", (object?)model.SopId ?? DBNull.Value);

            var result = await cmd.ExecuteScalarAsync();
            return result is Guid guid ? guid : null;
        }

        public async Task<bool> UpdateAsync(IncidentUpdateModel model)
        {
            await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var sql = "SELECT public.incident_update(@p_id, @p_priority, @p_source_id, @p_status, @p_type, @p_user_id, @p_sop_id)";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("p_id", model.Id);
            cmd.Parameters.AddWithValue("p_priority", (object?)model.Priority ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_source_id", model.SourceId ?? string.Empty);
            cmd.Parameters.AddWithValue("p_status", (object?)model.Status ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_type", model.Type ?? string.Empty);
            cmd.Parameters.AddWithValue("p_user_id", (object?)model.UserId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_sop_id", (object?)model.SopId ?? DBNull.Value);

            var result = await cmd.ExecuteScalarAsync();
            return result is bool b && b;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var sql = "SELECT public.incident_delete(@p_id)";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("p_id", id);

            var result = await cmd.ExecuteScalarAsync();
            return result is bool b && b;
        }

        public async Task<IncidentDetailModel?> GetByIdAsync(Guid id)
        {
            await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var sql = "SELECT * FROM public.incident_get_by_id(@p_id)";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("p_id", id);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            return new IncidentDetailModel
            {
                Id = reader.GetGuid(0),
                SopId = reader.IsDBNull(1) ? null : reader.GetGuid(1),
                Priority = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                SourceId = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                Status = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                Type = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                UserId = reader.IsDBNull(6) ? null : reader.GetGuid(6),
                CreatedAt = reader.GetDateTime(7),
                UpdatedAt = reader.GetDateTime(8)
            };
        }

        public async Task<(List<IncidentListItemModel> Items, long Total)> GetPagedAsync(string keyword, string status, int limit, int offset)
        {
            var items = new List<IncidentListItemModel>();
            long total = 0;

            await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var sql = "SELECT * FROM public.incident_get_all_paginated(@p_keyword, @p_status, @p_limit, @p_offset)";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("p_keyword", keyword ?? string.Empty);
            cmd.Parameters.AddWithValue("p_status", status ?? string.Empty);
            cmd.Parameters.AddWithValue("p_limit", limit);
            cmd.Parameters.AddWithValue("p_offset", offset);

            await using var reader = await cmd.ExecuteReaderAsync();
            var totalRead = false;
            while (await reader.ReadAsync())
            {
                if (!totalRead)
                {
                    total = reader.GetInt64(0);
                    totalRead = true;
                }

                items.Add(new IncidentListItemModel
                {
                    Id = reader.GetGuid(1),
                    SopId = reader.IsDBNull(2) ? null : reader.GetGuid(2),
                    Priority = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                    SourceId = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                    Status = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                    Type = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                    UserId = reader.IsDBNull(7) ? null : reader.GetGuid(7),
                    CreatedAt = reader.GetDateTime(8),
                    UpdatedAt = reader.GetDateTime(9)
                });
            }

            return (items, total);
        }
    }
}
