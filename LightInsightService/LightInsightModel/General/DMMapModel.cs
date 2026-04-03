using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
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
        public Guid Id { get; set; }

        [Required]
        [MaxLength(255)]
        [Column("name")]
        public string Name { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("code")]
        public string Code { get; set; }

        [Column("parent_id")]
        public Guid? ParentId { get; set; }

        [Column("map_image_path")]
        public string? MapImagePath { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
