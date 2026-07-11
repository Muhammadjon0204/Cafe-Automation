namespace Cafe.Application.DTOs.Orders;

public class UpdateOrderItemDto
{
    public int Quantity { get; set; }

    public string? Note { get; set; }

    // Required to change quantity on an item that is already Cooking or Served.
    public bool Force { get; set; }

    public string? Reason { get; set; }
}
