using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Orders;

public class CreateOrderDto
{
    public OrderType Type { get; set; }

    public int? CustomerId { get; set; }

    public int? CafeTableId { get; set; }

    public int? WaiterId { get; set; }

    public int? CreatedByStaffMemberId { get; set; }

    public string? Note { get; set; }
}
