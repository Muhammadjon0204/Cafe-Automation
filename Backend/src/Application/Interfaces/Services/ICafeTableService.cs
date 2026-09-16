using Cafe.Application.DTOs.CafeTables;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface ICafeTableService
{
    Task<Result<PagedResult<GetCafeTableDto>>> GetAllAsync(CafeTableFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<GetCafeTableDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<GetCafeTableDto>> CreateAsync(CreateCafeTableDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetCafeTableDto>> UpdateAsync(int id, UpdateCafeTableDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetCafeTableDto>> UpdateLayoutAsync(int id, UpdateCafeTableLayoutDto dto, CancellationToken cancellationToken = default);

    Task<Result> UpdateStatusAsync(int id, UpdateCafeTableStatusDto dto, CancellationToken cancellationToken = default);

    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<TableAvailabilityDto>> GetAvailabilityAsync(int id, CancellationToken cancellationToken = default);
}
