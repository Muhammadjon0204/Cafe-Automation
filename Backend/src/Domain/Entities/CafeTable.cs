using Cafe.Domain.Common;
using Cafe.Domain.Enums;

namespace Cafe.Domain.Entities;

public class CafeTable : AuditableEntity
{
    public int TableNumber { get; set; }

    public int SeatsCount { get; set; }

    public TableStatus Status { get; set; }

    public string? Location { get; set; }

    public string? Note { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
