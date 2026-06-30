namespace Cafe.Application.DTOs.Reports;

public class WaiterPerformanceReportDto
{
    public int WaiterId { get; set; }

    public string WaiterName { get; set; } = string.Empty;

    public int TotalOrders { get; set; }

    public decimal TotalSales { get; set; }

    public decimal TotalTips { get; set; }
}
