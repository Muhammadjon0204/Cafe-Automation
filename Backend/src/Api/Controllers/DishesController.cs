using Cafe.Api.Common;
using Cafe.Application.DTOs.Dishes;
using Cafe.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/dishes")]
public class DishesController : ControllerBase
{
    private readonly IDishService _dishService;

    public DishesController(IDishService dishService)
    {
        _dishService = dishService;
    }

    // Public menu browsing (no CostPrice) — no account required.
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] DishFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _dishService.GetAllAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _dishService.GetByIdAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    // Admin-only projection that includes CostPrice.
    [HttpGet("admin")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> GetAllAdmin([FromQuery] DishFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _dishService.GetAllAdminAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("admin/{id:int}")]
    [Authorize(Roles = RolePolicies.AdminOnly)]
    public async Task<IActionResult> GetByIdAdmin(int id, CancellationToken cancellationToken)
    {
        var result = await _dishService.GetByIdAdminAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Create([FromBody] CreateDishDto dto, CancellationToken cancellationToken)
    {
        var result = await _dishService.CreateAsync(dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDishDto dto, CancellationToken cancellationToken)
    {
        var result = await _dishService.UpdateAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPatch("{id:int}/availability")]
    [Authorize(Roles = RolePolicies.AdminManagerWaiter)]
    public async Task<IActionResult> UpdateAvailability(int id, [FromBody] UpdateDishAvailabilityDto dto, CancellationToken cancellationToken)
    {
        var result = await _dishService.UpdateAvailabilityAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var result = await _dishService.DeleteAsync(id, cancellationToken);
        return result.ToActionResult();
    }
}
