using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
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
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("map_id")]
        public Guid MapId { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("camera_id")]
        public string CameraId { get; set; }

        [Required]
        [MaxLength(255)]
        [Column("camera_name")]
        public string CameraName { get; set; }

        [Required]
        [Column("pos_x")]
        public double PosX { get; set; }

        [Required]
        [Column("pos_y")]
        public double PosY { get; set; }
        [Required]
        [Column("rotation")]
        public double Rotation { get; set; }

        [MaxLength(100)]
        [Column("icon")]
        public string? Icon { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        [Required]
        [Column("vmsid")]
        public int VmsID { get; set; }
        [Column("type")]
        public int? Type { get; set; }
        [Column("connectorid")]
        public Guid? Connectorid { get; set; }

        [Column("ip")]
        public string? IP { get; set; }

    }
}
