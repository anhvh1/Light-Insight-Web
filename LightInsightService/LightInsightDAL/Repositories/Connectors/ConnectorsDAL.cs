using LightInsightModel.Connectors;
using LightInsightUtiltites;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightDAL.Repositories.Connectors
{
    public class ConnectorsDAL
    {
        public async Task<bool> DeleteConnectorAsync(Guid id)
        {
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT fn_connector_delete(@p_id)";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_id", id);

                var result = await cmd.ExecuteScalarAsync();
                return result is bool && (bool)result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DeleteConnectorAsync: {ex.Message}");
                return false;
            }
        }

        public async Task<List<ConnectorListModel>> GetAllConnectorsAsync()
        {
            var list = new List<ConnectorListModel>();
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT * FROM fn_connector_get_all()";

                await using var cmd = new NpgsqlCommand(sql, conn);
                await using var reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    list.Add(new ConnectorListModel
                    {
                        Id = reader.GetGuid(0),
                        Name = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                        Status = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                        IpServer = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                        Port = reader.GetInt64(4),
                        Username = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                        Password = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                        VmsName = reader.IsDBNull(7) ? string.Empty : reader.GetString(7),
                        VmsID = reader.GetInt32(8)

                    });
                }
                return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAllConnectorsAsync: {ex.Message}");
                return list;
            }
        }

        public async Task<List<VMSModel>> GetAllVMSAsync()
        {
            var list = new List<VMSModel>();
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT * FROM fn_dm_vms_get_all()";

                await using var cmd = new NpgsqlCommand(sql, conn);
                await using var reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    list.Add(new VMSModel
                    {
                        VmsId = reader.GetInt32(0),
                        VmsName = reader.GetString(1)
                    });
                }
                return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAllVMSAsync: {ex.Message}");
                return list;
            }
        }

        public async Task<bool> UpdateConnectorAsync(Guid id, string name, string ipServer, long port, string username, string password, int VMSID, string status)
        {
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = @"SELECT fn_connector_update(
                            @p_id,
                            @p_name,
                            @p_ipserver,
                            @p_port,
                            @p_username,
                            @p_password,
                            @p_vmsid,
                            @p_status
                        )";

                await using var cmd = new NpgsqlCommand(sql, conn);

                cmd.Parameters.AddWithValue("p_id", id);
                cmd.Parameters.AddWithValue("p_name", name);
                cmd.Parameters.AddWithValue("p_ipserver", ipServer);
                cmd.Parameters.AddWithValue("p_port", port);
                cmd.Parameters.AddWithValue("p_username", username);
                cmd.Parameters.AddWithValue("p_password", password);
                cmd.Parameters.AddWithValue("p_vmsid", VMSID);
                cmd.Parameters.AddWithValue("p_status", status);

                var result = await cmd.ExecuteScalarAsync();
                return result is bool && (bool)result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateConnectorAsync: {ex.Message}");
                return false;
            }
        }

        public async Task<Guid?> AddConnectorAsync(string name, string ipServer, long port,string username, string password, int VMSID, string status = "online")
        {
            try
            {
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = @"SELECT fn_connector_add(
                            @p_name,
                            @p_ipserver,
                            @p_port,
                            @p_username,
                            @p_password,
                            @p_vmsid,
                            @p_status
                        )";

                await using var cmd = new NpgsqlCommand(sql, conn);

                cmd.Parameters.AddWithValue("p_name", name);
                cmd.Parameters.AddWithValue("p_ipserver", ipServer);
                cmd.Parameters.AddWithValue("p_port", port);
                cmd.Parameters.AddWithValue("p_username", username);
                cmd.Parameters.AddWithValue("p_password", password);
                cmd.Parameters.AddWithValue("p_status", status);
                cmd.Parameters.AddWithValue("p_vmsid", VMSID);

                var result = await cmd.ExecuteScalarAsync();

                // 🔥 SAFE CAST
                if (result == null || result == DBNull.Value)
                    return null;

                if (result is Guid guid)
                    return guid;

                // Trường hợp PostgreSQL trả về string
                if (Guid.TryParse(result.ToString(), out Guid parsedGuid))
                    return parsedGuid;

                return null;
            }
            catch (PostgresException ex)
            {
                // lỗi từ PostgreSQL (constraint, function, ...)
                Console.WriteLine($"Postgres error: {ex.MessageText}");
                return null;
            }
            catch (Exception ex)
            {
                // lỗi hệ thống
                Console.WriteLine($"System error: {ex.Message}");
                return null;
            }


        }
    }
}
