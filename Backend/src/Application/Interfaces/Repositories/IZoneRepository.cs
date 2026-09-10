using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface IZoneRepository
{
    Task<List<Zone>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<Zone?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task AddAsync(Zone zone, CancellationToken cancellationToken = default);

    void Update(Zone zone);

    void Delete(Zone zone);

    Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> NameExistsAsync(string name, int? excludeId = null, CancellationToken cancellationToken = default);
}
