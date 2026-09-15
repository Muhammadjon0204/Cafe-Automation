using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Cafe.Api.Hubs;

/// <summary>
/// Push-only — clients never invoke methods on this hub, they just listen for
/// "orderChanged"/"tableChanged" broadcasts (see IRealtimeNotifier/SignalRRealtimeNotifier)
/// and refetch through the normal REST endpoints. Any authenticated staff member may
/// connect; the payload is IDs only, so there's no role-specific data to gate per
/// connection.
/// </summary>
[Authorize]
public class OrdersHub : Hub
{
}
