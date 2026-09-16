using Cafe.Application.Common;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Microsoft.Extensions.Options;

namespace Cafe.Application.Services;

public class TableAvailabilityService : ITableAvailabilityService
{
    private readonly IReservationRepository _reservationRepository;
    private readonly TableAvailabilitySettings _settings;

    public TableAvailabilityService(IReservationRepository reservationRepository, IOptions<TableAvailabilitySettings> options)
    {
        _reservationRepository = reservationRepository;
        _settings = options.Value;
    }

    public async Task<TableAvailabilityResult> CheckWalkInAvailabilityAsync(int cafeTableId, DateTime asOfUtc, CancellationToken cancellationToken = default)
    {
        var nearest = await _reservationRepository.GetNearestUpcomingActiveAsync(cafeTableId, asOfUtc, cancellationToken);
        if (nearest == null)
        {
            return new TableAvailabilityResult { CanOpenFreely = true };
        }

        var minutesUntil = Math.Max(0, (int)(nearest.ReservedAt - asOfUtc).TotalMinutes);

        if (minutesUntil < _settings.MinFreeWindowMinutes)
        {
            return new TableAvailabilityResult
            {
                IsBlocked = true,
                NearestReservation = nearest,
                MinutesUntilReservation = minutesUntil,
                Message = $"Table is reserved at {nearest.ReservedAt:HH:mm}; not enough free time before the reservation."
            };
        }

        return new TableAvailabilityResult
        {
            RequiresWarning = true,
            NearestReservation = nearest,
            MinutesUntilReservation = minutesUntil,
            Message = $"Table has a reservation at {nearest.ReservedAt:HH:mm}; free it before then."
        };
    }
}
