using Cafe.Application.DTOs.Auth;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Identity;

public interface IIdentityService
{
    Task<Result<UserInfoDto>> RegisterAsync(RegisterUserDto dto, CancellationToken cancellationToken = default);

    Task<Result<UserInfoDto>> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);

    Task<Result> ChangePasswordAsync(string userId, ChangePasswordDto dto, CancellationToken cancellationToken = default);

    Task<Result<UserInfoDto>> GetUserInfoAsync(string userId, CancellationToken cancellationToken = default);

    Task<bool> UserExistsByEmailAsync(string email, CancellationToken cancellationToken = default);

    Task<IList<string>> GetUserRolesAsync(string userId, CancellationToken cancellationToken = default);
}
