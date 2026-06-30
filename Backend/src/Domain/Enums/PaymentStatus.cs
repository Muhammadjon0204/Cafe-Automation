namespace Cafe.Domain.Enums;

public enum PaymentStatus
{
    Unpaid = 1,
    Pending = 2,
    Paid = 3,
    PartiallyPaid = 4,
    Failed = 5,
    Refunded = 6,
    Cancelled = 7
}
