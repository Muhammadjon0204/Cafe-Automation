using Cafe.Application.Common.Specifications;
using Cafe.Application.Results;
using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface IReservationRepository
{
    Task<PagedResult<Reservation>> GetAsync(ISpecification<Reservation> spec, CancellationToken cancellationToken = default);

    Task<Reservation?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task AddAsync(Reservation reservation, CancellationToken cancellationToken = default);

    void Update(Reservation reservation);

    void Delete(Reservation reservation);

    Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> HasConflictAsync(int tableId, DateTime reservedAt, DateTime? reservedUntil, int? excludeId = null, CancellationToken cancellationToken = default);

    // Distinct from HasConflictAsync: that answers "does a NEW reservation's interval overlap
    // an existing one" (reservation-vs-reservation, with the 15-minute buffer). This answers
    // "how soon is the next active booking on this table", for TableAvailabilityService's
    // walk-in-vs-reservation check (TZ 3.2) - no interval math to duplicate, just nearest-first.
    Task<Reservation?> GetNearestUpcomingActiveAsync(int cafeTableId, DateTime asOfUtc, CancellationToken cancellationToken = default);

    // Pending/Confirmed reservations on a still-Free table whose ReservedAt falls inside the
    // activation window - polled by ReservationActivationBackgroundService to flip the table to
    // TableStatus.Reserved. Only Free tables match: an already-Occupied/Cleaning/Disabled table
    // has nothing to activate, and an already-Reserved one is a no-op the caller can skip.
    Task<List<Reservation>> GetDueForActivationAsync(DateTime asOfUtc, int windowMinutes, CancellationToken cancellationToken = default);

    // Batched form of GetNearestUpcomingActiveAsync for the waiter table board (one query for
    // all tables instead of one per table) - at most one reservation per table id, the soonest
    // active one.
    Task<List<Reservation>> GetNearestUpcomingActiveForTablesAsync(IEnumerable<int> cafeTableIds, DateTime asOfUtc, CancellationToken cancellationToken = default);
}
