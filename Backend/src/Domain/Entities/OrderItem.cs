using Cafe.Domain.Common;
using Cafe.Domain.Enums;

namespace Cafe.Domain.Entities;

public class OrderItem : AuditableEntity
{
    public int OrderId { get; set; }

    public Order? Order { get; set; }

    public int DishId { get; set; }

    public Dish? Dish { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal TotalPrice { get; set; }

    public OrderItemStatus Status { get; set; }

    public string? Note { get; set; }

    // Null until this item has actually been pushed to the kitchen's working queue (the
    // order's initial SendToKitchenAsync promotion, or a later "send pending items" call for
    // an item added after that). Kitchen-facing views must only render items where this is
    // set - the item existing on the order is not the same as the kitchen having seen it.
    public DateTime? SentToKitchenAt { get; set; }
}
