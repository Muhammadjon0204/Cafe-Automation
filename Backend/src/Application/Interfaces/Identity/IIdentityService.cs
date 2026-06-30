namespace Cafe.Application.Interfaces.Identity;

public interface IIdentityService
{
    Task<bool> UserExistsByEmailAsync(string email, CancellationToken cancellationToken = default);

    Task<IList<string>> GetUserRolesAsync(string userId, CancellationToken cancellationToken = default);
}
