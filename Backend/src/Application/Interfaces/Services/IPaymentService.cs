using Cafe.Application.DTOs.Payments;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface IPaymentService
{
    Task<Result<List<GetPaymentDto>>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default);

    Task<Result<GetPaymentDto>> CreateAsync(CreatePaymentDto dto, CancellationToken cancellationToken = default);
}
