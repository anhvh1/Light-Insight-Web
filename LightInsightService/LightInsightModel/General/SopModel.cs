using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace LightInsightModel.General
{
    /// <summary>
    /// Trigger gắn với SOP (map tới bảng sop_triggers).
    /// Tên JSON dùng snake_case để khớp với các hàm PL/pgSQL
    /// (trigger_item->>'vms_camera_id', trigger_item->>'event_name').
    /// </summary>
    public class SopTriggerModel
    {
        [JsonPropertyName("vms_camera_id")]
        public string VmsCameraId { get; set; } = string.Empty;

        [JsonPropertyName("event_name")]
        public string EventName { get; set; } = string.Empty;
    }

    /// <summary>
    /// Bước thực thi trong SOP (map tới bảng sop_steps).
    /// </summary>
    public class SopStepModel
    {
        [JsonPropertyName("id")]
        public Guid? Id { get; set; }

        [JsonPropertyName("step_order")]
        public int StepOrder { get; set; }

        [JsonPropertyName("step_name")]
        public string StepName { get; set; } = string.Empty;

        [JsonPropertyName("execution_type")]
        public string ExecutionType { get; set; } = string.Empty;

        [JsonPropertyName("target_device_id")]
        public string? TargetDeviceId { get; set; }

        [JsonPropertyName("action_code")]
        public string ActionCode { get; set; } = string.Empty;

        /// <summary>
        /// Payload động (JSONB). Nhận / trả lại nguyên dạng JSON để FE tự build.
        /// </summary>
        [JsonPropertyName("action_payload")]
        public JsonElement? ActionPayload { get; set; }
    }

    /// <summary>
    /// Request tạo mới SOP (gửi kèm triggers + steps).
    /// </summary>
    public class SopCreateModel
    {
        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public List<SopTriggerModel> Triggers { get; set; } = new List<SopTriggerModel>();

        public List<SopStepModel> Steps { get; set; } = new List<SopStepModel>();
    }

    /// <summary>
    /// Request cập nhật SOP. Triggers / Steps được ghi đè toàn bộ theo function sop_update.
    /// </summary>
    public class SopUpdateModel
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public List<SopTriggerModel> Triggers { get; set; } = new List<SopTriggerModel>();

        public List<SopStepModel> Steps { get; set; } = new List<SopStepModel>();
    }

    /// <summary>
    /// Một dòng trong danh sách SOP (phân trang).
    /// </summary>
    public class SopListItemModel
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Chi tiết SOP trả về từ sop_get_by_id (đã được gom triggers + steps thành JSON).
    /// Dùng snake_case để khớp key JSONB do PostgreSQL trả về.
    /// </summary>
    public class SopDetailModel
    {
        [JsonPropertyName("id")]
        public Guid Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("triggers")]
        public List<SopTriggerModel> Triggers { get; set; } = new List<SopTriggerModel>();

        [JsonPropertyName("steps")]
        public List<SopStepModel> Steps { get; set; } = new List<SopStepModel>();
    }

    /// <summary>
    /// Request phân trang + tìm kiếm danh sách SOP.
    /// </summary>
    public class SopPagingRequest
    {
        public string? Keyword { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
