using Cafe.Api.Common;
using Cafe.Application.DTOs.Tips;
using Cafe.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/tips")]
[Authorize(Roles = RolePolicies.AdminManagerWaiterCashier)]
public class TipsController : ControllerBase
{
    private readonly ITipService _tipService;

    public TipsController(ITipService tipService)
    {
        _tipService = tipService;
    }

    [HttpGet("by-order/{orderId:int}")]
    public async Task<IActionResult> GetByOrderId(int orderId, CancellationToken cancellationToken)
    {
        var result = await _tipService.GetByOrderIdAsync(orderId, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddTipDto dto, CancellationToken cancellationToken)
    {
        var result = await _tipService.AddAsync(dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var result = await _tipService.DeleteAsync(id, cancellationToken);
        return result.ToActionResult();
    }
}
