using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Orders;

public class OrderFilterDto
{
    public string? Search { get; set; }

    public OrderStatus? Status { get; set; }

    public OrderType? Type { get; set; }

    public PaymentStatus? PaymentStatus { get; set; }

    public int? CustomerId { get; set; }

    public int? CafeTableId { get; set; }

    public int? WaiterId { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
