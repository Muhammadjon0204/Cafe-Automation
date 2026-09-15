using Cafe.Api.Hubs;
using Cafe.Application.Interfaces.Services;
using Microsoft.AspNetCore.SignalR;

namespace Cafe.Api.Realtime;

public class SignalRRealtimeNotifier : IRealtimeNotifier
{
    private readonly IHubContext<OrdersHub> _hubContext;

    public SignalRRealtimeNotifier(IHubContext<OrdersHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task OrderChangedAsync(int orderId, int? cafeTableId, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients.All.SendAsync("orderChanged", new { orderId, cafeTableId }, cancellationToken);
    }

    public Task TableChangedAsync(int cafeTableId, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients.All.SendAsync("tableChanged", new { cafeTableId }, cancellationToken);
    }
}
