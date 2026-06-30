using Cafe.Application.DTOs.Categories;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface ICategoryService
{
    Task<Result<PagedResult<GetCategoryDto>>> GetAllAsync(CategoryFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<GetCategoryDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<GetCategoryDto>> CreateAsync(CreateCategoryDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetCategoryDto>> UpdateAsync(int id, UpdateCategoryDto dto, CancellationToken cancellationToken = default);

    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
