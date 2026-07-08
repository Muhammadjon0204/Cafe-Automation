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
}
