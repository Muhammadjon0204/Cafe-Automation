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
