using Cafe.Domain.Common;
using Cafe.Domain.Enums;

namespace Cafe.Domain.Entities;

public class Discount : AuditableEntity
{
    public int OrderId { get; set; }

    public Order? Order { get; set; }

    public string Name { get; set; } = string.Empty;

    public DiscountType Type { get; set; }

    public decimal Value { get; set; }

    public decimal Amount { get; set; }

    public string? Reason { get; set; }

    public DateTime AppliedAt { get; set; }
}
