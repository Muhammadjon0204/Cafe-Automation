using Cafe.Api.Common;
using Cafe.Application.DTOs.Orders;
using Cafe.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize(Roles = RolePolicies.AllStaff)]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    // Waiter row-level scoping (own orders only) is enforced inside OrderService using
    // ICurrentUserService, not here — see Phase 2.
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] OrderFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _orderService.GetAllAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _orderService.GetByIdAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost]
    [Authorize(Roles = RolePolicies.AdminManagerWaiter)]
    public async Task<IActionResult> Create([FromBody] CreateOrderDto dto, CancellationToken cancellationToken)
    {
        var result = await _orderService.CreateAsync(dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost("{id:int}/items")]
    [Authorize(Roles = RolePolicies.AdminManagerWaiter)]
    public async Task<IActionResult> AddItem(int id, [FromBody] AddOrderItemDto dto, CancellationToken cancellationToken)
    {
        var result = await _orderService.AddItemAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPut("{id:int}/items/{itemId:int}")]
    [Authorize(Roles = RolePolicies.AdminManagerWaiter)]
    public async Task<IActionResult> UpdateItem(int id, int itemId, [FromBody] UpdateOrderItemDto dto, CancellationToken cancellationToken)
    {
        var result = await _orderService.UpdateItemAsync(id, itemId, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpDelete("{id:int}/items/{itemId:int}")]
    [Authorize(Roles = RolePolicies.AdminManagerWaiter)]
    public async Task<IActionResult> RemoveItem(int id, int itemId, [FromBody] RemoveOrderItemDto? dto, CancellationToken cancellationToken)
    {
        var result = await _orderService.RemoveItemAsync(id, itemId, dto ?? new RemoveOrderItemDto(), cancellationToken);
        return result.ToActionResult();
    }

    // Open to all staff at the attribute level; OrderService itself restricts a Kitchen-only
    // caller to the Accepted/Cooking/Ready transitions (see Phase 4 RBAC notes).
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto dto, CancellationToken cancellationToken)
    {
        var result = await _orderService.UpdateStatusAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = RolePolicies.AdminManagerWaiter)]
    public async Task<IActionResult> Cancel(int id, [FromBody] CancelOrderDto dto, CancellationToken cancellationToken)
    {
        var result = await _orderService.CancelAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost("{id:int}/close")]
    [Authorize(Roles = RolePolicies.AdminManagerCashier)]
    public async Task<IActionResult> Close(int id, [FromBody] CloseOrderDto dto, CancellationToken cancellationToken)
    {
        var result = await _orderService.CloseAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }
}
