namespace Cafe.Application.DTOs.Reports;

public class SalesReportDto
{
    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }

    public int TotalOrders { get; set; }

    public decimal TotalRevenue { get; set; }

    public decimal AverageOrderAmount { get; set; }

    public decimal TotalDiscounts { get; set; }

    public decimal TotalTips { get; set; }
}
