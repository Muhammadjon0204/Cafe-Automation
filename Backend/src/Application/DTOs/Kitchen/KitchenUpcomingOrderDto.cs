using Cafe.Application.DTOs.Orders;

namespace Cafe.Application.DTOs.Kitchen;

public class KitchenUpcomingOrderDto
{
    public GetOrderDto Order { get; set; } = null!;

    public DateTime ReservedAt { get; set; }
}
