using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface ITipRepository
{
    Task<Tip?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<List<Tip>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default);

    Task AddAsync(Tip tip, CancellationToken cancellationToken = default);

    void Update(Tip tip);

    void Delete(Tip tip);
}
