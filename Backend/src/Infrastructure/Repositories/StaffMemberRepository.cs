using Cafe.Application.Common.Specifications;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Infrastructure.Data;
using Cafe.Infrastructure.Specifications;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class StaffMemberRepository : IStaffMemberRepository
{
    private readonly AppDbContext _context;

    public StaffMemberRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<PagedResult<StaffMember>> GetAsync(ISpecification<StaffMember> spec, CancellationToken cancellationToken = default)
    {
        return SpecificationEvaluator<StaffMember>.GetPagedResultAsync(_context.StaffMembers.AsQueryable(), spec, cancellationToken);
    }

    public Task<StaffMember?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.StaffMembers
            .Include(x => x.Orders)
            .Include(x => x.Tips)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<StaffMember?> GetByIdentityUserIdAsync(string identityUserId, CancellationToken cancellationToken = default)
    {
        return _context.StaffMembers.FirstOrDefaultAsync(x => x.IdentityUserId == identityUserId, cancellationToken);
    }

    public async Task AddAsync(StaffMember staffMember, CancellationToken cancellationToken = default)
    {
        await _context.StaffMembers.AddAsync(staffMember, cancellationToken);
    }

    public void Update(StaffMember staffMember)
    {
        _context.StaffMembers.Update(staffMember);
    }

    public void Delete(StaffMember staffMember)
    {
        _context.StaffMembers.Remove(staffMember);
    }

    public Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.StaffMembers.AnyAsync(x => x.Id == id, cancellationToken);
    }

    public Task<bool> EmailExistsAsync(string email, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        return _context.StaffMembers.AnyAsync(x => x.Email == email && (!excludeId.HasValue || x.Id != excludeId.Value), cancellationToken);
    }

    public Task<bool> PhoneExistsAsync(string phone, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        return _context.StaffMembers.AnyAsync(x => x.Phone == phone && (!excludeId.HasValue || x.Id != excludeId.Value), cancellationToken);
    }
}
