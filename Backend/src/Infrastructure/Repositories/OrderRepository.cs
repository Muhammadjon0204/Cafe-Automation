using Cafe.Application.Common.Specifications;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;
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
            .Include(x => x.Reservation)
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

    public Task<Order?> GetActiveByTableIdAsync(int cafeTableId, CancellationToken cancellationToken = default)
    {
        return _context.Orders
            .Include(x => x.Customer)
            .Include(x => x.CafeTable)
            .Include(x => x.Waiter)
            .Include(x => x.CreatedByStaffMember)
            .Include(x => x.Items).ThenInclude(i => i.Dish)
            .Where(x => x.CafeTableId == cafeTableId && x.Status != OrderStatus.Closed && x.Status != OrderStatus.Cancelled)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<Order?> GetByReservationIdAsync(int reservationId, CancellationToken cancellationToken = default)
    {
        return _context.Orders
            .Include(x => x.Customer)
            .Include(x => x.CafeTable)
            .Include(x => x.Waiter)
            .Include(x => x.CreatedByStaffMember)
            .Include(x => x.Items).ThenInclude(i => i.Dish)
            .Where(x => x.ReservationId == reservationId && x.Status != OrderStatus.Cancelled)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<List<Order>> GetDueForKitchenPromotionAsync(DateTime asOfUtc, CancellationToken cancellationToken = default)
    {
        return _context.Orders
            .Include(x => x.Items)
            .Where(x => x.Status == OrderStatus.Scheduled && x.SendToKitchenAt != null && x.SendToKitchenAt <= asOfUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<List<Order>> GetUpcomingScheduledAsync(DateTime fromDateUtc, DateTime toDateUtc, CancellationToken cancellationToken = default)
    {
        return _context.Orders
            .Include(x => x.CafeTable)
            .Include(x => x.Reservation)
            .Include(x => x.Items).ThenInclude(i => i.Dish)
            .Where(x => x.Status == OrderStatus.Scheduled &&
                x.Reservation != null &&
                x.Reservation.ReservedAt >= fromDateUtc &&
                x.Reservation.ReservedAt <= toDateUtc)
            .OrderBy(x => x.Reservation!.ReservedAt)
            .ToListAsync(cancellationToken);
    }
}
