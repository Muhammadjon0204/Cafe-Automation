using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface IStaffMemberRepository
{
    Task<List<StaffMember>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<StaffMember?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<StaffMember?> GetByIdentityUserIdAsync(string identityUserId, CancellationToken cancellationToken = default);

    Task AddAsync(StaffMember staffMember, CancellationToken cancellationToken = default);

    void Update(StaffMember staffMember);

    void Delete(StaffMember staffMember);

    Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> EmailExistsAsync(string email, int? excludeId = null, CancellationToken cancellationToken = default);

    Task<bool> PhoneExistsAsync(string phone, int? excludeId = null, CancellationToken cancellationToken = default);
}
