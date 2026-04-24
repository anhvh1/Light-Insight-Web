using System.Net.WebSockets;
using LightInsightBUS.Interfaces;
using LightInsightBUS.Interfaces.Login;
using LightInsightBUS.Interfaces.MileStone.General;
using LightInsightBUS.Service;
using LightInsightBUS.Service.Login;
using LightInsightBUS.Service.MileStone.General;
using LightInsightBUS.Service.MileStone.Alarm;
using LightInsightService.Sockets.Milestone.Alarms;
using LightInsightUtiltites;
using Microsoft.OpenApi.Models;
using System.Text;
using LightInsightBUS.Interfaces.Connectors;
using LightInsightBUS.Service.Connectors;
using LightInsightBUS.Interfaces.MileStone.Alarm;
using LightInsightBUS.Interfaces.General;
using LightInsightBUS.Service.General;
using LightInsightService.CacheLoader;
using LightInsightBUS.Interfaces.MileStone.Camera;
using LightInsightBUS.Service.MileStone.Camera;
using LightInsightBUS.ExternalServices.MileStone;
using Microsoft.AspNetCore.SignalR;


var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = "Client"
});


// 👇 QUAN TRỌNG
//builder.Host.UseWindowsService();

// -------------------- Controllers / Formatters --------------------
builder.Services
    .AddControllers(options =>
    {
        options.RespectBrowserAcceptHeader = true;
    })
    .AddXmlSerializerFormatters()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });
//builder.Services.AddControllersWithViews();

// 👇 KHÔNG bind IP cụ thể
//builder.WebHost.UseUrls("http://0.0.0.0:8386");




// ADD SCROPED SERVICES
builder.Services.AddMemoryCache();
builder.Services.AddScoped<ICameraService, CameraServiceBUS>();
builder.Services.AddScoped<ICameraDropDown, CameraDropdownBUS>();
builder.Services.AddScoped<IPriority, PriorityBUS>();
builder.Services.AddScoped<IRegister, RegisterBUS>();
builder.Services.AddScoped<ILogin, LoginBUS>();
builder.Services.AddScoped<IConnectors, ConnectorsBUS>();
builder.Services.AddScoped<IDMMap, DMMapBUS>();
builder.Services.AddScoped<ISop, SopBUS>();
builder.Services.AddScoped<IIncident, IncidentBUS>();
builder.Services.AddScoped<IAutoIncidentFromAlarm, AutoIncidentFromAlarmBUS>();
builder.Services.AddScoped<ISystemHealth, SystemHealthBUS>();
builder.Services.AddScoped<IAuditLog, AuditLogBUS>();
builder.Services.AddScoped<IToken, TokenBUS>();
builder.Services.AddScoped<GetAnalyticsEvents>();
builder.Services.AddScoped<MilestoneSystemProber>();
builder.Services.AddScoped<LightInsightDAL.Repositories.General.SystemConfigDAL>();
builder.Services.AddScoped<ISystemConfig, SystemConfigBUS>();
builder.Services.AddSingleton<ICameraStatusService, CameraStatusService>();
builder.Services.AddHostedService<CameraMonitoringWorker>();
builder.Services.AddScoped<LightInsightBUS.Service.HealthProviders.Milestone.MilestoneHealthBUS>();


builder.Services.AddSignalR().AddJsonProtocol(options => {
    options.PayloadSerializerOptions.PropertyNamingPolicy = null;
});
builder.Services.AddScoped<IAlarmService, AlarmServiceBUS>();

// -------------------- CORS --------------------
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins, policy =>
        {
            policy.SetIsOriginAllowed(origin => true)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials()
                  .WithExposedHeaders("Content-Disposition");
        });
});
builder.Services.AddHostedService<MilestoneAlarmSocketWorker>();
builder.Services.AddHostedService<CacheLoaderService>();
builder.Services.AddHostedService<LightInsightService.Sockets.Milestone.Health.MilestoneHealthSocketWorker>();

// -------------------- Swagger --------------------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Version = "v1",
        Title = "LightJSC API - created by AnhVH",
        Description = "ASP.NET Web API",
        TermsOfService = new Uri("https://gosol.com.vn"),
        Contact = new OpenApiContact { Name = "Contact", Url = new Uri("https://gosol.com.vn") },
        License = new OpenApiLicense { Name = "License", Url = new Uri("https://gosol.com.vn") }
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter a valid token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
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

// Kết nối AuditLogger với SignalR Hub
var hubContext = app.Services.GetRequiredService<Microsoft.AspNetCore.SignalR.IHubContext<LightInsightService.Sockets.General.AuditLogHub>>();
AuditLogger.OnLogCreated = async (log) =>
{
    await hubContext.Clients.All.SendAsync("ReceiveAuditLog", log);
};

// Kết nối CameraStatusService với SignalR Hub
var cameraStatusHubContext = app.Services.GetRequiredService<Microsoft.AspNetCore.SignalR.IHubContext<LightInsightService.Sockets.General.CameraStatusHub>>();
var cameraStatusService = app.Services.GetRequiredService<ICameraStatusService>();
cameraStatusService.OnStatusChanged += async (status) =>
{
    await cameraStatusHubContext.Clients.All.SendAsync("CameraStatusChanged", status);
};

// Nạp dữ liệu vào Cache khi khởi động

//if (app.Environment.IsDevelopment())
//{
app.UseSwagger();
app.UseSwaggerUI();
//}
app.UseStaticFiles();

// Thêm cấu hình phục vụ thư mục Upload
string uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "Upload");
if (!Directory.Exists(uploadPath))
{
    Directory.CreateDirectory(uploadPath);
}
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadPath),
    RequestPath = "/Upload"
});

app.UseRouting();
app.UseCors(MyAllowSpecificOrigins);


app.UseAuthentication();
app.UseAuthorization();


app.MapControllers();
app.MapFallbackToFile("/index.html");


app.MapHub<MilestoneAlarmHub>("/alarm-hub");
app.MapHub<LightInsightService.Sockets.General.AuditLogHub>("/audit-log-hub");
app.MapHub<LightInsightService.Sockets.General.CameraStatusHub>("/camera-status-hub");

app.Run();