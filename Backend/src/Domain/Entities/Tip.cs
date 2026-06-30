using Cafe.Domain.Common;
using Cafe.Domain.Enums;

namespace Cafe.Domain.Entities;

public class Tip : AuditableEntity
{
    public int OrderId { get; set; }

    public Order? Order { get; set; }

    public int? StaffMemberId { get; set; }

    public StaffMember? StaffMember { get; set; }

    public decimal Amount { get; set; }

    public PaymentMethod Method { get; set; }

    public DateTime GivenAt { get; set; }

    public string? Note { get; set; }
}
