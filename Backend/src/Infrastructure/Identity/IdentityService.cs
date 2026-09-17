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
    private readonly ICustomerRepository _customerRepository;
    private readonly IUnitOfWork _unitOfWork;

    public IdentityService(
        UserManager<ApplicationUser> userManager,
        IStaffMemberRepository staffMemberRepository,
        ICustomerRepository customerRepository,
        IUnitOfWork unitOfWork)
    {
        _userManager = userManager;
        _staffMemberRepository = staffMemberRepository;
        _customerRepository = customerRepository;
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

        return Result<UserInfoDto>.Success(await BuildUserInfoAsync(user, staffMember, null));
    }

    // Self-service registration for the client-app (AuthController.RegisterClient,
    // AllowAnonymous) - always assigns SystemRoles.Client and never touches StaffMember, unlike
    // RegisterAsync above. Reuses an existing CRM Customer row (phone/email entered by staff
    // during a past walk-in/phone booking, no account yet) instead of creating a second one -
    // Customers.Phone/Email both carry a unique index, so a blind insert would 500 on conflict.
    public async Task<Result<UserInfoDto>> RegisterCustomerAsync(RegisterCustomerDto dto, CancellationToken cancellationToken = default)
    {
        if (await _userManager.FindByEmailAsync(dto.Email) != null)
        {
            return Result<UserInfoDto>.Failure("Email already exists.");
        }

        var existingByPhone = await _customerRepository.GetByPhoneAsync(dto.Phone, cancellationToken);
        if (existingByPhone != null && existingByPhone.IdentityUserId != null)
        {
            return Result<UserInfoDto>.Failure("Phone already registered.");
        }

        var existingByEmail = await _customerRepository.GetByEmailAsync(dto.Email, cancellationToken);
        if (existingByEmail != null && existingByEmail.IdentityUserId != null)
        {
            return Result<UserInfoDto>.Failure("Email already registered.");
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

        var roleResult = await _userManager.AddToRoleAsync(user, SystemRoles.Client);
        if (!roleResult.Succeeded)
        {
            return Result<UserInfoDto>.Failure("Failed to assign role.", roleResult.Errors.Select(x => x.Description).ToList());
        }

        // existingByPhone and existingByEmail can only disagree when they resolve to two
        // different un-linked CRM rows (rare - a guest booked once under a phone, once under an
        // email that don't match the same person) - link whichever one this registration
        // actually matched by phone, falling back to the email match, otherwise create fresh.
        var customer = existingByPhone ?? existingByEmail;
        if (customer != null)
        {
            customer.IdentityUserId = user.Id;
            customer.FirstName = dto.FirstName;
            customer.LastName = dto.LastName;
            customer.Phone = dto.Phone;
            customer.Email = dto.Email;
            customer.Status = CustomerStatus.Active;
            customer.UpdatedAt = DateTime.UtcNow;
            _customerRepository.Update(customer);
        }
        else
        {
            customer = new Customer
            {
                IdentityUserId = user.Id,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Phone = dto.Phone,
                Email = dto.Email,
                Status = CustomerStatus.Active,
                RegisteredAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };
            await _customerRepository.AddAsync(customer, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<UserInfoDto>.Success(await BuildUserInfoAsync(user, null, customer));
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

        var customer = await _customerRepository.GetByIdentityUserIdAsync(user.Id, cancellationToken);
        if (customer != null && customer.Status == CustomerStatus.Blocked)
        {
            return Result<UserInfoDto>.Failure("Account is blocked.");
        }

        return Result<UserInfoDto>.Success(await BuildUserInfoAsync(user, staffMember, customer));
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
        var customer = await _customerRepository.GetByIdentityUserIdAsync(user.Id, cancellationToken);
        return Result<UserInfoDto>.Success(await BuildUserInfoAsync(user, staffMember, customer));
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

    private Task<UserInfoDto> BuildUserInfoAsync(ApplicationUser user, StaffMember? staffMember, Customer? customer)
    {
        return Task.FromResult(new UserInfoDto
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = $"{user.FirstName} {user.LastName}".Trim(),
            StaffMemberId = staffMember?.Id,
            StaffRole = staffMember?.Role.ToString(),
            CustomerId = customer?.Id
        });
    }
}
