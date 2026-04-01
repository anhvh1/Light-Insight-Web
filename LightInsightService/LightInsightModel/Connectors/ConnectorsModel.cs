using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LightInsightModel.Connectors
{
    public class ConnectorsModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("name")]
        public string Name { get; set; }

        [MaxLength(20)]
        [Column("status")]
        public string Status { get; set; } = "online";

        [Required]
        [MaxLength(50)]
        [Column("ipserver")]
        public string IpServer { get; set; }

        [Required]
        [Column("port")]
        public long Port { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("username")]
        public string Username { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("password")]
        public string Password { get; set; }

        [Required]
        public int VMSID { get; set; }
    }
}
