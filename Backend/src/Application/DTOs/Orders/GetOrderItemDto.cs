using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Orders;

public class GetOrderItemDto
{
    public int Id { get; set; }

    public int DishId { get; set; }

    public string DishName { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal TotalPrice { get; set; }

    public OrderItemStatus Status { get; set; }

    public string? Note { get; set; }

    // Null until sent to the kitchen (see OrderService.SendToKitchenAsync). Kitchen UIs must
    // only render items where this is set.
    public DateTime? SentToKitchenAt { get; set; }
}
