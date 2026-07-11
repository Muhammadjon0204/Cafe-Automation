namespace Cafe.Application.DTOs.Orders;

public class RemoveOrderItemDto
{
    // Required to remove an item that is already Cooking or Served.
    public bool Force { get; set; }

    public string? Reason { get; set; }
}
