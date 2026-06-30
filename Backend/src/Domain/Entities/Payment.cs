using Cafe.Domain.Common;
using Cafe.Domain.Enums;

namespace Cafe.Domain.Entities;

public class Payment : AuditableEntity
{
    public int OrderId { get; set; }

    public Order? Order { get; set; }

    public int? CashierId { get; set; }

    public StaffMember? Cashier { get; set; }

    public decimal Amount { get; set; }

    public PaymentMethod Method { get; set; }

    public PaymentStatus Status { get; set; }

    public DateTime PaidAt { get; set; }

    public string? TransactionNumber { get; set; }

    public string? Note { get; set; }
}
