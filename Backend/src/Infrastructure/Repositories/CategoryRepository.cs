using Cafe.Application.Interfaces.Repositories;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;
using Cafe.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cafe.Infrastructure.Repositories;

public class CategoryRepository : ICategoryRepository
{
    private readonly AppDbContext _context;

    public CategoryRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<List<Category>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return _context.Categories.Include(x => x.Dishes).ToListAsync(cancellationToken);
    }

    public Task<Category?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Categories.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<Category?> GetByIdWithDishesAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Categories.Include(x => x.Dishes).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(Category category, CancellationToken cancellationToken = default)
    {
        await _context.Categories.AddAsync(category, cancellationToken);
    }

    public void Update(Category category)
    {
        _context.Categories.Update(category);
    }

    public void Delete(Category category)
    {
        _context.Categories.Remove(category);
    }

    public Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return _context.Categories.AnyAsync(x => x.Id == id, cancellationToken);
    }

    public Task<bool> NameExistsAsync(string name, int? excludeId = null, CancellationToken cancellationToken = default)
    {
        return _context.Categories.AnyAsync(x => x.Name == name && (!excludeId.HasValue || x.Id != excludeId.Value), cancellationToken);
    }

    public Task<bool> HasActiveDishesAsync(int categoryId, CancellationToken cancellationToken = default)
    {
        return _context.Dishes.AnyAsync(x => x.CategoryId == categoryId && x.Status == DishStatus.Active, cancellationToken);
    }
}
