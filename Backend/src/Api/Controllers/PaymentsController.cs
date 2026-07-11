using Cafe.Api.Common;
using Cafe.Application.DTOs.Payments;
using Cafe.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize(Roles = RolePolicies.AdminManagerWaiterCashier)]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpGet("by-order/{orderId:int}")]
    public async Task<IActionResult> GetByOrderId(int orderId, CancellationToken cancellationToken)
    {
        var result = await _paymentService.GetByOrderIdAsync(orderId, cancellationToken);
        return result.ToActionResult();
    }

    [HttpPost]
    [Authorize(Roles = RolePolicies.AdminManagerCashier)]
    public async Task<IActionResult> Create([FromBody] CreatePaymentDto dto, CancellationToken cancellationToken)
    {
        var result = await _paymentService.CreateAsync(dto, cancellationToken);
        return result.ToActionResult();
    }
}
