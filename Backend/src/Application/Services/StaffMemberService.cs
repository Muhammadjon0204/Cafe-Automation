using Cafe.Application.Common;
using Cafe.Application.DTOs.Staff;
using Cafe.Application.Interfaces.Identity;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Application.Services.Staff.Specifications;
using Cafe.Domain.Constants;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;

namespace Cafe.Application.Services;

public class StaffMemberService : IStaffMemberService
{
    private readonly IStaffMemberRepository _staffRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;
    private readonly IRefreshTokenRepository _refreshTokenRepository;

    public StaffMemberService(
        IStaffMemberRepository staffRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        IRefreshTokenRepository refreshTokenRepository)
    {
        _staffRepository = staffRepository;
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
        _refreshTokenRepository = refreshTokenRepository;
    }

    public async Task<Result<PagedResult<GetStaffMemberDto>>> GetAllAsync(StaffMemberFilterDto filter, CancellationToken cancellationToken = default)
    {
        var spec = new StaffMemberFilterSpecification(filter);
        var pagedStaff = await _staffRepository.GetAsync(spec, cancellationToken);
        var result = pagedStaff.MapTo(MapToDto);
        return Result<PagedResult<GetStaffMemberDto>>.Success(result);
    }

    public async Task<Result<GetStaffMemberDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var staff = await _staffRepository.GetByIdAsync(id, cancellationToken);
        if (staff == null || staff.IsDeleted)
        {
            return Result<GetStaffMemberDto>.Failure("Staff member not found.");
        }

