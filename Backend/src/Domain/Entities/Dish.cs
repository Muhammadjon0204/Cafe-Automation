using Cafe.Domain.Common;
using Cafe.Domain.Enums;

namespace Cafe.Domain.Entities;

public class Dish : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public decimal? CostPrice { get; set; }

    public int CookingTimeMinutes { get; set; }

    public int? Calories { get; set; }

    public string? ImageUrl { get; set; }

    public string? IngredientsDescription { get; set; }

    public bool IsAvailable { get; set; }

    public bool IsSeasonal { get; set; }

    public DishStatus Status { get; set; }

    public DishType Type { get; set; }

    public int CategoryId { get; set; }

    public Category? Category { get; set; }

    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}
