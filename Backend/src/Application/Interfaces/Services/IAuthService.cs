using Cafe.Application.DTOs.Auth;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface IAuthService
{
    Task<Result<AuthResponseDto>> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);

    Task<Result<AuthResponseDto>> RegisterAsync(RegisterUserDto dto, CancellationToken cancellationToken = default);

    Task<Result<AuthResponseDto>> RefreshTokenAsync(RefreshTokenDto dto, CancellationToken cancellationToken = default);

    Task<Result> LogoutAsync(RefreshTokenDto dto, CancellationToken cancellationToken = default);

    Task<Result> ChangePasswordAsync(string userId, ChangePasswordDto dto, CancellationToken cancellationToken = default);

    Task<Result<CurrentUserDto>> GetCurrentUserAsync(string userId, CancellationToken cancellationToken = default);
}
