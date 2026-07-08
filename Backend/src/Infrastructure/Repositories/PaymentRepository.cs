using Cafe.Application.Interfaces.Repositories;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;
using Cafe.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class PaymentRepository : IPaymentRepository
{
    private readonly AppDbContext _context;

    public PaymentRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<List<Payment>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return _context.Payments
            .Include(x => x.Order)
            .Include(x => x.Cashier)
            .ToListAsync(cancellationToken);
    }

    public Task<Payment?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Payments
            .Include(x => x.Order)
            .Include(x => x.Cashier)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<List<Payment>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default)
    {
        return _context.Payments
            .Include(x => x.Order)
            .Include(x => x.Cashier)
            .Where(x => x.OrderId == orderId)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Payment payment, CancellationToken cancellationToken = default)
    {
        await _context.Payments.AddAsync(payment, cancellationToken);
    }

    public void Update(Payment payment)
    {
        _context.Payments.Update(payment);
    }

    public void Delete(Payment payment)
    {
        _context.Payments.Remove(payment);
    }

    public Task<decimal> GetPaidAmountByOrderIdAsync(int orderId, CancellationToken cancellationToken = default)
    {
        return _context.Payments
            .Where(x => x.OrderId == orderId && x.Status == PaymentStatus.Paid)
            .SumAsync(x => x.Amount, cancellationToken);
    }
}
