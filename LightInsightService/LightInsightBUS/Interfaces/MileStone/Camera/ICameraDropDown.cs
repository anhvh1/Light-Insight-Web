using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LightInsightModel.MileStone.Camera;

namespace LightInsightBUS.Interfaces.MileStone.Camera
{
    public interface ICameraDropDown
    {
        Task<List<CameraDropDown>> GetCameraDropdownAsync(Guid key);
    }
}
