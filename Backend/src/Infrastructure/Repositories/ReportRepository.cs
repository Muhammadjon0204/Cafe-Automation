using Cafe.Application.DTOs.Reports;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Domain.Enums;
using Cafe.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class ReportRepository : IReportRepository
{
    private readonly AppDbContext _context;

    public ReportRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SalesReportDto> GetSalesReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var orders = _context.Orders.Where(x =>
            x.Status == OrderStatus.Closed &&
            (!filter.FromDate.HasValue || x.OrderedAt >= filter.FromDate.Value) &&
            (!filter.ToDate.HasValue || x.OrderedAt <= filter.ToDate.Value));

        var totalOrders = await orders.CountAsync(cancellationToken);
        var totalRevenue = await orders.SumAsync(x => x.TotalAmount, cancellationToken);
        var totalDiscounts = await orders.SumAsync(x => x.DiscountAmount, cancellationToken);
        var totalTips = await orders.SumAsync(x => x.TipAmount, cancellationToken);

        return new SalesReportDto
        {
            FromDate = filter.FromDate,
            ToDate = filter.ToDate,
            TotalOrders = totalOrders,
            TotalRevenue = totalRevenue,
            AverageOrderAmount = totalOrders > 0 ? totalRevenue / totalOrders : 0,
            TotalDiscounts = totalDiscounts,
            TotalTips = totalTips
        };
    }

    public async Task<List<PopularDishesReportDto>> GetPopularDishesReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var items = _context.OrderItems.Where(x =>
            x.Status != OrderItemStatus.Cancelled &&
            x.Order != null && x.Order.Status == OrderStatus.Closed &&
            (!filter.FromDate.HasValue || x.Order.OrderedAt >= filter.FromDate.Value) &&
            (!filter.ToDate.HasValue || x.Order.OrderedAt <= filter.ToDate.Value));

        return await items
            .GroupBy(x => new { x.DishId, DishName = x.Dish!.Name })
            .Select(g => new PopularDishesReportDto
            {
                DishId = g.Key.DishId,
                DishName = g.Key.DishName,
                TotalQuantitySold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.TotalPrice)
            })
            .OrderByDescending(x => x.TotalQuantitySold)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<WaiterPerformanceReportDto>> GetWaiterPerformanceReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var orders = _context.Orders.Where(x =>
            x.Status == OrderStatus.Closed &&
            x.WaiterId != null &&
            (!filter.FromDate.HasValue || x.OrderedAt >= filter.FromDate.Value) &&
            (!filter.ToDate.HasValue || x.OrderedAt <= filter.ToDate.Value));

        return await orders
            .GroupBy(x => new { WaiterId = x.WaiterId!.Value, x.Waiter!.FirstName, x.Waiter!.LastName, x.Waiter!.MiddleName })
            .Select(g => new WaiterPerformanceReportDto
            {
                WaiterId = g.Key.WaiterId,
                WaiterName = (g.Key.FirstName + " " + g.Key.MiddleName + " " + g.Key.LastName).Replace("  ", " ").Trim(),
                TotalOrders = g.Count(),
                TotalSales = g.Sum(x => x.TotalAmount),
                TotalTips = g.Sum(x => x.TipAmount)
            })
            .OrderByDescending(x => x.TotalSales)
            .ToListAsync(cancellationToken);
    }

    public async Task<PaymentReportDto> GetPaymentReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var payments = _context.Payments.Where(x =>
            x.Status == PaymentStatus.Paid &&
            (!filter.FromDate.HasValue || x.PaidAt >= filter.FromDate.Value) &&
            (!filter.ToDate.HasValue || x.PaidAt <= filter.ToDate.Value));

        var totals = await payments
            .GroupBy(x => x.Method)
            .Select(g => new { Method = g.Key, Total = g.Sum(x => x.Amount) })
            .ToListAsync(cancellationToken);

        var cashTotal = totals.FirstOrDefault(x => x.Method == PaymentMethod.Cash)?.Total ?? 0;
        var cardTotal = totals.FirstOrDefault(x => x.Method == PaymentMethod.Card)?.Total ?? 0;
        var onlineTotal = totals.FirstOrDefault(x => x.Method == PaymentMethod.Online)?.Total ?? 0;
        var mixedTotal = totals.FirstOrDefault(x => x.Method == PaymentMethod.Mixed)?.Total ?? 0;

        return new PaymentReportDto
        {
            CashTotal = cashTotal,
            CardTotal = cardTotal,
            OnlineTotal = onlineTotal,
            MixedTotal = mixedTotal,
            GrandTotal = cashTotal + cardTotal + onlineTotal + mixedTotal
        };
    }
}
