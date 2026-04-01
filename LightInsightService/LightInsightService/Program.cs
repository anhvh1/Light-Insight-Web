using System.Net.WebSockets;
using LightInsightBUS.Interfaces;
using LightInsightBUS.Interfaces.Login;
using LightInsightBUS.Interfaces.MileStone.General;
using LightInsightBUS.Service;
using LightInsightBUS.Service.Login;
using LightInsightBUS.Service.MileStone.General;
using LightInsightService.Sockets.Milestone.Alarms;
using LightInsightUtiltites;
using Microsoft.OpenApi.Models;
using System.Text;
using LightInsightBUS.Interfaces.Connectors;
using LightInsightBUS.Service.Connectors;


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
builder.Services.AddControllersWithViews();

// 👇 KHÔNG bind IP cụ thể
//builder.WebHost.UseUrls("http://0.0.0.0:5262");




// ADD SCROPED SERVICES
builder.Services.AddScoped<ICameraService, CameraServiceBUS>();
builder.Services.AddScoped<IPriority, PriorityBUS>();
builder.Services.AddScoped<IRegister, RegisterBUS>();
builder.Services.AddScoped<ILogin, LoginBUS>();
builder.Services.AddScoped<IConnectors, ConnectorsBUS>();


builder.Services.AddSignalR();

// -------------------- CORS --------------------
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins, policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .WithExposedHeaders("Content-Disposition");
        });
    //options.AddPolicy(name: MyAllowSpecificOrigins, policy =>
    //{
    //    policy.WithOrigins(
    //              "http://localhost:8080",       // Dành cho lúc code dưới local (React thường chạy port 3000)
    //              "http://localhost:5173",       // Dành cho Vite/Vue
    //              "https://ten-mien-cua-ban.com.vn", // Dành cho lúc đẩy lên server thật
    //              "http://192.168.100.120:8080"
    //          )
    //          .AllowAnyMethod()
    //          .AllowAnyHeader()
    //          .AllowCredentials()
    //          .WithExposedHeaders("Content-Disposition");
    //});
});
builder.Services.AddHostedService<MilestoneAlarmSocketWorker>();

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

//if (app.Environment.IsDevelopment())
//{
app.UseSwagger();
app.UseSwaggerUI();
//}
app.UseStaticFiles();
app.UseRouting();
app.UseCors(MyAllowSpecificOrigins);


app.UseAuthentication();
app.UseAuthorization();


app.MapControllers();
app.MapFallbackToFile("/index.html");


app.MapHub<MilestoneAlarmHub>("/alarm-hub");

app.Run();