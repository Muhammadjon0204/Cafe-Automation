using Cafe.Application.DTOs.Tips;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface ITipService
{
    Task<Result<List<GetTipDto>>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default);

    Task<Result<GetTipDto>> AddAsync(AddTipDto dto, CancellationToken cancellationToken = default);

    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
