namespace Cafe.Domain.Common;

public class BaseEntity
{
    public int Id { get; set; }

    // Only wired up as a real optimistic-concurrency token (via .IsRowVersion()) on Order,
    // OrderItem, and Payment — those are the entities with concurrent-write risk (kitchen,
    // waiter, and cashier touching the same order at once). Every other entity's configuration
    // calls .Ignore(x => x.RowVersion) so this doesn't turn into an unused column everywhere.
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}
