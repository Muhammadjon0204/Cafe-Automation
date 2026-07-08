using Cafe.Application.Common.Specifications;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Infrastructure.Data;
using Cafe.Infrastructure.Specifications;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class DishRepository : IDishRepository
{
    private readonly AppDbContext _context;

    public DishRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<PagedResult<Dish>> GetAsync(ISpecification<Dish> spec, CancellationToken cancellationToken = default)
    {
        return SpecificationEvaluator<Dish>.GetPagedResultAsync(_context.Dishes.AsQueryable(), spec, cancellationToken);
    }

    public Task<Dish?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Dishes.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<Dish?> GetByIdWithCategoryAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Dishes.Include(x => x.Category).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(Dish dish, CancellationToken cancellationToken = default)
    {
        await _context.Dishes.AddAsync(dish, cancellationToken);
    }

    public void Update(Dish dish)
    {
        _context.Dishes.Update(dish);
    }

    public void Delete(Dish dish)
    {
        _context.Dishes.Remove(dish);
    }

    public Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Dishes.AnyAsync(x => x.Id == id, cancellationToken);
    }

    public Task<bool> NameExistsAsync(string name, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        return _context.Dishes.AnyAsync(x => x.Name == name && (!excludeId.HasValue || x.Id != excludeId.Value), cancellationToken);
    }

    public Task<bool> IsUsedInOrdersAsync(int dishId, CancellationToken cancellationToken = default)
    {
        return _context.OrderItems.AnyAsync(x => x.DishId == dishId, cancellationToken);
    }
}
