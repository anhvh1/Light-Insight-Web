using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace LightInsightModel.General
{
    /// <summary>
    /// Model dùng để lưu (hoặc cập nhật) hàng loạt marker cho một bản đồ cụ thể
    /// </summary>
    public class DMMapSaveMarkersModel
    {
        [Required]
        public Guid MapId { get; set; }

        public List<MarkerItem> Markers { get; set; } = new List<MarkerItem>();
    }

    public class MarkerItem
    {
        [Required]
        public string CameraId { get; set; }
        public string CameraName { get; set; }
        public double? PosX { get; set; } = null;
        public double? PosY { get; set; } = null;
        public string? Icon { get; set; }
        public int VmsId { get; set; }
        public double Rotation { get; set; }
        public int Type { get; set; }
        public Guid Connectorid { get; set; }
        public string IP { get; set; }
        public double? Latitude { get; set; } = null;
        public double? Longitude { get; set; } = null;
        public double? IconScale { get; set; } = null;
        public double? Range { get; set; } = null;
        public double? AngleDegrees { get; set; } = null;
        public double? FovDegrees { get; set; } = null;
    }
}
