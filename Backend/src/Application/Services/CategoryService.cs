using Cafe.Application.Common;
using Cafe.Application.DTOs.Categories;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Domain.Entities;

namespace Cafe.Application.Services;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CategoryService(ICategoryRepository categoryRepository, IUnitOfWork unitOfWork)
    {
        _categoryRepository = categoryRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<PagedResult<GetCategoryDto>>> GetAllAsync(CategoryFilterDto filter, CancellationToken cancellationToken = default)
    {
        var categories = await _categoryRepository.GetAllAsync(cancellationToken);
        var query = categories.Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim();
            query = query.Where(x =>
                x.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (x.Description != null && x.Description.Contains(search, StringComparison.OrdinalIgnoreCase)));
        }

        if (filter.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == filter.IsActive.Value);
        }

        var result = PaginationHelper.CreatePagedResult(
            query.OrderBy(x => x.Name).Select(MapToDto),
            filter.PageNumber,
            filter.PageSize);

        return Result<PagedResult<GetCategoryDto>>.Success(result);
    }

    public async Task<Result<GetCategoryDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var category = await _categoryRepository.GetByIdWithDishesAsync(id, cancellationToken)
            ?? await _categoryRepository.GetByIdAsync(id, cancellationToken);
        if (category == null || category.IsDeleted)
        {
            return Result<GetCategoryDto>.Failure("Category not found.");
        }

        return Result<GetCategoryDto>.Success(MapToDto(category));
    }

    public async Task<Result<GetCategoryDto>> CreateAsync(CreateCategoryDto dto, CancellationToken cancellationToken = default)
    {
        var validation = await ValidateAsync(dto.Name, dto.Description, null, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetCategoryDto>.Failure(validation.Message, validation.Errors);
        }

        var category = new Category
        {
            Name = dto.Name.Trim(),
            Description = ServiceHelpers.TrimToNull(dto.Description),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _categoryRepository.AddAsync(category, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<GetCategoryDto>.Success(MapToDto(category), "Category created.");
    }

    public async Task<Result<GetCategoryDto>> UpdateAsync(int id, UpdateCategoryDto dto, CancellationToken cancellationToken = default)
    {
        var category = await _categoryRepository.GetByIdAsync(id, cancellationToken);
        if (category == null || category.IsDeleted)
        {
            return Result<GetCategoryDto>.Failure("Category not found.");
        }

        var validation = await ValidateAsync(dto.Name, dto.Description, id, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetCategoryDto>.Failure(validation.Message, validation.Errors);
        }

        category.Name = dto.Name.Trim();
        category.Description = ServiceHelpers.TrimToNull(dto.Description);
        category.IsActive = dto.IsActive;
        category.UpdatedAt = DateTime.UtcNow;

        _categoryRepository.Update(category);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<GetCategoryDto>.Success(MapToDto(category), "Category updated.");
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var category = await _categoryRepository.GetByIdAsync(id, cancellationToken);
        if (category == null || category.IsDeleted)
        {
            return Result.Failure("Category not found.");
        }

        if (await _categoryRepository.HasActiveDishesAsync(id, cancellationToken))
        {
            return Result.Failure("Category has active dishes.");
        }

        category.IsDeleted = true;
        category.UpdatedAt = DateTime.UtcNow;

        _categoryRepository.Update(category);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success("Category deleted.");
    }

    private async Task<Result> ValidateAsync(string name, string? description, int? excludeId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return Result.Failure("Name is required.");
        }

        if (name.Trim().Length > 100)
        {
            return Result.Failure("Name must be 100 characters or less.");
        }

        if (!ServiceHelpers.HasMaxLength(description, 500))
        {
            return Result.Failure("Description must be 500 characters or less.");
        }

        if (await _categoryRepository.NameExistsAsync(name.Trim(), excludeId, cancellationToken))
        {
            return Result.Failure("Category name already exists.");
        }

        return Result.Success();
    }

    private static GetCategoryDto MapToDto(Category category)
    {
        return new GetCategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            IsActive = category.IsActive,
            DishesCount = category.Dishes?.Count(x => !x.IsDeleted) ?? 0,
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt
        };
    }
}
