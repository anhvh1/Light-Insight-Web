using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightModel.General
{
    [Table("dm_map_marker", Schema = "public")]
    public class DMMapMarkerModel
    {
        [Key]
        [Column("id")]
        [JsonPropertyName("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("map_id")]
        [JsonPropertyName("mapId")]
        public Guid MapId { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("camera_id")]
        [JsonPropertyName("cameraId")]
        public string CameraId { get; set; }

        [Required]
        [MaxLength(255)]
        [Column("camera_name")]
        [JsonPropertyName("cameraName")]
        public string CameraName { get; set; }

        [Required]
        [Column("pos_x")]
        [JsonPropertyName("posX")]
        public double PosX { get; set; }

        [Required]
        [Column("pos_y")]
        [JsonPropertyName("posY")]
        public double PosY { get; set; }

        [Required]
        [Column("rotation")]
        [JsonPropertyName("rotation")]
        public double Rotation { get; set; }

        [MaxLength(100)]
        [Column("icon")]
        [JsonPropertyName("icon")]
        public string? Icon { get; set; }

        [Column("created_at")]
        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Required]
        [Column("vmsid")]
        [JsonPropertyName("vmsId")]
        public int VmsID { get; set; }

        [Column("type")]
        [JsonPropertyName("type")]
        public int? Type { get; set; }

        [Column("connectorid")]
        [JsonPropertyName("connectorId")]
        public Guid? Connectorid { get; set; }

        [Column("ip")]
        [JsonPropertyName("ip")]
        public string? IP { get; set; }

        [Column("latitude")]
        [JsonPropertyName("latitude")]
        public double? Latitude { get; set; }

        [Column("longitude")]
        [JsonPropertyName("longitude")]
        public double? Longitude { get; set; }

        [Column("iconscale")]
        [JsonPropertyName("iconScale")]
        public double? IconScale { get; set; }

        [Column("range")]
        [JsonPropertyName("range")]
        public double? Range { get; set; }

        [Column("angledegrees")]
        [JsonPropertyName("angleDegrees")]
        public double? AngleDegrees { get; set; }

        [Column("fovdegrees")]
        [JsonPropertyName("fovDegrees")]
        public double? FovDegrees { get; set; }
    }
}
