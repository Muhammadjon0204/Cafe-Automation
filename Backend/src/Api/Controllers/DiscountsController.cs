using Cafe.Api.Common;
using Cafe.Application.DTOs.Discounts;
using Cafe.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/discounts")]
[Authorize(Roles = RolePolicies.AdminManagerWaiterCashier)]
public class DiscountsController : ControllerBase
{
    private readonly IDiscountService _discountService;

    public DiscountsController(IDiscountService discountService)
    {
        _discountService = discountService;
    }

    [HttpGet("by-order/{orderId:int}")]
    public async Task<IActionResult> GetByOrderId(int orderId, CancellationToken cancellationToken)
    {
        var result = await _discountService.GetByOrderIdAsync(orderId, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost]
    [Authorize(Roles = RolePolicies.AdminManagerCashier)]
    public async Task<IActionResult> Apply([FromBody] ApplyDiscountDto dto, CancellationToken cancellationToken)
    {
        var result = await _discountService.ApplyAsync(dto, cancellationToken);
        return result.ToActionResult();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RolePolicies.AdminManager)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var result = await _discountService.DeleteAsync(id, cancellationToken);
        return result.ToActionResult();
    }
}
