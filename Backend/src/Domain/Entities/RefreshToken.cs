using Cafe.Domain.Common;

namespace Cafe.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public string Token { get; set; } = string.Empty;

    // Exactly one of StaffMemberId/CustomerId is set (enforced by a DB check constraint in
    // RefreshTokenConfiguration) - a staff session or a client-app customer session.
    public int? StaffMemberId { get; set; }

    public StaffMember? StaffMember { get; set; }

    public int? CustomerId { get; set; }

    public Customer? Customer { get; set; }

    public DateTime ExpiresAt { get; set; }

    public bool IsRevoked { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
