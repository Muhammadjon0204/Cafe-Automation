using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Services;

public class TableAvailabilityResult
{
    public bool CanOpenFreely { get; init; }

    public bool RequiresWarning { get; init; }

    public bool IsBlocked { get; init; }

    public Reservation? NearestReservation { get; init; }

    public int? MinutesUntilReservation { get; init; }

    public string? Message { get; init; }
}

// Shared by OrderService.OpenTableAsync (block/warn/force) and GET /api/cafe-tables/{id}/availability
// (same check, exposed for the UI to pre-flight before the user even clicks). Wraps
// IReservationRepository.GetNearestUpcomingActiveAsync with TableAvailabilitySettings.MinFreeWindowMinutes -
// TZ 3.2 explicitly asks that this NOT be a second, separate interval-overlap implementation.
public interface ITableAvailabilityService
{
    Task<TableAvailabilityResult> CheckWalkInAvailabilityAsync(int cafeTableId, DateTime asOfUtc, CancellationToken cancellationToken = default);
}
