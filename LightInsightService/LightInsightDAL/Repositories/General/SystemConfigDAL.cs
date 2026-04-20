using LightInsightUtiltites;
using Npgsql;
using System;
using System.Threading.Tasks;

namespace LightInsightDAL.Repositories.General
{
    public class SystemConfigDAL
    {
        // SQLHelper is only used to get the connection string, not for execution.
        // This follows the pattern from other DALs in the project.
        public async Task<string> GetConfigValueAsync(string configKey)
        {
            try
            {
                // Use NpgsqlConnection directly, as seen in other DALs.
                await using var conn = new NpgsqlConnection(SQLHelper.appConnectionStrings);
                await conn.OpenAsync();

                var sql = "SELECT public.fn_get_config_value(@p_configkey)";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("p_configkey", configKey);

                // Use the correct NpgsqlCommand.ExecuteScalarAsync method.
                var result = await cmd.ExecuteScalarAsync();

                return result?.ToString();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetConfigValueAsync: {ex.Message}");
                return null;
            }
        }
    }
}
