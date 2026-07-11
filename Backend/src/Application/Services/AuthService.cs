using Cafe.Application.Common;
using Cafe.Application.DTOs.Auth;
using Cafe.Application.Interfaces.Identity;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Microsoft.Extensions.Options;

namespace Cafe.Application.Services;

public class AuthService : IAuthService
{
    private readonly IIdentityService _identityService;
    private readonly ITokenService _tokenService;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly JwtSettings _jwtSettings;

    public AuthService(
        IIdentityService identityService,
        ITokenService tokenService,
        IRefreshTokenRepository refreshTokenRepository,
        IUnitOfWork unitOfWork,
        IOptions<JwtSettings> jwtOptions)
    {
        _identityService = identityService;
        _tokenService = tokenService;
        _refreshTokenRepository = refreshTokenRepository;
        _unitOfWork = unitOfWork;
        _jwtSettings = jwtOptions.Value;
    }

    public async Task<Result<AuthResponseDto>> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            return Result<AuthResponseDto>.Failure("Email is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Password))
        {
            return Result<AuthResponseDto>.Failure("Password is required.");
        }

        dto.Email = dto.Email.Trim();
        var loginResult = await _identityService.LoginAsync(dto, cancellationToken);
        if (!loginResult.IsSuccess || loginResult.Data == null)
        {
            return Result<AuthResponseDto>.Failure(loginResult.Message, loginResult.Errors);
        }

        return await CreateAuthResponseAsync(loginResult.Data, cancellationToken);
    }

    public async Task<Result<AuthResponseDto>> RegisterAsync(RegisterUserDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            return Result<AuthResponseDto>.Failure("Email is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Password))
        {
            return Result<AuthResponseDto>.Failure("Password is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.FirstName))
        {
            return Result<AuthResponseDto>.Failure("First name is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.LastName))
        {
            return Result<AuthResponseDto>.Failure("Last name is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Role))
        {
            return Result<AuthResponseDto>.Failure("Role is required.");
        }

        dto.Email = dto.Email.Trim();
        dto.FirstName = dto.FirstName.Trim();
        dto.LastName = dto.LastName.Trim();
        dto.Phone = ServiceHelpers.TrimToNull(dto.Phone);
        dto.Role = dto.Role.Trim();

        var registerResult = await _identityService.RegisterAsync(dto, cancellationToken);
        if (!registerResult.IsSuccess || registerResult.Data == null)
        {
            return Result<AuthResponseDto>.Failure(registerResult.Message, registerResult.Errors);
        }

        return await CreateAuthResponseAsync(registerResult.Data, cancellationToken);
    }

    public async Task<Result<AuthResponseDto>> RefreshTokenAsync(RefreshTokenDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.RefreshToken))
        {
            return Result<AuthResponseDto>.Failure("Refresh token is required.");
        }

        var existing = await _refreshTokenRepository.GetByTokenAsync(dto.RefreshToken.Trim(), cancellationToken);
        if (existing == null || existing.IsRevoked || existing.ExpiresAt <= DateTime.UtcNow)
        {
            return Result<AuthResponseDto>.Failure("Refresh token is invalid or expired.");
        }

        if (existing.StaffMember == null || existing.StaffMember.IdentityUserId == null)
        {
            return Result<AuthResponseDto>.Failure("Refresh token is invalid or expired.");
        }

        var userInfoResult = await _identityService.GetUserInfoAsync(existing.StaffMember.IdentityUserId, cancellationToken);
        if (!userInfoResult.IsSuccess || userInfoResult.Data == null)
        {
            return Result<AuthResponseDto>.Failure(userInfoResult.Message, userInfoResult.Errors);
        }

        existing.IsRevoked = true;
        _refreshTokenRepository.Update(existing);

        return await CreateAuthResponseAsync(userInfoResult.Data, cancellationToken);
    }

    public async Task<Result> LogoutAsync(RefreshTokenDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.RefreshToken))
        {
            return Result.Failure("Refresh token is required.");
        }

        var existing = await _refreshTokenRepository.GetByTokenAsync(dto.RefreshToken.Trim(), cancellationToken);
        if (existing == null)
        {
            return Result.Success("Logged out.");
        }

        existing.IsRevoked = true;
        _refreshTokenRepository.Update(existing);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success("Logged out.");
    }

    public async Task<Result> ChangePasswordAsync(string userId, ChangePasswordDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Result.Failure("User id is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.CurrentPassword))
        {
            return Result.Failure("Current password is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            return Result.Failure("New password is required.");
        }

        return await _identityService.ChangePasswordAsync(userId.Trim(), dto, cancellationToken);
    }

    public async Task<Result<CurrentUserDto>> GetCurrentUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Result<CurrentUserDto>.Failure("User id is required.");
        }

        var userInfoResult = await _identityService.GetUserInfoAsync(userId.Trim(), cancellationToken);
        if (!userInfoResult.IsSuccess || userInfoResult.Data == null)
        {
            return Result<CurrentUserDto>.Failure(userInfoResult.Message, userInfoResult.Errors);
        }

        var roles = await _identityService.GetUserRolesAsync(userInfoResult.Data.UserId, cancellationToken);
        var dto = new CurrentUserDto
        {
            UserId = userInfoResult.Data.UserId,
            Email = userInfoResult.Data.Email,
            FullName = userInfoResult.Data.FullName,
            StaffMemberId = userInfoResult.Data.StaffMemberId,
            Roles = roles.ToList()
        };

        return Result<CurrentUserDto>.Success(dto);
    }

    private async Task<Result<AuthResponseDto>> CreateAuthResponseAsync(UserInfoDto user, CancellationToken cancellationToken)
    {
        var roles = await _identityService.GetUserRolesAsync(user.UserId, cancellationToken);
        var accessToken = await _tokenService.GenerateAccessTokenAsync(
            user.UserId,
            user.Email,
            user.FullName,
            user.StaffMemberId,
            roles,
            cancellationToken);

        var refreshTokenValue = _tokenService.GenerateRefreshToken();
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenMinutes);

        if (user.StaffMemberId.HasValue)
        {
            var refreshToken = new RefreshToken
            {
                Token = refreshTokenValue,
                StaffMemberId = user.StaffMemberId.Value,
                ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenDays),
                IsRevoked = false,
                CreatedAt = DateTime.UtcNow
            };

            await _refreshTokenRepository.AddAsync(refreshToken, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var response = new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshTokenValue,
            ExpiresAt = expiresAt,
            User = user,
            Roles = roles.ToList()
        };

        return Result<AuthResponseDto>.Success(response);
    }
}
