using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface IPaymentRepository
{
    Task<List<Payment>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<Payment?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<List<Payment>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default);

    Task AddAsync(Payment payment, CancellationToken cancellationToken = default);

    void Update(Payment payment);

    void Delete(Payment payment);

    Task<decimal> GetPaidAmountByOrderIdAsync(int orderId, CancellationToken cancellationToken = default);
}
