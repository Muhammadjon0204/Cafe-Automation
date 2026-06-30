namespace Cafe.Application.DTOs.Dashboard;

public class DashboardSummaryDto
{
    public int TotalOrdersToday { get; set; }

    public decimal TotalRevenueToday { get; set; }

    public int ActiveOrders { get; set; }

    public int ClosedOrders { get; set; }

    public int CancelledOrders { get; set; }

    public int TotalCustomers { get; set; }

    public int TotalTables { get; set; }

    public int OccupiedTables { get; set; }

    public int FreeTables { get; set; }

    public List<PopularDishDto> PopularDishes { get; set; } = new List<PopularDishDto>();
}
