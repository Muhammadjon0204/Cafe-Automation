using Cafe.Application.Common.Specifications;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;
using Cafe.Infrastructure.Data;
using Cafe.Infrastructure.Specifications;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class ReservationRepository : IReservationRepository
{
    private readonly AppDbContext _context;

    public ReservationRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<PagedResult<Reservation>> GetAsync(ISpecification<Reservation> spec, CancellationToken cancellationToken = default)
    {
        return SpecificationEvaluator<Reservation>.GetPagedResultAsync(_context.Reservations.AsQueryable(), spec, cancellationToken);
    }

    public Task<Reservation?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Reservations.Include(x => x.CafeTable).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(Reservation reservation, CancellationToken cancellationToken = default)
    {
        await _context.Reservations.AddAsync(reservation, cancellationToken);
    }

    public void Update(Reservation reservation)
    {
        _context.Reservations.Update(reservation);
    }

    public void Delete(Reservation reservation)
    {
        _context.Reservations.Remove(reservation);
    }

    public Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Reservations.AnyAsync(x => x.Id == id, cancellationToken);
    }

    // Buffer between consecutive bookings on the same table, so a new reservation can't be
    // scheduled back-to-back with an existing one (kitchen/turnover time). Kept as a repository-
    // level constant rather than appsettings-driven config: nothing else in the codebase reads it,
    // and there's no IOptions/config plumbing set up yet to justify introducing one for a single
    // value. Revisit if this ever needs to be configurable per cafe/table.
    private const int BufferMinutes = 15;

    // NOTE: no conflict-detection contract existed anywhere before this file (interface method
    // had zero implementations). Overlap rule authored here: a missing ReservedUntil is treated
    // as a zero-length booking at ReservedAt (start == end), and Cancelled/Completed reservations
    // never block. The requested interval is expanded by BufferMinutes on both ends before being
    // checked against existing (unexpanded) reservation intervals, which is equivalent to requiring
    // at least a BufferMinutes gap between any two bookings on the same table. Flagged in the
    // session report for review — this is new business logic, not a port of existing behavior.
    public Task<bool> HasConflictAsync(int tableId, DateTime reservedAt, DateTime? reservedUntil, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        var requestedEnd = reservedUntil ?? reservedAt;
        var bufferedStart = reservedAt.AddMinutes(-BufferMinutes);
        var bufferedEnd = requestedEnd.AddMinutes(BufferMinutes);

        return _context.Reservations.AnyAsync(x =>
            x.CafeTableId == tableId &&
            x.Status != ReservationStatus.Cancelled &&
            x.Status != ReservationStatus.Completed &&
            (!excludeId.HasValue || x.Id != excludeId.Value) &&
            x.ReservedAt < bufferedEnd &&
            (x.ReservedUntil ?? x.ReservedAt) > bufferedStart,
            cancellationToken);
    }
}
