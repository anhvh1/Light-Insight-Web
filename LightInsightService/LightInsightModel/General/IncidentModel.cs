using System;
using System.ComponentModel.DataAnnotations;

namespace LightInsightModel.General
{
    public class IncidentCreateModel
    {
        public string? Priority { get; set; }

        [Required]
        [MaxLength(255)]
        public string SourceId { get; set; } = string.Empty;

        public string? Status { get; set; }

        public Guid? VmsId { get; set; }

        public DateTime? AlarmTime { get; set; }

        public string? Description { get; set; }

        public Guid? UserId { get; set; }

        public Guid? SopId { get; set; }
    }

    public class IncidentUpdateModel : IncidentCreateModel
    {
        [Required]
        public Guid Id { get; set; }
    }

    public class IncidentListItemModel
    {
        public Guid Id { get; set; }
        public Guid? SopId { get; set; }
        public string Priority { get; set; } = string.Empty;
        public string SourceId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public Guid? VmsId { get; set; }
        public string? VmsName { get; set; }
        public DateTime? AlarmTime { get; set; }
        public string? Description { get; set; }
        public Guid? UserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class IncidentDetailModel : IncidentListItemModel
    {
    }

    public class IncidentPagingRequest
    {
        public string? Keyword { get; set; }
        public string? Status { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
