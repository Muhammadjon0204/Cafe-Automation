using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Payments;

public class PaymentFilterDto
{
    public int? OrderId { get; set; }

    public int? CashierId { get; set; }

    public PaymentMethod? Method { get; set; }

    public PaymentStatus? Status { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
