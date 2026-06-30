using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Staff;

public class StaffMemberFilterDto
{
    public string? Search { get; set; }

    public StaffRole? Role { get; set; }

    public StaffStatus? Status { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
