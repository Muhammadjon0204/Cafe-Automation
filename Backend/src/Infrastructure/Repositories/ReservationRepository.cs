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

    // NOTE: no conflict-detection contract existed anywhere before this file (interface method
    // had zero implementations). Overlap rule authored here: a missing ReservedUntil is treated
    // as a zero-length booking at ReservedAt (start == end), and Cancelled/Completed reservations
    // never block. Flagged in the session report for review — this is new business logic, not a
    // port of existing behavior.
    public Task<bool> HasConflictAsync(int tableId, DateTime reservedAt, DateTime? reservedUntil, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        var requestedEnd = reservedUntil ?? reservedAt;

        return _context.Reservations.AnyAsync(x =>
            x.CafeTableId == tableId &&
            x.Status != ReservationStatus.Cancelled &&
            x.Status != ReservationStatus.Completed &&
            (!excludeId.HasValue || x.Id != excludeId.Value) &&
            x.ReservedAt < requestedEnd &&
            (x.ReservedUntil ?? x.ReservedAt) > reservedAt,
            cancellationToken);
    }
}
