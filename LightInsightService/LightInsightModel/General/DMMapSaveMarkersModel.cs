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

        [Required]
        public string CameraName { get; set; }

        [Required]
        public double PosX { get; set; }

        [Required]
        public double PosY { get; set; }

        public string? Icon { get; set; }
    }
}
