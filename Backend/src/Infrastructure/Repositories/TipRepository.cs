using Cafe.Application.Interfaces.Repositories;
using Cafe.Domain.Entities;
using Cafe.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class TipRepository : ITipRepository
{
    private readonly AppDbContext _context;

    public TipRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<Tip?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Tips.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<List<Tip>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default)
    {
        return _context.Tips
            .Include(x => x.Order)
            .Include(x => x.StaffMember)
            .Where(x => x.OrderId == orderId)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Tip tip, CancellationToken cancellationToken = default)
    {
        await _context.Tips.AddAsync(tip, cancellationToken);
    }

    public void Update(Tip tip)
    {
        _context.Tips.Update(tip);
    }

    public void Delete(Tip tip)
    {
        _context.Tips.Remove(tip);
    }
}
