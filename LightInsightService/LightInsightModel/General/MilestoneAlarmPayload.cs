namespace LightInsightModel.General
{
    public class MilestoneAlarmPayload
    {
        public string? alarmId { get; set; }
        public string? alarmName { get; set; }
        public string? type { get; set; }
        public string? source { get; set; }
        public string? location { get; set; }
        public string? message { get; set; }
        public string? time { get; set; }
        public string? stateName { get; set; }
        public int? stateLevel { get; set; }
        public string? priorityName { get; set; }
        public int? priorityLevel { get; set; }
        public string? cameraid { get; set; }
        public string? connectorName { get; set; }
        public string? ipadress { get; set; }
    }
}
