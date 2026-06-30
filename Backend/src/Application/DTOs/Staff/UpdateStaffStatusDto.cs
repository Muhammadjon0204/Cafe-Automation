using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Staff;

public class UpdateStaffStatusDto
{
    public StaffStatus Status { get; set; }

    public DateTime? FiredDate { get; set; }

    public string? Note { get; set; }
}
