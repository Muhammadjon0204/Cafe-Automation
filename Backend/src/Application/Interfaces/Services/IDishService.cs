using Cafe.Application.DTOs.Dishes;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface IDishService
{
    Task<Result<PagedResult<GetDishDto>>> GetAllAsync(DishFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<GetDishDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<PagedResult<GetDishAdminDto>>> GetAllAdminAsync(DishFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<GetDishAdminDto>> GetByIdAdminAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<GetDishDto>> CreateAsync(CreateDishDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetDishDto>> UpdateAsync(int id, UpdateDishDto dto, CancellationToken cancellationToken = default);

    Task<Result> UpdateAvailabilityAsync(int id, UpdateDishAvailabilityDto dto, CancellationToken cancellationToken = default);

    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
