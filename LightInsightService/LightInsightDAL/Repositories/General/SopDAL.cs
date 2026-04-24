using LightInsightModel.General;
using LightInsightUtiltites;
using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;

namespace LightInsightDAL.Repositories.General
{
    public sealed class SopTriggerLookupRow
    {
        public Guid SopId { get; set; }
        public Guid ConnectorId { get; set; }
        public Guid CameraId { get; set; }
        public Guid EventId { get; set; }
    }

    public class SopDAL
    {
        private static readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        /// <summary>
        /// Gọi sop_create, trả về Id mới nếu thành công.
        /// Ném PostgresException ra ngoài để BUS map DUPLICATE_SOP_NAME.
        /// </summary>
        public async Task<Guid?> CreateAsync(SopCreateModel model)
        {
            await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var triggersJson = JsonSerializer.Serialize(model.Triggers ?? new List<SopTriggerModel>(), _jsonOptions);
            var stepsJson = JsonSerializer.Serialize(model.Steps ?? new List<SopStepModel>(), _jsonOptions);

            var sql = "SELECT public.sop_create(@p_name, @p_description, @p_triggers::jsonb, @p_steps::jsonb)";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("p_name", model.Name ?? string.Empty);
            cmd.Parameters.AddWithValue("p_description", (object?)model.Description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_triggers", triggersJson);
            cmd.Parameters.AddWithValue("p_steps", stepsJson);

            var result = await cmd.ExecuteScalarAsync();
            return result is Guid guid ? guid : null;
        }

        /// <summary>
        /// Gọi sop_update. Ném PostgresException ra ngoài để BUS map DUPLICATE_SOP_NAME.
        /// </summary>
        public async Task<bool> UpdateAsync(SopUpdateModel model)
        {
            await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var triggersJson = JsonSerializer.Serialize(model.Triggers ?? new List<SopTriggerModel>(), _jsonOptions);
            var stepsJson = JsonSerializer.Serialize(model.Steps ?? new List<SopStepModel>(), _jsonOptions);

            var sql = "SELECT public.sop_update(@p_sop_id, @p_name, @p_description, @p_triggers::jsonb, @p_steps::jsonb)";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("p_sop_id", model.Id);
            cmd.Parameters.AddWithValue("p_name", model.Name ?? string.Empty);
            cmd.Parameters.AddWithValue("p_description", (object?)model.Description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_triggers", triggersJson);
            cmd.Parameters.AddWithValue("p_steps", stepsJson);

            var result = await cmd.ExecuteScalarAsync();
            return result is bool b && b;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT public.sop_delete(@p_sop_id)";
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_sop_id", id);

                var result = await cmd.ExecuteScalarAsync();
                return result is bool b && b;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SopDAL.DeleteAsync: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Gọi sop_get_by_id - trả về chuỗi JSON (JSONB) hoặc null nếu không tìm thấy.
        /// </summary>
        public async Task<string?> GetByIdJsonAsync(Guid id)
        {
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT public.sop_get_by_id(@p_sop_id)::text";
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_sop_id", id);

                var result = await cmd.ExecuteScalarAsync();
                if (result == null || result == DBNull.Value) return null;
                return result.ToString();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SopDAL.GetByIdJsonAsync: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Gọi sop_get_all_paginated. Cột total_records (COUNT(*) OVER()) giống nhau trên
        /// mọi dòng, chỉ cần lấy 1 lần.
        /// </summary>
        public async Task<(List<SopListItemModel> Items, long Total)> GetPagedAsync(string keyword, int limit, int offset)
        {
            var items = new List<SopListItemModel>();
            long total = 0;

            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT * FROM public.sop_get_all_paginated(@p_keyword, @p_limit, @p_offset)";
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_keyword", keyword ?? string.Empty);
                cmd.Parameters.AddWithValue("p_limit", limit);
                cmd.Parameters.AddWithValue("p_offset", offset);

                await using var reader = await cmd.ExecuteReaderAsync();
                bool totalRead = false;
                while (await reader.ReadAsync())
                {
                    if (!totalRead)
                    {
                        total = reader.GetInt64(0);
                        totalRead = true;
                    }

                    items.Add(new SopListItemModel
                    {
                        Id = reader.GetGuid(1),
                        Name = reader.GetString(2),
                        Description = reader.IsDBNull(3) ? null : reader.GetString(3),
                        CreatedAt = reader.GetDateTime(4)
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SopDAL.GetPagedAsync: {ex.Message}");
            }

            return (items, total);
        }

        public async Task<List<SopTriggerLookupRow>> GetAllTriggersAsync()
        {
            var rows = new List<SopTriggerLookupRow>();
            await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var sql = "SELECT sop_id, connector_id, camera_id, event_id FROM public.sop_triggers";
            await using var cmd = new NpgsqlCommand(sql, conn);
            await using var reader = await cmd.ExecuteReaderAsync();

            var sopIdIdx = reader.GetOrdinal("sop_id");
            var connectorIdIdx = reader.GetOrdinal("connector_id");
            var cameraIdIdx = reader.GetOrdinal("camera_id");
            var eventIdIdx = reader.GetOrdinal("event_id");

            while (await reader.ReadAsync())
            {
                if (reader.IsDBNull(sopIdIdx) || reader.IsDBNull(connectorIdIdx) || reader.IsDBNull(cameraIdIdx) || reader.IsDBNull(eventIdIdx))
                {
                    continue;
                }

                rows.Add(new SopTriggerLookupRow
                {
                    SopId = reader.GetGuid(sopIdIdx),
                    ConnectorId = reader.GetGuid(connectorIdIdx),
                    CameraId = reader.GetGuid(cameraIdIdx),
                    EventId = reader.GetGuid(eventIdIdx)
                });
            }

            return rows;
        }
    }
}
