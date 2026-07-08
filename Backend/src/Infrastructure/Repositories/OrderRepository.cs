using Cafe.Application.Common.Specifications;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Infrastructure.Data;
using Cafe.Infrastructure.Specifications;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _context;

    public OrderRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<PagedResult<Order>> GetAsync(ISpecification<Order> spec, CancellationToken cancellationToken = default)
    {
        return SpecificationEvaluator<Order>.GetPagedResultAsync(_context.Orders.AsQueryable(), spec, cancellationToken);
    }

    public Task<Order?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Orders.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<Order?> GetByIdWithDetailsAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Orders
            .Include(x => x.Customer)
            .Include(x => x.CafeTable)
            .Include(x => x.Waiter)
            .Include(x => x.CreatedByStaffMember)
            .Include(x => x.Items).ThenInclude(i => i.Dish)
            .Include(x => x.Payments)
            .Include(x => x.Discounts)
            .Include(x => x.Tips)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(Order order, CancellationToken cancellationToken = default)
    {
        await _context.Orders.AddAsync(order, cancellationToken);
    }

    public void Update(Order order)
    {
        _context.Orders.Update(order);
    }

    public void Delete(Order order)
    {
        _context.Orders.Remove(order);
    }

    public Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Orders.AnyAsync(x => x.Id == id, cancellationToken);
    }

    public Task<bool> OrderNumberExistsAsync(string orderNumber, CancellationToken cancellationToken = default)
    {
        return _context.Orders.AnyAsync(x => x.OrderNumber == orderNumber, cancellationToken);
    }
}
