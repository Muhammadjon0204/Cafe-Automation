using Cafe.Api.Common;
using Cafe.Application.DTOs.Orders;
using Cafe.Application.Interfaces.Identity;
using Cafe.Application.Interfaces.Services;
using Cafe.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

// Client-app self-service delivery ordering - deliberately a separate controller from
// OrdersController (staff-only, [Authorize(Roles = AllStaff)] at class level) rather than a
// Client-role method added there: a class-level Authorize combines with any method-level one via
// AND, so a Client-only method under an AllStaff class would always 403 for Client callers.
// Keeping this fully separate means zero risk to the existing staff RBAC matrix.
[ApiController]
[Route("api/customer-orders")]
[Authorize(Roles = SystemRoles.Client)]
public class CustomerOrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ICurrentUserService _currentUserService;

    public CustomerOrdersController(IOrderService orderService, ICurrentUserService currentUserService)
    {
        _orderService = orderService;
        _currentUserService = currentUserService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDeliveryOrderDto dto, CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.CustomerId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var result = await _orderService.CreateDeliveryOrderAsync(customerId.Value, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet]
    public async Task<IActionResult> GetMine([FromQuery] OrderFilterDto filter, CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.CustomerId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var result = await _orderService.GetMyOrdersAsync(customerId.Value, filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetMineById(int id, CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.CustomerId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var result = await _orderService.GetMyOrderByIdAsync(customerId.Value, id, cancellationToken);
        return result.ToActionResult();
    }
}
