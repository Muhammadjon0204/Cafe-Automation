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

    public double PositionX { get; set; }

    public double PositionY { get; set; }

    public double Width { get; set; }

    public double Height { get; set; }

    public TableShape Shape { get; set; }

    public int? ZoneId { get; set; }

    public Zone? Zone { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
