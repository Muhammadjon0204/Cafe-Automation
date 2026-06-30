using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface IOrderItemRepository
{
    Task<OrderItem?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<List<OrderItem>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default);

    Task AddAsync(OrderItem orderItem, CancellationToken cancellationToken = default);

    void Update(OrderItem orderItem);

    void Delete(OrderItem orderItem);
}
