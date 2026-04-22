using LightInsightAgent.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddHttpClient();

// Configuration
builder.Services.Configure<BackendSettings>(builder.Configuration.GetSection("BackendSettings"));

// Register Metrics Service
builder.Services.AddSingleton<IMetricsService, WindowsMetricsService>();

// Register Background Reporting Service
builder.Services.AddHostedService<MetricsReportingService>();

// Configure to run as Windows Service
builder.Host.UseWindowsService(options =>
{
    options.ServiceName = "LightInsight Monitoring Agent";
});

// Configure Kestrel to listen on port 5050
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5050);
});

var app = builder.Build();

app.UseAuthorization();
app.MapControllers();

app.Run();

using LightInsightAgent.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddHttpClient();

// Configuration
builder.Services.Configure<BackendSettings>(builder.Configuration.GetSection("BackendSettings"));

// Register Metrics Service
builder.Services.AddSingleton<IMetricsService, WindowsMetricsService>();

// Register Background Reporting Service
builder.Services.AddHostedService<MetricsReportingService>();

// Configure to run as Windows Service
builder.Host.UseWindowsService(options =>
{
    options.ServiceName = "LightInsight Monitoring Agent";
});

// Configure Kestrel to listen on port 5050
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5050);
});

var app = builder.Build();

app.UseAuthorization();
app.MapControllers();

app.Run();
