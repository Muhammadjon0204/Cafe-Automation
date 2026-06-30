using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Discounts;

public class ApplyDiscountDto
{
    public int OrderId { get; set; }

    public string Name { get; set; } = string.Empty;

    public DiscountType Type { get; set; }

    public decimal Value { get; set; }

    public string? Reason { get; set; }
}
