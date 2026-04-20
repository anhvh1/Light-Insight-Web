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

                var sql = "SELECT id, name, code, parent_id, map_image_path, type, geocenterlatitude, geocenterlongitude, geozoom, created_at FROM public.dm_map ORDER BY created_at DESC";


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
                        Type = reader.IsDBNull(5) ? null : reader.GetString(5),
                        GeoCenterLatitude = reader.IsDBNull(6) ? 0 : reader.GetDouble(6),
                        GeoCenterLongitude = reader.IsDBNull(7) ? 0 : reader.GetDouble(7),
                        GeoZoom = reader.IsDBNull(8) ? 0 : reader.GetDouble(8),
                        CreatedAt = reader.GetDateTime(9)
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

        public async Task<DMMapModel?> GetMapByIdAsync(Guid id)
        {
            try
            {
                DMMapModel? map = null;
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT id, name, code, parent_id, map_image_path, type, geocenterlatitude, geocenterlongitude, geozoom, created_at FROM public.dm_map WHERE id = @p_id";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_id", id);
                await using var reader = await cmd.ExecuteReaderAsync();

                if (await reader.ReadAsync())
                {
                    map = new DMMapModel
                    {
                        Id = reader.GetGuid(0),
                        Name = reader.GetString(1),
                        Code = reader.GetString(2),
                        ParentId = reader.IsDBNull(3) ? null : reader.GetGuid(3),
                        MapImagePath = reader.IsDBNull(4) ? null : reader.GetString(4),
                        Type = reader.IsDBNull(5) ? null : reader.GetString(5),
                        GeoCenterLatitude = reader.IsDBNull(6) ? 0 : reader.GetDouble(6),
                        GeoCenterLongitude = reader.IsDBNull(7) ? 0 : reader.GetDouble(7),
                        GeoZoom = reader.IsDBNull(8) ? 0 : reader.GetDouble(8),
                        CreatedAt = reader.GetDateTime(9)
                    };
                }

                if (map != null)
                {
                    map.Markers = await GetMarkersByMapIdAsync(id);
                }

                return map;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMapByIdAsync: {ex.Message}");
                return null;
            }
        }

        public async Task<Guid?> AddMapAsync(DMMapModel model)
        {
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT public.fn_dm_map_add(@p_name, @p_code, @p_parent_id, @p_map_image_path, @p_type, @p_lat, @p_lng, @p_zoom)";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_name", model.Name);
                cmd.Parameters.AddWithValue("p_code", model.Code);
                cmd.Parameters.AddWithValue("p_parent_id", (object)model.ParentId ?? DBNull.Value);
                cmd.Parameters.AddWithValue("p_map_image_path", (object)model.MapImagePath ?? DBNull.Value);
                cmd.Parameters.AddWithValue("p_type", (object)model.Type ?? DBNull.Value);
                cmd.Parameters.AddWithValue("p_lat", model.GeoCenterLatitude);
                cmd.Parameters.AddWithValue("p_lng", model.GeoCenterLongitude);
                cmd.Parameters.AddWithValue("p_zoom", model.GeoZoom);

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

                var sql = "SELECT public.fn_dm_map_update(@p_id, @p_name, @p_code, @p_parent_id, @p_map_image_path, @p_type, @p_lat, @p_lng, @p_zoom)";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_id", model.Id);
                cmd.Parameters.AddWithValue("p_name", model.Name);
                cmd.Parameters.AddWithValue("p_code", model.Code);
                cmd.Parameters.AddWithValue("p_parent_id", (object)model.ParentId ?? DBNull.Value);
                cmd.Parameters.AddWithValue("p_map_image_path", (object)model.MapImagePath ?? DBNull.Value);
                cmd.Parameters.AddWithValue("p_type", (object)model.Type ?? DBNull.Value);
                cmd.Parameters.AddWithValue("p_lat", model.GeoCenterLatitude);
                cmd.Parameters.AddWithValue("p_lng", model.GeoCenterLongitude);
                cmd.Parameters.AddWithValue("p_zoom", model.GeoZoom);

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
                cmd.Parameters.AddWithValue("p_map_image_path", (object)path ?? DBNull.Value);

                var result = await cmd.ExecuteScalarAsync();
                return result is bool && (bool)result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateMapImageAsync: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> ReplaceMarkersAsync(Guid mapId, string markersJson)
        {
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT public.fn_dm_map_marker_replace(@p_map_id, @p_markers::jsonb)";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_map_id", mapId);
                cmd.Parameters.AddWithValue("p_markers", markersJson);

                var result = await cmd.ExecuteScalarAsync();
                return result is bool && (bool)result;
            }
            catch (PostgresException ex)
            {
                Console.WriteLine($"Postgres Error: {ex.MessageText}");
                Console.WriteLine($"Detail: {ex.Detail}");
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"General Error: {ex.Message}");
                return false;
            }
        }

        public async Task<List<DMMapMarkerModel>> GetMarkersByMapIdAsync(Guid mapId)
        {
            var list = new List<DMMapMarkerModel>();
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT id, map_id, camera_id, camera_name, pos_x, pos_y, icon, created_at, vmsid, rotation, type, connectorid, ip, latitude, longitude, iconscale, range, angledegrees, fovdegrees FROM public.dm_map_marker WHERE map_id = @p_map_id";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_map_id", mapId);

                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    list.Add(new DMMapMarkerModel
                    {
                        Id = reader.GetGuid(0),
                        MapId = reader.GetGuid(1),
                        CameraId = reader.GetString(2),
                        CameraName = reader.GetString(3),
                        PosX = reader.GetDouble(4),
                        PosY = reader.GetDouble(5),
                        Icon = reader.IsDBNull(6) ? null : reader.GetString(6),
                        CreatedAt = reader.GetDateTime(7),
                        VmsID = reader.GetInt32(8),
                        Rotation = reader.GetDouble(9),
                        Type = reader.IsDBNull(10) ? 0 : reader.GetInt32(10),
                        Connectorid = reader.IsDBNull(11) ? (Guid?)null : reader.GetGuid(11),
                        IP = reader.IsDBNull(12) ? null : reader.GetString(12),
                        Latitude = reader.IsDBNull(13) ? null : (double?)reader.GetDouble(13),
                        Longitude = reader.IsDBNull(14) ? null : (double?)reader.GetDouble(14),
                        IconScale = reader.IsDBNull(15) ? null : (double?)reader.GetDouble(15),
                        Range = reader.IsDBNull(16) ? null : (double?)reader.GetDouble(16),
                        AngleDegrees = reader.IsDBNull(17) ? null : (double?)reader.GetDouble(17),
                        FovDegrees = reader.IsDBNull(18) ? null : (double?)reader.GetDouble(18),
                    });
                }
                return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMarkersByMapIdAsync: {ex.Message}");
                return list;
            }
        }

        public async Task<List<DMMapMarkerStatisticModel>> StatisticMarkerByTypeAsync(Guid mapId)
        {
            var list = new List<DMMapMarkerStatisticModel>();
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT * FROM public.fn_statistic_marker_by_type(@p_map_id)";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_map_id", mapId);

                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    list.Add(new DMMapMarkerStatisticModel
                    {
                        MarkerType = reader.GetInt32(0),
                        TotalCount = reader.GetInt64(1)
                    });
                }
                return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in StatisticMarkerByTypeAsync: {ex.Message}");
                return list;
            }
        }

        public async Task<List<DMMapMarkerModel>> GetAllMarkersWithIpAsync()
        {
            var list = new List<DMMapMarkerModel>();
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT id, map_id, camera_id, camera_name, pos_x, pos_y, icon, created_at, vmsid, rotation, type, connectorid, ip, latitude, longitude, iconscale, range, angledegrees, fovdegrees FROM public.dm_map_marker WHERE ip IS NOT NULL AND ip <> ''";

                await using var cmd = new NpgsqlCommand(sql, conn);
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    list.Add(new DMMapMarkerModel
                    {
                        Id = reader.GetGuid(0),
                        MapId = reader.GetGuid(1),
                        CameraId = reader.GetString(2),
                        CameraName = reader.GetString(3),
                        PosX = reader.GetDouble(4),
                        PosY = reader.GetDouble(5),
                        Icon = reader.IsDBNull(6) ? null : reader.GetString(6),
                        CreatedAt = reader.GetDateTime(7),
                        VmsID = reader.GetInt32(8),
                        Rotation = reader.GetDouble(9),
                        Type = reader.IsDBNull(10) ? 0 : reader.GetInt32(10),
                        Connectorid = reader.IsDBNull(11) ? (Guid?)null : reader.GetGuid(11),
                        IP = reader.IsDBNull(12) ? null : reader.GetString(12),
                        Latitude = reader.IsDBNull(13) ? null : (double?)reader.GetDouble(13),
                        Longitude = reader.IsDBNull(14) ? null : (double?)reader.GetDouble(14),
                        IconScale = reader.IsDBNull(15) ? null : (double?)reader.GetDouble(15),
                        Range = reader.IsDBNull(16) ? null : (double?)reader.GetDouble(16),
                        AngleDegrees = reader.IsDBNull(17) ? null : (double?)reader.GetDouble(17),
                        FovDegrees = reader.IsDBNull(18) ? null : (double?)reader.GetDouble(18),
                    });
                }
                return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAllMarkersWithIpAsync: {ex.Message}");
                return list;
            }
        }
    }
}
