using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface ICustomerRepository
{
    Task<List<Customer>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<Customer?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task AddAsync(Customer customer, CancellationToken cancellationToken = default);

    void Update(Customer customer);

    void Delete(Customer customer);

    Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> PhoneExistsAsync(string phone, int? excludeId = null, CancellationToken cancellationToken = default);

    Task<bool> EmailExistsAsync(string email, int? excludeId = null, CancellationToken cancellationToken = default);
}
