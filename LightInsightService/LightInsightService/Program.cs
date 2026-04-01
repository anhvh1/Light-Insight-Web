using System.Net.WebSockets;
using LightInsightBUS.Interfaces;
using LightInsightBUS.Service;
using LightInsightService.Sockets.Milestone.Alarms;
using LightInsightUtiltites;


var builder = WebApplication.CreateBuilder(args);

// 👇 QUAN TRỌNG
//builder.Host.UseWindowsService();

// Config
var port = builder.Configuration.GetValue<int>("ServiceSettings:Port");

// 👇 KHÔNG bind IP cụ thể
builder.WebHost.UseUrls("http://0.0.0.0:5262");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


// ADD SCROPED SERVICES
builder.Services.AddScoped<ICameraService, CameraServiceBUS>();
builder.Services.AddHostedService<MilestoneAlarmSocketWorker>();

// CORS
builder.Services.AddCors(c =>
{
    c.AddPolicy("AllowOrigin", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

var app = builder.Build();

// Validate connection string
var connStr = builder.Configuration.GetValue<string>("ConnectionStrings:DefaultConnection");

if (string.IsNullOrEmpty(connStr))
{
    throw new Exception("Connection string is null!");
}

SQLHelper.appConnectionStrings = connStr;

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseRouting();
app.UseCors("AllowOrigin");


app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();


app.UseWebSockets();
app.Map("/ws-alarms", async context => {
    if (context.WebSockets.IsWebSocketRequest)
    {
        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        string connId = Guid.NewGuid().ToString();

        // Thêm vào danh sách gửi
        MilestoneAlarmSocketWorker.Clients.TryAdd(connId, webSocket);

        // Giữ kết nối mở
        var buffer = new byte[1024];
        while (webSocket.State == WebSocketState.Open)
        {
            await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
        }
        MilestoneAlarmSocketWorker.Clients.TryRemove(connId, out _);
    }
    else
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
    }
});

app.Run();