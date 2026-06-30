using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Discounts;

public class GetDiscountDto
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public string OrderNumber { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public DiscountType Type { get; set; }

    public decimal Value { get; set; }

    public decimal Amount { get; set; }

    public string? Reason { get; set; }

    public DateTime AppliedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}
