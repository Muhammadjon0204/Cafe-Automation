using Cafe.Domain.Common;
using Cafe.Domain.Enums;

namespace Cafe.Domain.Entities;

public class Order : AuditableEntity
{
    public string OrderNumber { get; set; } = string.Empty;

    public DateTime OrderedAt { get; set; }

    public DateTime? ClosedAt { get; set; }

    public OrderStatus Status { get; set; }

    public OrderType Type { get; set; }

    public int? CustomerId { get; set; }

    public Customer? Customer { get; set; }

    public int? CafeTableId { get; set; }

    public CafeTable? CafeTable { get; set; }

    public int? WaiterId { get; set; }

    public StaffMember? Waiter { get; set; }

    public int? CreatedByStaffMemberId { get; set; }

    public StaffMember? CreatedByStaffMember { get; set; }

    // Set only for a pre-order created from a Reservation (OrderStatus.Scheduled until
    // promoted). CafeTableId above is still copied onto the order at creation time from
    // Reservation.CafeTableId - this stays a pointer back to the originating reservation,
    // not a second source of truth for the table.
    public int? ReservationId { get; set; }

    public Reservation? Reservation { get; set; }

    // UTC instant the kitchen-promotion background job should move this order out of
    // Scheduled. Null for a normal walk-in order (never Scheduled) or a pre-order with no
    // items yet (nothing to compute a cooking time from).
    public DateTime? SendToKitchenAt { get; set; }

    public decimal SubTotal { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal TipAmount { get; set; }

    public decimal TotalAmount { get; set; }

    public PaymentStatus PaymentStatus { get; set; }

    public string? Note { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public ICollection<Discount> Discounts { get; set; } = new List<Discount>();

    public ICollection<Tip> Tips { get; set; } = new List<Tip>();
}
