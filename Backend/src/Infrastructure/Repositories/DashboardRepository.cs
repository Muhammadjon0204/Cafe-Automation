using Cafe.Application.DTOs.Dashboard;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Domain.Enums;
using Cafe.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class DashboardRepository : IDashboardRepository
{
    private const int PopularDishesTake = 5;

    private readonly AppDbContext _context;

    public DashboardRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var todayStart = DateTime.UtcNow.Date;
        var todayEnd = todayStart.AddDays(1);

        var ordersToday = _context.Orders.Where(x => x.OrderedAt >= todayStart && x.OrderedAt < todayEnd);

        var totalOrdersToday = await ordersToday.CountAsync(cancellationToken);
        var totalRevenueToday = await ordersToday
            .Where(x => x.Status == OrderStatus.Closed)
            .SumAsync(x => x.TotalAmount, cancellationToken);

        var activeOrders = await _context.Orders.CountAsync(x =>
            x.Status != OrderStatus.Closed && x.Status != OrderStatus.Cancelled, cancellationToken);
        var closedOrders = await ordersToday.CountAsync(x => x.Status == OrderStatus.Closed, cancellationToken);
        var cancelledOrders = await ordersToday.CountAsync(x => x.Status == OrderStatus.Cancelled, cancellationToken);

        var totalCustomers = await _context.Customers.CountAsync(cancellationToken);

        var totalTables = await _context.CafeTables.CountAsync(cancellationToken);
        var occupiedTables = await _context.CafeTables.CountAsync(x => x.Status == TableStatus.Occupied, cancellationToken);
        var freeTables = await _context.CafeTables.CountAsync(x => x.Status == TableStatus.Free, cancellationToken);

        var popularDishes = await _context.OrderItems
            .Where(x => x.Status != OrderItemStatus.Cancelled && x.Order != null && x.Order.OrderedAt >= todayStart && x.Order.OrderedAt < todayEnd)
            .GroupBy(x => new { x.DishId, DishName = x.Dish!.Name })
            .Select(g => new PopularDishDto
            {
                DishId = g.Key.DishId,
                DishName = g.Key.DishName,
                TotalQuantitySold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.TotalPrice)
            })
            .OrderByDescending(x => x.TotalQuantitySold)
            .Take(PopularDishesTake)
            .ToListAsync(cancellationToken);

        return new DashboardSummaryDto
        {
            TotalOrdersToday = totalOrdersToday,
            TotalRevenueToday = totalRevenueToday,
            ActiveOrders = activeOrders,
            ClosedOrders = closedOrders,
            CancelledOrders = cancelledOrders,
            TotalCustomers = totalCustomers,
            TotalTables = totalTables,
            OccupiedTables = occupiedTables,
            FreeTables = freeTables,
            PopularDishes = popularDishes
        };
    }
}
