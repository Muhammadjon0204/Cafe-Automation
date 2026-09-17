namespace Cafe.Application.DTOs.Auth;

// Self-registration payload for the client-app (AuthController.RegisterClient, AllowAnonymous).
// Deliberately has no Role field - unlike RegisterUserDto (Admin-only staff registration), the
// role is always Client, decided server-side in IdentityService.RegisterCustomerAsync.
public class RegisterCustomerDto
{
    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;
}
