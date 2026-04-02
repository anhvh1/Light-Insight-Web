using LightInsightModel.General;
using LightInsightUtiltites;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LightInsightDAL.Repositories.General
{
    public class DMMapDAL
    {
        public async Task<List<DMMapModel>> GetAllMapsAsync()
        {
            var list = new List<DMMapModel>();
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT * FROM public.fn_dm_map_get_all()";

                await using var cmd = new NpgsqlCommand(sql, conn);
                await using var reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    list.Add(new DMMapModel
                    {
                        Id = reader.GetGuid(0),
                        Name = reader.GetString(1),
                        Code = reader.GetString(2),
                        ParentId = reader.IsDBNull(3) ? null : reader.GetGuid(3),
                        MapImagePath = reader.IsDBNull(4) ? null : reader.GetString(4),
                        CreatedAt = reader.GetDateTime(5)
                    });
                }
                return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAllMapsAsync: {ex.Message}");
                return list;
            }
        }

        public async Task<Guid?> AddMapAsync(DMMapModel model)
        {
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT public.fn_dm_map_add(@p_name, @p_code, @p_parent_id, @p_map_image_path)";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_name", model.Name);
                cmd.Parameters.AddWithValue("p_code", model.Code);
                cmd.Parameters.AddWithValue("p_parent_id", (object)model.ParentId ?? DBNull.Value);
                cmd.Parameters.AddWithValue("p_map_image_path", (object)model.MapImagePath ?? DBNull.Value);

                var result = await cmd.ExecuteScalarAsync();
                return result is Guid guid ? guid : null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AddMapAsync: {ex.Message}");
                return null;
            }
        }

        public async Task<bool> UpdateMapAsync(DMMapModel model)
        {
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT public.fn_dm_map_update(@p_id, @p_name, @p_code, @p_parent_id, @p_map_image_path)";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_id", model.Id);
                cmd.Parameters.AddWithValue("p_name", model.Name);
                cmd.Parameters.AddWithValue("p_code", model.Code);
                cmd.Parameters.AddWithValue("p_parent_id", (object)model.ParentId ?? DBNull.Value);
                cmd.Parameters.AddWithValue("p_map_image_path", (object)model.MapImagePath ?? DBNull.Value);

                var result = await cmd.ExecuteScalarAsync();
                return result is bool && (bool)result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateMapAsync: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> DeleteMapAsync(Guid id)
        {
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT public.fn_dm_map_delete(@p_id)";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_id", id);

                var result = await cmd.ExecuteScalarAsync();
                return result is bool && (bool)result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DeleteMapAsync: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> UpdateMapImageAsync(Guid id, string path)
        {
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT public.fn_dm_map_update_image(@p_id, @p_map_image_path)";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_id", id);
                cmd.Parameters.AddWithValue("p_map_image_path", path);

                var result = await cmd.ExecuteScalarAsync();
                return result is bool && (bool)result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateMapImageAsync: {ex.Message}");
                return false;
            }
        }
    }
}
