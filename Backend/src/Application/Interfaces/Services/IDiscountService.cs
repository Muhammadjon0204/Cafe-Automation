using Cafe.Application.DTOs.Discounts;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface IDiscountService
{
    Task<Result<List<GetDiscountDto>>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default);

    Task<Result<GetDiscountDto>> ApplyAsync(ApplyDiscountDto dto, CancellationToken cancellationToken = default);

    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
