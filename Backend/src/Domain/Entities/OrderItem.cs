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
}
