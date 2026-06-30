using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface IDishRepository
{
    Task<List<Dish>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<Dish?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Dish?> GetByIdWithCategoryAsync(int id, CancellationToken cancellationToken = default);

    Task AddAsync(Dish dish, CancellationToken cancellationToken = default);

    void Update(Dish dish);

    void Delete(Dish dish);

    Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> NameExistsAsync(string name, int? excludeId = null, CancellationToken cancellationToken = default);

    Task<bool> IsUsedInOrdersAsync(int dishId, CancellationToken cancellationToken = default);
}
