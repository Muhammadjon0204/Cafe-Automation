using Cafe.Api.Common;
using Cafe.Application.DTOs.Reservations;
using Cafe.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/reservations")]
public class ReservationsController : ControllerBase
{
    private readonly IReservationService _reservationService;

    public ReservationsController(IReservationService reservationService)
    {
        _reservationService = reservationService;
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

    // Public booking: a guest can request a table without an account, as well as any staff
    // member on the guest's behalf.
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] CreateReservationDto dto, CancellationToken cancellationToken)
    {
        var result = await _reservationService.CreateAsync(dto, cancellationToken);
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
}
