using LightInsightUtiltites;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightDAL.Repositories.MileStone.Camera
{
    public class CameraServiceDAL
    {
        public Dictionary<string, string> LoadCameraUriMap()
        {
            var dict = new Dictionary<string, string>();

            string query = @"
            SELECT d.IDDevice, h.URI
            FROM Devices d
            JOIN Hardware h ON d.IDHardware = h.IDHardware
            WHERE d.DeviceType = 'Camera'";

            using (SqlConnection conn = new SqlConnection(SQLHelper.appConnectionStrings))
            using (SqlCommand cmd = new SqlCommand(query, conn))
            {
                conn.Open();

                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string id = reader["IDDevice"].ToString();
                        string uri = reader["URI"]?.ToString();

                        if (!dict.ContainsKey(id))
                        {
                            dict.Add(id, uri);
                        }
                    }
                }
            }

            return dict;
        }
    }
}
