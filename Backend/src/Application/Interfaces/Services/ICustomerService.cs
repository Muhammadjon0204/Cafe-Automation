using Cafe.Application.DTOs.Customers;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface ICustomerService
{
    Task<Result<PagedResult<GetCustomerDto>>> GetAllAsync(CustomerFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<GetCustomerDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<GetCustomerDto>> CreateAsync(CreateCustomerDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetCustomerDto>> UpdateAsync(int id, UpdateCustomerDto dto, CancellationToken cancellationToken = default);

    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
