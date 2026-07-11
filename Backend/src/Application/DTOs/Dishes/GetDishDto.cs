using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Dishes;

public class GetDishDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public int CookingTimeMinutes { get; set; }

    public int? Calories { get; set; }

    public string? ImageUrl { get; set; }

    public string? IngredientsDescription { get; set; }

    public bool IsAvailable { get; set; }

    public bool IsSeasonal { get; set; }

    public DishStatus Status { get; set; }

    public DishType Type { get; set; }

    public int CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
