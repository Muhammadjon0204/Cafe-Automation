using Cafe.Application.Interfaces.Repositories;
using Cafe.Domain.Entities;
using Cafe.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class CafeTableRepository : ICafeTableRepository
{
    private readonly AppDbContext _context;

    public CafeTableRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<List<CafeTable>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return _context.CafeTables.ToListAsync(cancellationToken);
    }

    public Task<CafeTable?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.CafeTables.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(CafeTable table, CancellationToken cancellationToken = default)
    {
        await _context.CafeTables.AddAsync(table, cancellationToken);
    }

    public void Update(CafeTable table)
    {
        _context.CafeTables.Update(table);
    }

    public void Delete(CafeTable table)
    {
        _context.CafeTables.Remove(table);
    }

    public Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.CafeTables.AnyAsync(x => x.Id == id, cancellationToken);
    }

    public Task<bool> TableNumberExistsAsync(int tableNumber, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        return _context.CafeTables.AnyAsync(x => x.TableNumber == tableNumber && (!excludeId.HasValue || x.Id != excludeId.Value), cancellationToken);
    }
}
