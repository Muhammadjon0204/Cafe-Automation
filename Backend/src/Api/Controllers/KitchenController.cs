using Cafe.Api.Common;
using Cafe.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/kitchen")]
[Authorize(Roles = RolePolicies.AdminManagerWaiterKitchen)]
public class KitchenController : ControllerBase
{
    private readonly IOrderService _orderService;

    public KitchenController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    // Scheduled pre-orders in range, sorted by their reservation's time - the kitchen's
    // "future" view, kept out of the normal working queue until promoted (TZ 6).
    [HttpGet("upcoming-orders")]
    public async Task<IActionResult> GetUpcomingOrders([FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, CancellationToken cancellationToken)
    {
        var result = await _orderService.GetUpcomingScheduledAsync(fromDate, toDate, cancellationToken);
        return result.ToActionResult();
    }
}
