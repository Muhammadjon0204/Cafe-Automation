using Cafe.Api.Common;
using Cafe.Application.DTOs.CafeTables;
using Cafe.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/cafe-tables")]
public class CafeTablesController : ControllerBase
{
    private readonly ICafeTableService _cafeTableService;

    public CafeTablesController(ICafeTableService cafeTableService)
    {
        _cafeTableService = cafeTableService;
    }

    // Read access is public so a booking widget can show table availability.
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] CafeTableFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _cafeTableService.GetAllAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await _cafeTableService.GetByIdAsync(id, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Create([FromBody] CreateCafeTableDto dto, CancellationToken cancellationToken)
    {
        var result = await _cafeTableService.CreateAsync(dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCafeTableDto dto, CancellationToken cancellationToken)
    {
        var result = await _cafeTableService.UpdateAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = RolePolicies.AdminManagerWaiter)]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateCafeTableStatusDto dto, CancellationToken cancellationToken)
    {
        var result = await _cafeTableService.UpdateStatusAsync(id, dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var result = await _cafeTableService.DeleteAsync(id, cancellationToken);
        return result.ToActionResult();
    }
}
