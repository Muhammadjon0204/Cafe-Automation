using Cafe.Domain.Common;
using Cafe.Domain.Enums;

namespace Cafe.Domain.Entities;

public class Customer : AuditableEntity
{
    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public DateTime RegisteredAt { get; set; }

    public CustomerStatus Status { get; set; }

    public string? Note { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
