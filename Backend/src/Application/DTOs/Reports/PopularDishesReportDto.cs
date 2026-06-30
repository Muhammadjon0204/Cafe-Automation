namespace Cafe.Application.DTOs.Reports;

public class PopularDishesReportDto
{
    public int DishId { get; set; }

    public string DishName { get; set; } = string.Empty;

    public int TotalQuantitySold { get; set; }

    public decimal TotalRevenue { get; set; }
}
