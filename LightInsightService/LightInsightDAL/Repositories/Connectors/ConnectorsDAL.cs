using LightInsightUtiltites;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace LightInsightDAL.Repositories.Connectors
{
    public class ConnectorsDAL
    {
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
