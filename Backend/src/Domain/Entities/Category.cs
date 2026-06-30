using Cafe.Domain.Common;

namespace Cafe.Domain.Entities;

public class Category : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; }

    public ICollection<Dish> Dishes { get; set; } = new List<Dish>();
}
