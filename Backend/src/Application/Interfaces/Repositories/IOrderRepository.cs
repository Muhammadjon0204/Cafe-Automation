using Cafe.Application.Common.Specifications;
using Cafe.Application.Results;
using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface IOrderRepository
{
    Task<PagedResult<Order>> GetAsync(ISpecification<Order> spec, CancellationToken cancellationToken = default);

    Task<Order?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Order?> GetByIdWithDetailsAsync(int id, CancellationToken cancellationToken = default);

    Task AddAsync(Order order, CancellationToken cancellationToken = default);

    void Update(Order order);

    void Delete(Order order);

    Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> OrderNumberExistsAsync(string orderNumber, CancellationToken cancellationToken = default);
}