        return Result<GetStaffMemberDto>.Success(MapToDto(staff));
    }

    public async Task<Result<PagedResult<GetStaffMemberAdminDto>>> GetAllAdminAsync(StaffMemberFilterDto filter, CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.IsInRole(SystemRoles.Admin))
        {
            return Result<PagedResult<GetStaffMemberAdminDto>>.Failure("Forbidden.");
        }

        var spec = new StaffMemberFilterSpecification(filter);
        var pagedStaff = await _staffRepository.GetAsync(spec, cancellationToken);
        var result = pagedStaff.MapTo(MapToAdminDto);
        return Result<PagedResult<GetStaffMemberAdminDto>>.Success(result);
    }

    public async Task<Result<GetStaffMemberAdminDto>> GetByIdAdminAsync(int id, CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.IsInRole(SystemRoles.Admin))
        {
            return Result<GetStaffMemberAdminDto>.Failure("Forbidden.");
        }

        var staff = await _staffRepository.GetByIdAsync(id, cancellationToken);
        if (staff == null || staff.IsDeleted)
        {
            return Result<GetStaffMemberAdminDto>.Failure("Staff member not found.");
        }

        return Result<GetStaffMemberAdminDto>.Success(MapToAdminDto(staff));
    }

    public async Task<Result<GetStaffMemberDto>> CreateAsync(CreateStaffMemberDto dto, CancellationToken cancellationToken = default)
    {
        var validation = await ValidateAsync(dto.FirstName, dto.LastName, dto.MiddleName, dto.Phone, dto.Email, dto.Role, dto.Status, dto.HireDate, dto.Salary, dto.Note, null, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetStaffMemberDto>.Failure(validation.Message, validation.Errors);
        }

        var staff = new StaffMember
        {
            IdentityUserId = ServiceHelpers.TrimToNull(dto.IdentityUserId),
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            MiddleName = ServiceHelpers.TrimToNull(dto.MiddleName),
            Phone = ServiceHelpers.TrimToNull(dto.Phone),
            Email = ServiceHelpers.TrimToNull(dto.Email),
            Role = dto.Role,
            Status = dto.Status,
            HireDate = dto.HireDate,
            Salary = dto.Salary,
            Note = ServiceHelpers.TrimToNull(dto.Note),
            CreatedAt = DateTime.UtcNow
        };

        await _staffRepository.AddAsync(staff, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<GetStaffMemberDto>.Success(MapToDto(staff), "Staff member created.");
    }

    public async Task<Result<GetStaffMemberDto>> UpdateAsync(int id, UpdateStaffMemberDto dto, CancellationToken cancellationToken = default)
    {
        var staff = await _staffRepository.GetByIdAsync(id, cancellationToken);
        if (staff == null || staff.IsDeleted)
        {
            return Result<GetStaffMemberDto>.Failure("Staff member not found.");
        }

        var validation = await ValidateAsync(dto.FirstName, dto.LastName, dto.MiddleName, dto.Phone, dto.Email, dto.Role, dto.Status, dto.HireDate, dto.Salary, dto.Note, id, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetStaffMemberDto>.Failure(validation.Message, validation.Errors);
        }

        // A role or status change invalidates any access/refresh tokens already issued for the
        // old role — otherwise a demoted/fired staff member keeps acting under stale claims
        // until the short-lived access token happens to expire.
        var roleOrStatusChanged = staff.Role != dto.Role || staff.Status != dto.Status;

        staff.FirstName = dto.FirstName.Trim();
        staff.LastName = dto.LastName.Trim();
        staff.MiddleName = ServiceHelpers.TrimToNull(dto.MiddleName);
        staff.Phone = ServiceHelpers.TrimToNull(dto.Phone);
        staff.Email = ServiceHelpers.TrimToNull(dto.Email);
        staff.Role = dto.Role;
        staff.Status = dto.Status;
        staff.HireDate = dto.HireDate;
        staff.FiredDate = dto.Status == StaffStatus.Fired && dto.FiredDate == null ? DateTime.UtcNow : dto.FiredDate;
        staff.Salary = dto.Salary;
        staff.Note = ServiceHelpers.TrimToNull(dto.Note);
        staff.UpdatedAt = DateTime.UtcNow;

        _staffRepository.Update(staff);

        if (roleOrStatusChanged)
        {
            await _refreshTokenRepository.RevokeAllForStaffMemberAsync(staff.Id, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<GetStaffMemberDto>.Success(MapToDto(staff), "Staff member updated.");
    }

    public async Task<Result> UpdateStatusAsync(int id, UpdateStaffStatusDto dto, CancellationToken cancellationToken = default)
    {
        var staff = await _staffRepository.GetByIdAsync(id, cancellationToken);
        if (staff == null || staff.IsDeleted)
        {
            return Result.Failure("Staff member not found.");
        }

        if (!Enum.IsDefined(typeof(StaffStatus), dto.Status))
        {
            return Result.Failure("Invalid staff status.");
        }

        var statusChanged = staff.Status != dto.Status;

        staff.Status = dto.Status;
        staff.FiredDate = dto.Status == StaffStatus.Fired ? dto.FiredDate ?? DateTime.UtcNow : dto.FiredDate;
        if (!string.IsNullOrWhiteSpace(dto.Note))
        {
            staff.Note = dto.Note.Trim();
        }

        staff.UpdatedAt = DateTime.UtcNow;

        _staffRepository.Update(staff);

        if (statusChanged)
        {
            await _refreshTokenRepository.RevokeAllForStaffMemberAsync(staff.Id, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success("Staff status updated.");
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var staff = await _staffRepository.GetByIdAsync(id, cancellationToken);
        if (staff == null || staff.IsDeleted)
        {
            return Result.Failure("Staff member not found.");
        }

        staff.IsDeleted = true;
        staff.Status = StaffStatus.Fired;
        staff.FiredDate = DateTime.UtcNow;
        staff.UpdatedAt = DateTime.UtcNow;

        _staffRepository.Update(staff);
        await _refreshTokenRepository.RevokeAllForStaffMemberAsync(staff.Id, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success("Staff member deleted.");
    }

    private async Task<Result> ValidateAsync(string firstName, string lastName, string? middleName, string? phone, string? email, StaffRole role, StaffStatus status, DateTime hireDate, decimal? salary, string? note, int? excludeId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(firstName)) return Result.Failure("First name is required.");
        if (string.IsNullOrWhiteSpace(lastName)) return Result.Failure("Last name is required.");
        if (firstName.Trim().Length > 100) return Result.Failure("First name must be 100 characters or less.");
        if (lastName.Trim().Length > 100) return Result.Failure("Last name must be 100 characters or less.");
        if (!ServiceHelpers.HasMaxLength(middleName, 100)) return Result.Failure("Middle name must be 100 characters or less.");
        if (!ServiceHelpers.HasMaxLength(phone, 30)) return Result.Failure("Phone must be 30 characters or less.");
        if (!ServiceHelpers.HasMaxLength(email, 150)) return Result.Failure("Email must be 150 characters or less.");
        if (!ServiceHelpers.HasMaxLength(note, 500)) return Result.Failure("Note must be 500 characters or less.");
        if (hireDate == default) return Result.Failure("Hire date is required.");
        if (salary.HasValue && salary.Value < 0) return Result.Failure("Salary cannot be negative.");
        if (!Enum.IsDefined(typeof(StaffRole), role)) return Result.Failure("Invalid staff role.");
        if (!Enum.IsDefined(typeof(StaffStatus), status)) return Result.Failure("Invalid staff status.");
        if (!string.IsNullOrWhiteSpace(email) && await _staffRepository.EmailExistsAsync(email.Trim(), excludeId, cancellationToken)) return Result.Failure("Email already exists.");
        if (!string.IsNullOrWhiteSpace(phone) && await _staffRepository.PhoneExistsAsync(phone.Trim(), excludeId, cancellationToken)) return Result.Failure("Phone already exists.");
        return Result.Success();
    }

    private static GetStaffMemberDto MapToDto(StaffMember staff)
    {
        return new GetStaffMemberDto
        {
            Id = staff.Id,
            IdentityUserId = staff.IdentityUserId,
            FirstName = staff.FirstName,
            LastName = staff.LastName,
            MiddleName = staff.MiddleName,
            FullName = ServiceHelpers.BuildStaffName(staff),
            Phone = staff.Phone,
            Email = staff.Email,
            Role = staff.Role,
            Status = staff.Status,
            HireDate = staff.HireDate,
            FiredDate = staff.FiredDate,
            Note = staff.Note,
            OrdersCount = staff.Orders?.Count(x => !x.IsDeleted) ?? 0,
            TotalTips = staff.Tips?.Where(x => !x.IsDeleted).Sum(x => x.Amount) ?? 0,
            CreatedAt = staff.CreatedAt,
            UpdatedAt = staff.UpdatedAt
        };
    }

    private static GetStaffMemberAdminDto MapToAdminDto(StaffMember staff)
    {
        return new GetStaffMemberAdminDto
        {
            Id = staff.Id,
            IdentityUserId = staff.IdentityUserId,
            FirstName = staff.FirstName,
            LastName = staff.LastName,
            MiddleName = staff.MiddleName,
            FullName = ServiceHelpers.BuildStaffName(staff),
            Phone = staff.Phone,
            Email = staff.Email,
            Role = staff.Role,
            Status = staff.Status,
            HireDate = staff.HireDate,
            FiredDate = staff.FiredDate,
            Salary = staff.Salary,
            Note = staff.Note,
            OrdersCount = staff.Orders?.Count(x => !x.IsDeleted) ?? 0,
            TotalTips = staff.Tips?.Where(x => !x.IsDeleted).Sum(x => x.Amount) ?? 0,
            CreatedAt = staff.CreatedAt,
            UpdatedAt = staff.UpdatedAt
        };
    }
}
