using LightInsightModel.MileStone.General;
using LightInsightUtiltites;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightDAL.Repositories.MileStone.General
{
    public class PriorityDAL
    {
        public async Task<List<Priority>> GetPrioritiesAsync()
        {
            var result = new List<Priority>();

            using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            // 🔥 gọi function thay vì query trực tiếp
            string query = @"SELECT * FROM get_priorities()";

            using var cmd = new NpgsqlCommand(query, conn);
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                result.Add(new Priority
                {
                    ID = reader.GetInt32(0),
                    PriorityName = reader.IsDBNull(1) ? null : reader.GetString(1)
                });
            }

            return result;
        }
        public async Task<List<MappingVMSPriority>> GetAllAsync()
        {
            var result = new List<MappingVMSPriority>();

            using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            string query = @"SELECT * FROM get_mapping_vms_priority()";

            using var cmd = new NpgsqlCommand(query, conn);
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                // 🔥 lấy string event
                string events = reader.IsDBNull(3) ? "" : reader.GetString(3);

                var eventList = string.IsNullOrEmpty(events)
                    ? new List<string>()
                    : events.Split(',', StringSplitOptions.RemoveEmptyEntries)
                            .Select(x => x.Trim())
                            .ToList();

                result.Add(new MappingVMSPriority
                {
                    ID = reader.GetInt32(0),
                    PriorityID = reader.GetInt32(1),
                    PriorityName = reader.IsDBNull(2) ? null : reader.GetString(2),
                    AnalyticsEvents = eventList
                });
            }

            return result;
        }
        public async Task<bool> InsertAsync(int priorityId, List<string> eventNames)
        {
            using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            // Gọi hàm với tham số mảng
            string query = @"SELECT public.insert_mapping_vms_priority(@p1, @p2)";

            using var cmd = new NpgsqlCommand(query, conn);
            cmd.Parameters.AddWithValue("p1", priorityId);

            // Truyền trực tiếp List<string>, Npgsql sẽ tự convert sang TEXT[]
            cmd.Parameters.AddWithValue("p2", eventNames);

            try
            {
                var result = (bool)await cmd.ExecuteScalarAsync();
                return result;
            }
            catch (Exception ex)
            {
                // Log lỗi nếu cần
                return false;
            }
        }
        public async Task<bool> UpdateAsync(int id, int priorityId)
        {
            using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            string query = @"SELECT update_mapping_vms_priority(@id, @priorityId)";

            using var cmd = new NpgsqlCommand(query, conn);
            cmd.Parameters.AddWithValue("id", id);
            cmd.Parameters.AddWithValue("priorityId", priorityId);

            var result = await cmd.ExecuteScalarAsync();

            return result != null && (bool)result;
        }
        public async Task<bool> DeleteAsync(int id)
        {
            using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
            await conn.OpenAsync();

            string query = @"SELECT delete_mapping_vms_priority(@id)";

            using var cmd = new NpgsqlCommand(query, conn);
            cmd.Parameters.AddWithValue("id", id);

            var result = await cmd.ExecuteScalarAsync();

            return result != null && (bool)result;
        }
    }
}
