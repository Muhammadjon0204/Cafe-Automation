namespace Cafe.Application.DTOs.Auth;

public class CurrentUserDto
{
    public string UserId { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public List<string> Roles { get; set; } = new List<string>();

    public int? StaffMemberId { get; set; }
}
