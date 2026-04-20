using LightInsightBUS.Interfaces.General;
using LightInsightDAL.Repositories.General;
using System;
using System.IO;
using System.Threading.Tasks;

namespace LightInsightBUS.Service.General
{
    public class SystemConfigBUS : ISystemConfig
    {
        private readonly SystemConfigDAL _systemConfigDAL;
        private const string SampleImageConfigKey = "urlimage";

        public SystemConfigBUS(SystemConfigDAL systemConfigDAL)
        {
            _systemConfigDAL = systemConfigDAL;
        }

        public async Task<(string FilePath, string ContentType)> GetSampleImagePhysicalPathAsync()
        {
            try
            {
                // 1. Get relative path from DB
                string relativePath = await _systemConfigDAL.GetConfigValueAsync(SampleImageConfigKey);

                if (string.IsNullOrEmpty(relativePath))
                {
                    return (null, null);
                }

                // 2. Construct physical path
                var webRootPath = AppDomain.CurrentDomain.BaseDirectory;
                var cleanRelativePath = relativePath.TrimStart('/', '\\');
                var physicalPath = Path.Combine(webRootPath, cleanRelativePath);

                // 3. Set content type. Hardcoded to avoid previous dependency issues.
                var contentType = "image/png";
                
                return (physicalPath, contentType);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetSampleImagePhysicalPathAsync: {ex.Message}");
                return (null, null);
            }
        }
    }
}

