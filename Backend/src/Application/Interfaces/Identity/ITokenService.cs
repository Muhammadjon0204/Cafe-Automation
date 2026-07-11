namespace Cafe.Application.Interfaces.Identity;

public interface ITokenService
{
    Task<string> GenerateAccessTokenAsync(string userId, string email, string fullName, int? staffMemberId, IList<string> roles, CancellationToken cancellationToken = default);

    string GenerateRefreshToken();
}
