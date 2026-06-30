using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Orders;

public class GetOrderDto
{
    public int Id { get; set; }

    public string OrderNumber { get; set; } = string.Empty;

    public DateTime OrderedAt { get; set; }

    public DateTime? ClosedAt { get; set; }

    public OrderStatus Status { get; set; }

    public OrderType Type { get; set; }

    public int? CustomerId { get; set; }

    public string? CustomerName { get; set; }

    public int? CafeTableId { get; set; }

    public int? TableNumber { get; set; }

    public int? WaiterId { get; set; }

    public string? WaiterName { get; set; }

    public int? CreatedByStaffMemberId { get; set; }

    public string? CreatedByStaffMemberName { get; set; }

    public decimal SubTotal { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal TipAmount { get; set; }

    public decimal TotalAmount { get; set; }

    public PaymentStatus PaymentStatus { get; set; }

    public string? Note { get; set; }

    public List<GetOrderItemDto> Items { get; set; } = new List<GetOrderItemDto>();

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
