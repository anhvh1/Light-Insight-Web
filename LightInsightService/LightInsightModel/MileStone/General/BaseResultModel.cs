namespace LightInsightModel.MileStone.General
{
    public class BaseResultModel
    {
        public int Status { get; set; } = -99; // -98 = hết hạn, -99 = không đủ quyền , -1 = lỗi hệ thống, 0 = lỗi validate, 1 = thành công, 2 = đã tồn tại
        public string Message { get; set; }
        public string MessageDetail { get; set; }
        public object Data { get; set; }
        public int TotalRow { get; set; } = 0;
    }
}
