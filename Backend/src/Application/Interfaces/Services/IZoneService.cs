using Cafe.Application.DTOs.Zones;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface IZoneService
{
    Task<Result<List<GetZoneDto>>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<Result<GetZoneDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<GetZoneDto>> CreateAsync(CreateZoneDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetZoneDto>> UpdateAsync(int id, UpdateZoneDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetZoneDto>> UpdateBackgroundAsync(int id, UpdateZoneBackgroundDto dto, CancellationToken cancellationToken = default);

    Task<Result> DeleteAsync(int id, bool force, CancellationToken cancellationToken = default);
}
