using Cafe.Application.Interfaces.Repositories;
using Cafe.Domain.Entities;
using Cafe.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class DiscountRepository : IDiscountRepository
{
    private readonly AppDbContext _context;

    public DiscountRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<Discount?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Discounts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<List<Discount>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default)
    {
        return _context.Discounts
            .Include(x => x.Order)
            .Where(x => x.OrderId == orderId)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Discount discount, CancellationToken cancellationToken = default)
    {
        await _context.Discounts.AddAsync(discount, cancellationToken);
    }

    public void Update(Discount discount)
    {
        _context.Discounts.Update(discount);
    }

    public void Delete(Discount discount)
    {
        _context.Discounts.Remove(discount);
    }
}
