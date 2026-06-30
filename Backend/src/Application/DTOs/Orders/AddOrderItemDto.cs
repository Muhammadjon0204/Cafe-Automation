namespace Cafe.Application.DTOs.Orders;

public class AddOrderItemDto
{
    public int DishId { get; set; }

    public int Quantity { get; set; }

    public string? Note { get; set; }
}
