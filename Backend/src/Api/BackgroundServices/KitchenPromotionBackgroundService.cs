using Cafe.Application.Common;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Microsoft.Extensions.Options;

namespace Cafe.Api.BackgroundServices;

// First BackgroundService in the project - standard IServiceScopeFactory-per-tick pattern
// (everything it resolves is normally request-scoped). Polls for Scheduled pre-orders whose
// SendToKitchenAt has arrived and promotes each one via IOrderService.SendToKitchenAsync -
// the exact same method the manual POST /orders/{id}/send-to-kitchen endpoint calls, so
// there is no duplicated status-transition logic between the two (TZ DoD requirement).
//
// Idempotent by construction: the polling query filters on Status == Scheduled, so an
// order already promoted (by a previous tick, a manual call, or an immediate promotion from
// OrderService itself) simply stops matching - a missed tick or a service restart just
// processes whatever is still due, once each, on the next run.
public class KitchenPromotionBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<KitchenPromotionBackgroundService> _logger;
    private readonly KitchenTimingSettings _settings;

    public KitchenPromotionBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<KitchenPromotionBackgroundService> logger,
        IOptions<KitchenTimingSettings> options)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _settings = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(Math.Max(1, _settings.PromotionIntervalSeconds));
        using var timer = new PeriodicTimer(interval);

        do
        {
            await PromoteDueOrdersAsync(stoppingToken);
        }
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task PromoteDueOrdersAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var orderRepository = scope.ServiceProvider.GetRequiredService<IOrderRepository>();
        var orderService = scope.ServiceProvider.GetRequiredService<IOrderService>();

        List<Domain.Entities.Order> dueOrders;
        try
        {
            dueOrders = await orderRepository.GetDueForKitchenPromotionAsync(DateTime.UtcNow, stoppingToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(exception, "Kitchen promotion job failed to query due orders.");
            return;
        }

        foreach (var order in dueOrders)
        {
            // One bad order must not stop the rest of the batch.
            try
            {
                var result = await orderService.SendToKitchenAsync(order.Id, stoppingToken);
                if (!result.IsSuccess)
                {
                    _logger.LogWarning("Kitchen promotion job could not promote order {OrderId}: {Message}", order.Id, result.Message);
                }
                else
                {
                    _logger.LogInformation("Kitchen promotion job sent order {OrderId} to the kitchen.", order.Id);
                }
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                _logger.LogError(exception, "Kitchen promotion job failed to promote order {OrderId}.", order.Id);
            }
        }
    }
}
