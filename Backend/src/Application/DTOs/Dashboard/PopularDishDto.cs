namespace Cafe.Application.DTOs.Dashboard;

public class PopularDishDto
{
    public int DishId { get; set; }

    public string DishName { get; set; } = string.Empty;

    public int TotalQuantitySold { get; set; }

    public decimal TotalRevenue { get; set; }
}
