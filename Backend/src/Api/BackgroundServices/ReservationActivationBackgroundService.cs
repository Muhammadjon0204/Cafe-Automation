using Cafe.Application.Common;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Domain.Enums;
using Microsoft.Extensions.Options;

namespace Cafe.Api.BackgroundServices;

// Same IServiceScopeFactory-per-tick pattern as KitchenPromotionBackgroundService. Flips a
// still-Free table to TableStatus.Reserved once its nearest Pending/Confirmed reservation falls
// inside TableAvailabilitySettings.ReservationActivationWindowMinutes - a table is no longer
// marked Reserved the instant a booking is created (that used to block it for the whole day),
// only once the booking is actually close.
//
// Idempotent by construction: GetDueForActivationAsync only matches Free tables, so a table
// already flipped by a previous tick (or manually) simply stops matching.
public class ReservationActivationBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReservationActivationBackgroundService> _logger;
    private readonly TableAvailabilitySettings _settings;

    public ReservationActivationBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<ReservationActivationBackgroundService> logger,
        IOptions<TableAvailabilitySettings> options)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _settings = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(Math.Max(1, _settings.ReservationActivationIntervalSeconds));
        using var timer = new PeriodicTimer(interval);

        do
        {
            await ActivateDueReservationsAsync(stoppingToken);
        }
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task ActivateDueReservationsAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var reservationRepository = scope.ServiceProvider.GetRequiredService<IReservationRepository>();
        var tableRepository = scope.ServiceProvider.GetRequiredService<ICafeTableRepository>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var realtimeNotifier = scope.ServiceProvider.GetRequiredService<IRealtimeNotifier>();

        List<Domain.Entities.Reservation> dueReservations;
        try
        {
            dueReservations = await reservationRepository.GetDueForActivationAsync(
                DateTime.UtcNow, _settings.ReservationActivationWindowMinutes, stoppingToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(exception, "Reservation activation job failed to query due reservations.");
            return;
        }

        var activatedTableIds = new List<int>();
        foreach (var reservation in dueReservations)
        {
            var table = reservation.CafeTable;
            if (table == null || table.Status != TableStatus.Free)
            {
                // Two reservations racing for the same table in one batch, or it moved on
                // between the query and here - only activate once.
                continue;
            }

            table.Status = TableStatus.Reserved;
            table.UpdatedAt = DateTime.UtcNow;
            tableRepository.Update(table);
            activatedTableIds.Add(table.Id);
        }

        if (activatedTableIds.Count == 0)
        {
            return;
        }

        try
        {
            await unitOfWork.SaveChangesAsync(stoppingToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(exception, "Reservation activation job failed to save activated tables.");
            return;
        }

        foreach (var tableId in activatedTableIds)
        {
            try
            {
                await realtimeNotifier.TableChangedAsync(tableId, stoppingToken);
            }
            catch
            {
                // Best-effort broadcast - see OrderService.NotifyOrderChangedAsync for the same reasoning.
            }

            _logger.LogInformation("Reservation activation job marked table {TableId} as Reserved.", tableId);
        }
    }
}
