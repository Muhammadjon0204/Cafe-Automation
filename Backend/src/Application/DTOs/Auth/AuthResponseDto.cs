namespace Cafe.Application.DTOs.Auth;

public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;

    public string RefreshToken { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public UserInfoDto User { get; set; } = new UserInfoDto();

    public List<string> Roles { get; set; } = new List<string>();
}
