using LightInsightBUS.Interfaces.Connectors;

namespace LightInsightService.CacheLoader
{
    public class CacheLoaderService : IHostedService
    {
        private readonly IServiceProvider _serviceProvider;

        public CacheLoaderService(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var connectors = scope.ServiceProvider.GetRequiredService<IConnectors>();

                await connectors.LoadAllConnectorsToCacheAsync(); // ví dụ
            }
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}
