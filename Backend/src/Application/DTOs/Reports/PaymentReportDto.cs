namespace Cafe.Application.DTOs.Reports;

public class PaymentReportDto
{
    public decimal CashTotal { get; set; }

    public decimal CardTotal { get; set; }

    public decimal OnlineTotal { get; set; }

    public decimal MixedTotal { get; set; }

    public decimal GrandTotal { get; set; }
}
