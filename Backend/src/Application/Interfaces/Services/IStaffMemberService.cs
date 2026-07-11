using Cafe.Application.DTOs.Staff;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface IStaffMemberService
{
    Task<Result<PagedResult<GetStaffMemberDto>>> GetAllAsync(StaffMemberFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<GetStaffMemberDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<PagedResult<GetStaffMemberAdminDto>>> GetAllAdminAsync(StaffMemberFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<GetStaffMemberAdminDto>> GetByIdAdminAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<GetStaffMemberDto>> CreateAsync(CreateStaffMemberDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetStaffMemberDto>> UpdateAsync(int id, UpdateStaffMemberDto dto, CancellationToken cancellationToken = default);

    Task<Result> UpdateStatusAsync(int id, UpdateStaffStatusDto dto, CancellationToken cancellationToken = default);

    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
