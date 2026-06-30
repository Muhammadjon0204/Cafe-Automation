using Cafe.Application.DTOs.Reports;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface IReportService
{
    Task<Result<SalesReportDto>> GetSalesReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<List<PopularDishesReportDto>>> GetPopularDishesReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<List<WaiterPerformanceReportDto>>> GetWaiterPerformanceReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<PaymentReportDto>> GetPaymentReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default);
}
