using Cafe.Application.Interfaces.Repositories;
using Cafe.Domain.Entities;
using Cafe.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class OrderItemRepository : IOrderItemRepository
{
    private readonly AppDbContext _context;

    public OrderItemRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<OrderItem?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.OrderItems.Include(x => x.Dish).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<List<OrderItem>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default)
    {
        return _context.OrderItems
            .Include(x => x.Dish)
            .Where(x => x.OrderId == orderId)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(OrderItem orderItem, CancellationToken cancellationToken = default)
    {
        await _context.OrderItems.AddAsync(orderItem, cancellationToken);
    }

    public void Update(OrderItem orderItem)
    {
        _context.OrderItems.Update(orderItem);
    }

    public void Delete(OrderItem orderItem)
    {
        _context.OrderItems.Remove(orderItem);
    }
}
