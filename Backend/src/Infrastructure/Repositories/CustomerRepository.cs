using Cafe.Application.Interfaces.Repositories;
using Cafe.Domain.Entities;
using Cafe.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class CustomerRepository : ICustomerRepository
{
    private readonly AppDbContext _context;

    public CustomerRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<List<Customer>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return _context.Customers.Include(x => x.Orders).ToListAsync(cancellationToken);
    }

    public Task<Customer?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Customers.Include(x => x.Orders).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(Customer customer, CancellationToken cancellationToken = default)
    {
        await _context.Customers.AddAsync(customer, cancellationToken);
    }

    public void Update(Customer customer)
    {
        _context.Customers.Update(customer);
    }

    public void Delete(Customer customer)
    {
        _context.Customers.Remove(customer);
    }

    public Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Customers.AnyAsync(x => x.Id == id, cancellationToken);
    }

    public Task<bool> PhoneExistsAsync(string phone, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        return _context.Customers.AnyAsync(x => x.Phone == phone && (!excludeId.HasValue || x.Id != excludeId.Value), cancellationToken);
    }

    public Task<bool> EmailExistsAsync(string email, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        return _context.Customers.AnyAsync(x => x.Email == email && (!excludeId.HasValue || x.Id != excludeId.Value), cancellationToken);
    }
}
