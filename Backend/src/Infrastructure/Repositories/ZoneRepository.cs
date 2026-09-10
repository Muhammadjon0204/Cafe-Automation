using Cafe.Application.Interfaces.Repositories;
using Cafe.Domain.Entities;
using Cafe.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class ZoneRepository : IZoneRepository
{
    private readonly AppDbContext _context;

    public ZoneRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<List<Zone>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return _context.Zones.Include(x => x.CafeTables).ToListAsync(cancellationToken);
    }

    public Task<Zone?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Zones.Include(x => x.CafeTables).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(Zone zone, CancellationToken cancellationToken = default)
    {
        await _context.Zones.AddAsync(zone, cancellationToken);
    }

    public void Update(Zone zone)
    {
        _context.Zones.Update(zone);
    }

    public void Delete(Zone zone)
    {
        _context.Zones.Remove(zone);
    }

    public Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Zones.AnyAsync(x => x.Id == id, cancellationToken);
    }

    public Task<bool> NameExistsAsync(string name, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        return _context.Zones.AnyAsync(x => x.Name == name && (!excludeId.HasValue || x.Id != excludeId.Value), cancellationToken);
    }
}
