using Cafe.Domain.Common;
using Cafe.Domain.Enums;

namespace Cafe.Domain.Entities;

public class StaffMember : AuditableEntity
{
    public string? IdentityUserId { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string? MiddleName { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public StaffRole Role { get; set; }

    public StaffStatus Status { get; set; }

    public DateTime HireDate { get; set; }

    public DateTime? FiredDate { get; set; }

    public decimal? Salary { get; set; }

    public string? Note { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();

    public ICollection<Tip> Tips { get; set; } = new List<Tip>();

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
