using Cafe.Application.DTOs.Reports;

namespace Cafe.Application.Interfaces.Repositories;

public interface IReportRepository
{
    Task<SalesReportDto> GetSalesReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default);

    Task<List<PopularDishesReportDto>> GetPopularDishesReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default);

    Task<List<WaiterPerformanceReportDto>> GetWaiterPerformanceReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default);

    Task<PaymentReportDto> GetPaymentReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default);
}
