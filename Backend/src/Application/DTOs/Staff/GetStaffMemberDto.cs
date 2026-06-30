using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Staff;

public class GetStaffMemberDto
{
    public int Id { get; set; }

    public string? IdentityUserId { get; set; }

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string? MiddleName { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public StaffRole Role { get; set; }

    public StaffStatus Status { get; set; }

    public DateTime HireDate { get; set; }

    public DateTime? FiredDate { get; set; }

    public decimal? Salary { get; set; }

    public string? Note { get; set; }

    public int OrdersCount { get; set; }

    public decimal TotalTips { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
