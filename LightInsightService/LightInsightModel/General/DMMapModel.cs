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
    [Table("dm_map", Schema = "public")]
    public class DMMapModel
    {
        [Key]
        [Column("id")]
        [JsonPropertyName("id")]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(255)]
        [Column("name")]
        [JsonPropertyName("name")]
        public string Name { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("code")]
        [JsonPropertyName("code")]
        public string Code { get; set; }

        [Column("parent_id")]
        [JsonPropertyName("parentId")]
        public Guid? ParentId { get; set; }

        [Column("map_image_path")]
        [JsonPropertyName("mapImagePath")]
        public string? MapImagePath { get; set; }

        [Column("type")]
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [Column("geocenterlatitude")]
        [JsonPropertyName("geoCenterLatitude")]
        public double GeoCenterLatitude { get; set; }

        [Column("geocenterlongitude")]
        [JsonPropertyName("geoCenterLongitude")]
        public double GeoCenterLongitude { get; set; }

        [Column("geozoom")]
        [JsonPropertyName("geoZoom")]
        public double GeoZoom { get; set; }

        [Column("created_at")]
        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [NotMapped]
        [JsonPropertyName("markers")]
        public List<DMMapMarkerModel>? Markers { get; set; } = new List<DMMapMarkerModel>();
    }
}
