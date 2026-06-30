using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface IDiscountRepository
{
    Task<Discount?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<List<Discount>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default);

    Task AddAsync(Discount discount, CancellationToken cancellationToken = default);

    void Update(Discount discount);

    void Delete(Discount discount);
}
