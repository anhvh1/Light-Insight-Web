using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using LightInsightAgent.Models;

namespace LightInsightAgent.Services
{
    public class BackendSettings
    {
        public string BaseUrl { get; set; } = "";
        public int ReportingIntervalSeconds { get; set; } = 5;
        public bool EnablePush { get; set; } = true;
    }

    public class MetricsReportingService : BackgroundService
    {
        private readonly IMetricsService _metricsService;
        private readonly ILogger<MetricsReportingService> _logger;
        private readonly BackendSettings _settings;
        private readonly HttpClient _httpClient;
        private readonly string _machineName;

        public MetricsReportingService(
            IMetricsService metricsService,
            ILogger<MetricsReportingService> logger,
            IOptions<BackendSettings> settings,
            IHttpClientFactory httpClientFactory)
        {
            _metricsService = metricsService;
            _logger = logger;
            _settings = settings.Value;
            _httpClient = httpClientFactory.CreateClient();
            _machineName = Environment.MachineName;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_settings.EnablePush || string.IsNullOrEmpty(_settings.BaseUrl))
            {
                _logger.LogWarning("Push reporting is disabled or BaseUrl is not configured.");
                return;
            }

            _logger.LogInformation("Metrics Reporting Service started. Target: {Url}", _settings.BaseUrl);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // 1. Collect Metrics
                    var metrics = await _metricsService.GetCurrentMetricsAsync();
                    metrics.ServerId = _machineName; // Identify this machine

                    // 2. Push to Backend
                    string endpoint = $"{_settings.BaseUrl.TrimEnd('/')}/api/SystemHealth/Report";
                    var response = await _httpClient.PostAsJsonAsync(endpoint, metrics, stoppingToken);

                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogDebug("Successfully reported metrics to backend.");
                    }
                    else
                    {
                        _logger.LogWarning("Failed to report metrics. Status: {Status}", response.StatusCode);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while reporting metrics.");
                }

                await Task.Delay(TimeSpan.FromSeconds(_settings.ReportingIntervalSeconds), stoppingToken);
            }
        }
    }
}
