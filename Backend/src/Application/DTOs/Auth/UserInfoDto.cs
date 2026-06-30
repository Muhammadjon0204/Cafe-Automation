namespace Cafe.Application.DTOs.Auth;

public class UserInfoDto
{
    public string UserId { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public int? StaffMemberId { get; set; }

    public string? StaffRole { get; set; }
}
