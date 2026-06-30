using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Orders;

public class UpdateOrderStatusDto
{
    public OrderStatus Status { get; set; }

    public string? Note { get; set; }
}
