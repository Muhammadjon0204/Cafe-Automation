using Cafe.Api.Common;
using Cafe.Application.DTOs.Reports;
using Cafe.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cafe.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = RolePolicies.AdminManager)]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("sales")]
    public async Task<IActionResult> GetSales([FromQuery] SalesReportFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _reportService.GetSalesReportAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("popular-dishes")]
    public async Task<IActionResult> GetPopularDishes([FromQuery] SalesReportFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _reportService.GetPopularDishesReportAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("waiter-performance")]
    public async Task<IActionResult> GetWaiterPerformance([FromQuery] SalesReportFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _reportService.GetWaiterPerformanceReportAsync(filter, cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("payments")]
    public async Task<IActionResult> GetPayments([FromQuery] SalesReportFilterDto filter, CancellationToken cancellationToken)
    {
        var result = await _reportService.GetPaymentReportAsync(filter, cancellationToken);
        return result.ToActionResult();
    }
}
