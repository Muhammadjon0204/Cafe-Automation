using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface ICafeTableRepository
{
    Task<List<CafeTable>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<CafeTable?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task AddAsync(CafeTable table, CancellationToken cancellationToken = default);

    void Update(CafeTable table);

    void Delete(CafeTable table);

    Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> TableNumberExistsAsync(int tableNumber, int? excludeId = null, CancellationToken cancellationToken = default);
}
