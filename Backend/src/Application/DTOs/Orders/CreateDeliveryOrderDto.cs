namespace Cafe.Application.DTOs.Orders;

// Customer self-checkout payload (CustomerOrdersController.Create) - one atomic call for the
// whole cart, unlike the staff CreateOrderDto + AddItemAsync multi-step flow. CustomerId is
// never part of this DTO - OrderService.CreateDeliveryOrderAsync always takes it from the
// caller's own token (ICurrentUserService.CustomerId), never from the request body.
public class CreateDeliveryOrderDto
{
    public List<CreateDeliveryOrderItemDto> Items { get; set; } = new List<CreateDeliveryOrderItemDto>();

    public string DeliveryAddress { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public string? Note { get; set; }
}

public class CreateDeliveryOrderItemDto
{
    public int DishId { get; set; }

    public int Quantity { get; set; }

    public string? Note { get; set; }
}
