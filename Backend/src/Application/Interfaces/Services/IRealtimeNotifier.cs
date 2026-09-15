namespace Cafe.Application.Interfaces.Services;

/// <summary>
/// Push-only "something changed, go refetch" signal — deliberately carries just IDs, not
/// DTOs, so every client still goes through the normal (role-scoped, authorized) REST GET
/// to learn what actually changed. Keeps the realtime channel from becoming a second,
/// unaudited path for data that the REST layer already guards (e.g. Waiter row-level
/// scoping in OrderService.GetAllAsync). Implemented in Cafe.Api (SignalR is a web
/// concern) and registered directly in Program.cs, mirroring ICurrentUserService.
/// </summary>
public interface IRealtimeNotifier
{
    Task OrderChangedAsync(int orderId, int? cafeTableId, CancellationToken cancellationToken = default);

    Task TableChangedAsync(int cafeTableId, CancellationToken cancellationToken = default);
}
