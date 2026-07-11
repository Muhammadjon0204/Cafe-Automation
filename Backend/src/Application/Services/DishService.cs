using Cafe.Application.Common;
using Cafe.Application.DTOs.Dishes;
using Cafe.Application.Interfaces.Identity;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Application.Services.Dishes.Specifications;
using Cafe.Domain.Constants;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;

namespace Cafe.Application.Services;

public class DishService : IDishService
{
    private readonly IDishRepository _dishRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public DishService(IDishRepository dishRepository, ICategoryRepository categoryRepository, IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    {
        _dishRepository = dishRepository;
        _categoryRepository = categoryRepository;
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PagedResult<GetDishDto>>> GetAllAsync(DishFilterDto filter, CancellationToken cancellationToken = default)
    {
        var spec = new DishFilterSpecification(filter);
        var pagedDishes = await _dishRepository.GetAsync(spec, cancellationToken);
        var result = pagedDishes.MapTo(MapToDto);
        return Result<PagedResult<GetDishDto>>.Success(result);
    }

    public async Task<Result<GetDishDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var dish = await _dishRepository.GetByIdWithCategoryAsync(id, cancellationToken)
            ?? await _dishRepository.GetByIdAsync(id, cancellationToken);
        if (dish == null || dish.IsDeleted)
        {
            return Result<GetDishDto>.Failure("Dish not found.");
        }

        return Result<GetDishDto>.Success(MapToDto(dish));
    }

    public async Task<Result<PagedResult<GetDishAdminDto>>> GetAllAdminAsync(DishFilterDto filter, CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.IsInRole(SystemRoles.Admin))
        {
            return Result<PagedResult<GetDishAdminDto>>.Failure("Forbidden.");
        }

        var spec = new DishFilterSpecification(filter);
        var pagedDishes = await _dishRepository.GetAsync(spec, cancellationToken);
        var result = pagedDishes.MapTo(MapToAdminDto);
        return Result<PagedResult<GetDishAdminDto>>.Success(result);
    }

    public async Task<Result<GetDishAdminDto>> GetByIdAdminAsync(int id, CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.IsInRole(SystemRoles.Admin))
        {
            return Result<GetDishAdminDto>.Failure("Forbidden.");
        }

        var dish = await _dishRepository.GetByIdWithCategoryAsync(id, cancellationToken)
            ?? await _dishRepository.GetByIdAsync(id, cancellationToken);
        if (dish == null || dish.IsDeleted)
        {
            return Result<GetDishAdminDto>.Failure("Dish not found.");
        }

