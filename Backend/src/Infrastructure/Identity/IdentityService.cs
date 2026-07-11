using Cafe.Application.DTOs.Auth;
using Cafe.Application.Interfaces.Identity;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Results;
using Cafe.Domain.Constants;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;
using Microsoft.AspNetCore.Identity;

namespace Cafe.Infrastructure.Identity;

public class IdentityService : IIdentityService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IStaffMemberRepository _staffMemberRepository;
    private readonly IUnitOfWork _unitOfWork;

    public IdentityService(
        UserManager<ApplicationUser> userManager,
        IStaffMemberRepository staffMemberRepository,
        IUnitOfWork unitOfWork)
    {
        _userManager = userManager;
        _staffMemberRepository = staffMemberRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<UserInfoDto>> RegisterAsync(RegisterUserDto dto, CancellationToken cancellationToken = default)
    {
        if (!SystemRoles.All.Contains(dto.Role, StringComparer.OrdinalIgnoreCase))
        {
            return Result<UserInfoDto>.Failure($"Role must be one of: {string.Join(", ", SystemRoles.All)}.");
        }

        if (await _userManager.FindByEmailAsync(dto.Email) != null)
        {
            return Result<UserInfoDto>.Failure("Email already exists.");
        }

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            PhoneNumber = dto.Phone,
            FirstName = dto.FirstName,
            LastName = dto.LastName
        };

        var createResult = await _userManager.CreateAsync(user, dto.Password);
        if (!createResult.Succeeded)
        {
            return Result<UserInfoDto>.Failure("Failed to register user.", createResult.Errors.Select(x => x.Description).ToList());
        }

        var normalizedRole = SystemRoles.All.First(x => string.Equals(x, dto.Role, StringComparison.OrdinalIgnoreCase));
        var roleResult = await _userManager.AddToRoleAsync(user, normalizedRole);
        if (!roleResult.Succeeded)
        {
            return Result<UserInfoDto>.Failure("Failed to assign role.", roleResult.Errors.Select(x => x.Description).ToList());
        }

        var staffMember = new StaffMember
        {
            IdentityUserId = user.Id,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Phone = dto.Phone,
            Email = dto.Email,
            Role = Enum.Parse<StaffRole>(normalizedRole),
            Status = StaffStatus.Active,
            HireDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await _staffMemberRepository.AddAsync(staffMember, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<UserInfoDto>.Success(await BuildUserInfoAsync(user, staffMember));
    }

    public async Task<Result<UserInfoDto>> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
        {
            return Result<UserInfoDto>.Failure("Invalid email or password.");
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            return Result<UserInfoDto>.Failure("Account is locked out. Try again later.");
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, dto.Password);
        if (!passwordValid)
        {
            await _userManager.AccessFailedAsync(user);
            return Result<UserInfoDto>.Failure("Invalid email or password.");
        }

        await _userManager.ResetAccessFailedCountAsync(user);

        var staffMember = await _staffMemberRepository.GetByIdentityUserIdAsync(user.Id, cancellationToken);
        if (staffMember != null && staffMember.Status != StaffStatus.Active)
        {
            return Result<UserInfoDto>.Failure("Staff account is not active.");
        }

        return Result<UserInfoDto>.Success(await BuildUserInfoAsync(user, staffMember));
    }

    public async Task<Result> ChangePasswordAsync(string userId, ChangePasswordDto dto, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return Result.Failure("User not found.");
        }

        var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!result.Succeeded)
        {
            return Result.Failure("Failed to change password.", result.Errors.Select(x => x.Description).ToList());
        }

        return Result.Success("Password changed.");
    }

    public async Task<Result<UserInfoDto>> GetUserInfoAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return Result<UserInfoDto>.Failure("User not found.");
        }

        var staffMember = await _staffMemberRepository.GetByIdentityUserIdAsync(user.Id, cancellationToken);
        return Result<UserInfoDto>.Success(await BuildUserInfoAsync(user, staffMember));
    }

    public async Task<bool> UserExistsByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _userManager.FindByEmailAsync(email) != null;
    }

    public async Task<IList<string>> GetUserRolesAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new List<string>();
        }

        return await _userManager.GetRolesAsync(user);
    }

    private Task<UserInfoDto> BuildUserInfoAsync(ApplicationUser user, StaffMember? staffMember)
    {
        return Task.FromResult(new UserInfoDto
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = $"{user.FirstName} {user.LastName}".Trim(),
            StaffMemberId = staffMember?.Id,
            StaffRole = staffMember?.Role.ToString()
        });
    }
}
