using LightInsightModel.General;
using LightInsightUtiltites;
using Npgsql;
using NpgsqlTypes;
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

            var sql = "SELECT public.incident_create(@p_priority, @p_source_id, @p_status, @p_vms_id, @p_alarm_time, @p_description, @p_user_id, @p_sop_id)";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.Add("p_priority", NpgsqlDbType.Varchar).Value = (object?)model.Priority ?? DBNull.Value;
            cmd.Parameters.Add("p_source_id", NpgsqlDbType.Varchar).Value = model.SourceId ?? string.Empty;
            cmd.Parameters.Add("p_status", NpgsqlDbType.Varchar).Value = (object?)model.Status ?? DBNull.Value;
            cmd.Parameters.Add("p_vms_id", NpgsqlDbType.Uuid).Value = (object?)model.VmsId ?? DBNull.Value;
            cmd.Parameters.Add("p_alarm_time", NpgsqlDbType.Timestamp).Value = (object?)model.AlarmTime ?? DBNull.Value;
            cmd.Parameters.Add("p_description", NpgsqlDbType.Text).Value = (object?)model.Description ?? DBNull.Value;
            cmd.Parameters.Add("p_user_id", NpgsqlDbType.Uuid).Value = (object?)model.UserId ?? DBNull.Value;
            cmd.Parameters.Add("p_sop_id", NpgsqlDbType.Uuid).Value = (object?)model.SopId ?? DBNull.Value;

            var result = await cmd.ExecuteScalarAsync();
            return result is Guid guid ? guid : null;
        }

        public async Task<bool> UpdateAsync(IncidentUpdateModel model)
        {
            await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var sql = "SELECT public.incident_update(@p_id, @p_priority, @p_source_id, @p_status, @p_vms_id, @p_alarm_time, @p_description, @p_user_id, @p_sop_id)";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.Add("p_id", NpgsqlDbType.Uuid).Value = model.Id;
            cmd.Parameters.Add("p_priority", NpgsqlDbType.Varchar).Value = (object?)model.Priority ?? DBNull.Value;
            cmd.Parameters.Add("p_source_id", NpgsqlDbType.Varchar).Value = model.SourceId ?? string.Empty;
            cmd.Parameters.Add("p_status", NpgsqlDbType.Varchar).Value = (object?)model.Status ?? DBNull.Value;
            cmd.Parameters.Add("p_vms_id", NpgsqlDbType.Uuid).Value = (object?)model.VmsId ?? DBNull.Value;
            cmd.Parameters.Add("p_alarm_time", NpgsqlDbType.Timestamp).Value = (object?)model.AlarmTime ?? DBNull.Value;
            cmd.Parameters.Add("p_description", NpgsqlDbType.Text).Value = (object?)model.Description ?? DBNull.Value;
            cmd.Parameters.Add("p_user_id", NpgsqlDbType.Uuid).Value = (object?)model.UserId ?? DBNull.Value;
            cmd.Parameters.Add("p_sop_id", NpgsqlDbType.Uuid).Value = (object?)model.SopId ?? DBNull.Value;

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

            var idIdx = reader.GetOrdinal("id");
            var sopIdIdx = reader.GetOrdinal("sop_id");
            var priorityIdx = reader.GetOrdinal("priority");
            var sourceIdIdx = reader.GetOrdinal("source_id");
            var statusIdx = reader.GetOrdinal("status");
            var vmsIdIdx = reader.GetOrdinal("vms_id");
            var vmsNameIdx = reader.GetOrdinal("vms_name");
            var alarmTimeIdx = reader.GetOrdinal("alarm_time");
            var descriptionIdx = reader.GetOrdinal("description");
            var userIdIdx = reader.GetOrdinal("user_id");
            var createdAtIdx = reader.GetOrdinal("created_at");
            var updatedAtIdx = reader.GetOrdinal("updated_at");

            return new IncidentDetailModel
            {
                Id = reader.GetGuid(idIdx),
                SopId = reader.IsDBNull(sopIdIdx) ? null : reader.GetGuid(sopIdIdx),
                Priority = reader.IsDBNull(priorityIdx) ? string.Empty : reader.GetString(priorityIdx),
                SourceId = reader.IsDBNull(sourceIdIdx) ? string.Empty : reader.GetString(sourceIdIdx),
                Status = reader.IsDBNull(statusIdx) ? string.Empty : reader.GetString(statusIdx),
                VmsId = reader.IsDBNull(vmsIdIdx) ? null : reader.GetGuid(vmsIdIdx),
                VmsName = reader.IsDBNull(vmsNameIdx) ? null : reader.GetString(vmsNameIdx),
                AlarmTime = reader.IsDBNull(alarmTimeIdx) ? null : reader.GetDateTime(alarmTimeIdx),
                Description = reader.IsDBNull(descriptionIdx) ? null : reader.GetString(descriptionIdx),
                UserId = reader.IsDBNull(userIdIdx) ? null : reader.GetGuid(userIdIdx),
                CreatedAt = reader.GetDateTime(createdAtIdx),
                UpdatedAt = reader.GetDateTime(updatedAtIdx)
            };
        }

        public async Task<(List<IncidentListItemModel> Items, long Total)> GetPagedAsync(string keyword, string status, int limit, int offset)
        {
            var items = new List<IncidentListItemModel>();
            long total = 0;

            await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            var sql = "SELECT * FROM public.incident_get_all(@p_keyword, @p_status, @p_limit, @p_offset)";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("p_keyword", keyword ?? string.Empty);
            cmd.Parameters.AddWithValue("p_status", status ?? string.Empty);
            cmd.Parameters.AddWithValue("p_limit", limit);
            cmd.Parameters.AddWithValue("p_offset", offset);

            await using var reader = await cmd.ExecuteReaderAsync();
            var totalRecordsIdx = reader.GetOrdinal("total_records");
            var idIdx = reader.GetOrdinal("id");
            var sopIdIdx = reader.GetOrdinal("sop_id");
            var priorityIdx = reader.GetOrdinal("priority");
            var sourceIdIdx = reader.GetOrdinal("source_id");
            var statusIdx = reader.GetOrdinal("status");
            var vmsIdIdx = reader.GetOrdinal("vms_id");
            var vmsNameIdx = reader.GetOrdinal("vms_name");
            var alarmTimeIdx = reader.GetOrdinal("alarm_time");
            var descriptionIdx = reader.GetOrdinal("description");
            var userIdIdx = reader.GetOrdinal("user_id");
            var createdAtIdx = reader.GetOrdinal("created_at");
            var updatedAtIdx = reader.GetOrdinal("updated_at");

            var totalRead = false;
            while (await reader.ReadAsync())
            {
                if (!totalRead)
                {
                    total = reader.GetInt64(totalRecordsIdx);
                    totalRead = true;
                }

                items.Add(new IncidentListItemModel
                {
                    Id = reader.GetGuid(idIdx),
                    SopId = reader.IsDBNull(sopIdIdx) ? null : reader.GetGuid(sopIdIdx),
                    Priority = reader.IsDBNull(priorityIdx) ? string.Empty : reader.GetString(priorityIdx),
                    SourceId = reader.IsDBNull(sourceIdIdx) ? string.Empty : reader.GetString(sourceIdIdx),
                    Status = reader.IsDBNull(statusIdx) ? string.Empty : reader.GetString(statusIdx),
                    VmsId = reader.IsDBNull(vmsIdIdx) ? null : reader.GetGuid(vmsIdIdx),
                    VmsName = reader.IsDBNull(vmsNameIdx) ? null : reader.GetString(vmsNameIdx),
                    AlarmTime = reader.IsDBNull(alarmTimeIdx) ? null : reader.GetDateTime(alarmTimeIdx),
                    Description = reader.IsDBNull(descriptionIdx) ? null : reader.GetString(descriptionIdx),
                    UserId = reader.IsDBNull(userIdIdx) ? null : reader.GetGuid(userIdIdx),
                    CreatedAt = reader.GetDateTime(createdAtIdx),
                    UpdatedAt = reader.GetDateTime(updatedAtIdx)
                });
            }

            return (items, total);
        }
    }
}