        return Result<GetDishAdminDto>.Success(MapToAdminDto(dish));
    }

    public async Task<Result<GetDishDto>> CreateAsync(CreateDishDto dto, CancellationToken cancellationToken = default)
    {
        var validation = await ValidateAsync(dto.Name, dto.Description, dto.Price, dto.CostPrice, dto.CookingTimeMinutes, dto.Calories, dto.IngredientsDescription, dto.CategoryId, dto.Status, dto.Type, null, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetDishDto>.Failure(validation.Message, validation.Errors);
        }

        var dish = new Dish
        {
            Name = dto.Name.Trim(),
            Description = ServiceHelpers.TrimToNull(dto.Description),
            Price = dto.Price,
            CostPrice = dto.CostPrice,
            CookingTimeMinutes = dto.CookingTimeMinutes,
            Calories = dto.Calories,
            ImageUrl = ServiceHelpers.TrimToNull(dto.ImageUrl),
            IngredientsDescription = ServiceHelpers.TrimToNull(dto.IngredientsDescription),
            IsAvailable = dto.IsAvailable,
            IsSeasonal = dto.IsSeasonal,
            CategoryId = dto.CategoryId,
            Status = dto.Status,
            Type = dto.Type,
            CreatedAt = DateTime.UtcNow
        };

        await _dishRepository.AddAsync(dish, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<GetDishDto>.Success(MapToDto(dish), "Dish created.");
    }

    public async Task<Result<GetDishDto>> UpdateAsync(int id, UpdateDishDto dto, CancellationToken cancellationToken = default)
    {
        var dish = await _dishRepository.GetByIdAsync(id, cancellationToken);
        if (dish == null || dish.IsDeleted)
        {
            return Result<GetDishDto>.Failure("Dish not found.");
        }

        var validation = await ValidateAsync(dto.Name, dto.Description, dto.Price, dto.CostPrice, dto.CookingTimeMinutes, dto.Calories, dto.IngredientsDescription, dto.CategoryId, dto.Status, dto.Type, id, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetDishDto>.Failure(validation.Message, validation.Errors);
        }

        dish.Name = dto.Name.Trim();
        dish.Description = ServiceHelpers.TrimToNull(dto.Description);
        dish.Price = dto.Price;
        dish.CostPrice = dto.CostPrice;
        dish.CookingTimeMinutes = dto.CookingTimeMinutes;
        dish.Calories = dto.Calories;
        dish.ImageUrl = ServiceHelpers.TrimToNull(dto.ImageUrl);
        dish.IngredientsDescription = ServiceHelpers.TrimToNull(dto.IngredientsDescription);
        dish.IsAvailable = dto.IsAvailable;
        dish.IsSeasonal = dto.IsSeasonal;
        dish.CategoryId = dto.CategoryId;
        dish.Status = dto.Status;
        dish.Type = dto.Type;
        dish.UpdatedAt = DateTime.UtcNow;

        _dishRepository.Update(dish);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<GetDishDto>.Success(MapToDto(dish), "Dish updated.");
    }

    public async Task<Result> UpdateAvailabilityAsync(int id, UpdateDishAvailabilityDto dto, CancellationToken cancellationToken = default)
    {
        var dish = await _dishRepository.GetByIdAsync(id, cancellationToken);
        if (dish == null || dish.IsDeleted)
        {
            return Result.Failure("Dish not found.");
        }

        dish.IsAvailable = dto.IsAvailable;
        dish.UpdatedAt = DateTime.UtcNow;

        _dishRepository.Update(dish);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success("Dish availability updated.");
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var dish = await _dishRepository.GetByIdAsync(id, cancellationToken);
        if (dish == null || dish.IsDeleted)
        {
            return Result.Failure("Dish not found.");
        }

        dish.IsDeleted = true;
        dish.IsAvailable = false;
        dish.Status = DishStatus.Archived;
        dish.UpdatedAt = DateTime.UtcNow;

        _dishRepository.Update(dish);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success("Dish deleted.");
    }

    private async Task<Result> ValidateAsync(string name, string? description, decimal price, decimal? costPrice, int cookingTimeMinutes, int? calories, string? ingredientsDescription, int categoryId, DishStatus status, DishType type, int? excludeId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(name)) return Result.Failure("Name is required.");
        if (name.Trim().Length > 150) return Result.Failure("Name must be 150 characters or less.");
        if (!ServiceHelpers.HasMaxLength(description, 1000)) return Result.Failure("Description must be 1000 characters or less.");
        if (price <= 0) return Result.Failure("Price must be greater than zero.");
        if (costPrice.HasValue && costPrice.Value < 0) return Result.Failure("Cost price cannot be negative.");
        if (costPrice.HasValue && costPrice.Value > price) return Result.Failure("Cost price cannot be greater than price.");
        if (cookingTimeMinutes < 0) return Result.Failure("Cooking time cannot be negative.");
        if (calories.HasValue && calories.Value < 0) return Result.Failure("Calories cannot be negative.");
        if (!ServiceHelpers.HasMaxLength(ingredientsDescription, 1000)) return Result.Failure("Ingredients description must be 1000 characters or less.");
        if (!Enum.IsDefined(typeof(DishStatus), status)) return Result.Failure("Invalid dish status.");
        if (!Enum.IsDefined(typeof(DishType), type)) return Result.Failure("Invalid dish type.");
        if (await _dishRepository.NameExistsAsync(name.Trim(), excludeId, cancellationToken)) return Result.Failure("Dish name already exists.");

        var category = await _categoryRepository.GetByIdAsync(categoryId, cancellationToken);
        if (category == null || category.IsDeleted)
        {
            return Result.Failure("Category not found.");
        }

        return Result.Success();
    }

    private static GetDishDto MapToDto(Dish dish)
    {
        return new GetDishDto
        {
            Id = dish.Id,
            Name = dish.Name,
            Description = dish.Description,
            Price = dish.Price,
            CookingTimeMinutes = dish.CookingTimeMinutes,
            Calories = dish.Calories,
            ImageUrl = dish.ImageUrl,
            IngredientsDescription = dish.IngredientsDescription,
            IsAvailable = dish.IsAvailable,
            IsSeasonal = dish.IsSeasonal,
            Status = dish.Status,
            Type = dish.Type,
            CategoryId = dish.CategoryId,
            CategoryName = dish.Category?.Name ?? string.Empty,
            CreatedAt = dish.CreatedAt,
            UpdatedAt = dish.UpdatedAt
        };
    }

    private static GetDishAdminDto MapToAdminDto(Dish dish)
    {
        return new GetDishAdminDto
        {
            Id = dish.Id,
            Name = dish.Name,
            Description = dish.Description,
            Price = dish.Price,
            CostPrice = dish.CostPrice,
            CookingTimeMinutes = dish.CookingTimeMinutes,
            Calories = dish.Calories,
            ImageUrl = dish.ImageUrl,
            IngredientsDescription = dish.IngredientsDescription,
            IsAvailable = dish.IsAvailable,
            IsSeasonal = dish.IsSeasonal,
            Status = dish.Status,
            Type = dish.Type,
            CategoryId = dish.CategoryId,
            CategoryName = dish.Category?.Name ?? string.Empty,
            CreatedAt = dish.CreatedAt,
            UpdatedAt = dish.UpdatedAt
        };
    }
}
