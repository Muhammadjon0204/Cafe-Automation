using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Dishes;

public class DishFilterDto
{
    public string? Search { get; set; }

    public int? CategoryId { get; set; }

    public bool? IsAvailable { get; set; }

    public bool? IsSeasonal { get; set; }

    public DishStatus? Status { get; set; }

    public DishType? Type { get; set; }

    public decimal? MinPrice { get; set; }

    public decimal? MaxPrice { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
