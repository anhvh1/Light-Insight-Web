using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightBUS.Interfaces
{
    public interface ICameraService
    {
        /// <summary>
        /// Loads a mapping of camera device IDs to their corresponding URIs.
        /// </summary>
        /// <returns>A dictionary where the key is the camera device ID and the value is the URI.</returns>
        Dictionary<string, string> LoadCameraUriMap();
    }
}
