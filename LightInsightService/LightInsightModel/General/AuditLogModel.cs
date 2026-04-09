using System;

namespace LightInsightModel.General
{
    public class AuditLogModel
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; }
        
        // WHO: Ai làm?
        public string Username { get; set; }
        public string UserRole { get; set; }
        public string IpAddress { get; set; }
        
        // WHAT: Làm gì?
        public string ActionType { get; set; }
        public string Description { get; set; }
        
        // CONTEXT: Chi tiết (Dạng JSON string để map với JSONB trong DB)
        public string? Metadata { get; set; } 
    }

    public class AuditLogPagingRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
        public string? Search { get; set; }
        public string? ActionType { get; set; }
    }
}
