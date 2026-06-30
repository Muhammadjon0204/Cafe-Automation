namespace Cafe.Application.Interfaces.Identity;

public interface ICurrentUserService
{
    string? UserId { get; }

    string? Email { get; }

    bool IsAuthenticated { get; }

    IReadOnlyList<string> Roles { get; }

    bool IsInRole(string role);
}
