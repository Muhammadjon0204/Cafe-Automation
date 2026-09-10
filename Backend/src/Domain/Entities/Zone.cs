using Cafe.Domain.Common;

namespace Cafe.Domain.Entities;

public class Zone : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public string? BackgroundImageUrl { get; set; }

    public ICollection<CafeTable> CafeTables { get; set; } = new List<CafeTable>();
}
