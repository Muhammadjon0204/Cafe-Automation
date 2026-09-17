using Cafe.Domain.Common;
using Cafe.Domain.Enums;

namespace Cafe.Domain.Entities;

public class Customer : AuditableEntity
{
    // Set once a guest self-registers a client-app account (AuthService.RegisterClientAsync)
    // and links to/creates this row. Null for CRM-only records staff entered by hand (walk-ins,
    // phone bookings) that never became an online account.
    public string? IdentityUserId { get; set; }

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
