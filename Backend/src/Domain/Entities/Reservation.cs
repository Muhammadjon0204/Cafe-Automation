using Cafe.Domain.Common;
using Cafe.Domain.Enums;

namespace Cafe.Domain.Entities;

public class Reservation : AuditableEntity
{
    public int CafeTableId { get; set; }

    public CafeTable? CafeTable { get; set; }

    public int? CustomerId { get; set; }

    public Customer? Customer { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public int GuestsCount { get; set; }

    public DateTime ReservedAt { get; set; }

    public DateTime? ReservedUntil { get; set; }

    public DateTime? CancelledAt { get; set; }

    public ReservationStatus Status { get; set; }

    public string? Note { get; set; }
}
