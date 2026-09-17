using Cafe.Api.Common;
using Cafe.Application.DTOs.Reservations;
using Cafe.Application.Interfaces.Services;
using Cafe.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/reservations")]
public class ReservationsController : ControllerBase
{
    private readonly IReservationService _reservationService;
    private readonly IOrderService _orderService;

    public ReservationsController(IReservationService reservationService, IOrderService orderService)
    {
        _reservationService = reservationService;
        _orderService = orderService;
    }

    [HttpGet]
    [Authorize(Roles = RolePolicies.AdminManagerWaiterCashier)]
    public async Task<IActionResult> GetAll([FromQuery] ReservationFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _reservationService.GetAllAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminManagerWaiterCashier)]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _reservationService.GetByIdAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    // Booking requires an account: any staff member on a guest's behalf, or a logged-in Client
    // booking for themselves (ReservationService.CreateAsync forces CustomerId from the token
    // for a Client caller - see there). Anonymous/guest-without-account booking was removed by
    // request; the client-app now gates this action behind login/registration.
    [HttpPost]
    [Authorize(Roles = RolePolicies.AllStaff + "," + SystemRoles.Client)]
    public async Task<IActionResult> Create([FromBody] CreateReservationDto dto, CancellationToken cancellationToken)
    {
        var result = await _reservationService.CreateAsync(dto, cancellationToken);
        return result.ToActionResult();
    }

    // Client-app self-service - fully separate from GetAll/GetById above (which stay
    // staff-only and unscoped) to avoid any risk of widening those. Always scoped to the
    // caller's own reservations inside ReservationService.
    [HttpGet("mine")]
    [Authorize(Roles = SystemRoles.Client)]
    public async Task<IActionResult> GetMine([FromQuery] ReservationFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _reservationService.GetMyReservationsAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("mine/{id:int}")]
    [Authorize(Roles = SystemRoles.Client)]
    public async Task<IActionResult> GetMineById(int id, CancellationToken cancellationToken)
    {
        var result = await _reservationService.GetMyReservationByIdAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminManagerWaiter)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateReservationDto dto, CancellationToken cancellationToken)
    {
        var result = await _reservationService.UpdateAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = RolePolicies.AdminManagerWaiter)]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateReservationStatusDto dto, CancellationToken cancellationToken)
    {
        var result = await _reservationService.UpdateStatusAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var result = await _reservationService.DeleteAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    // Item mutations on the returned order go through the existing
    // POST/PUT/DELETE /api/orders/{id}/items endpoints - not duplicated here (see plan).
    [HttpPost("{id:int}/pre-order")]
    [Authorize(Roles = RolePolicies.AdminManagerWaiter)]
    public async Task<IActionResult> CreatePreOrder(int id, CancellationToken cancellationToken)
    {
        var result = await _orderService.CreatePreOrderAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("{id:int}/pre-order")]
    [Authorize(Roles = RolePolicies.AdminManagerWaiter)]
    public async Task<IActionResult> GetPreOrder(int id, CancellationToken cancellationToken)
    {
        var result = await _orderService.GetPreOrderAsync(id, cancellationToken);
        return result.ToActionResult();
    }
}
