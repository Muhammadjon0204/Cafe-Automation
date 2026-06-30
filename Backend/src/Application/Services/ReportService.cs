using Cafe.Application.DTOs.Reports;
using Cafe.Application.Interfaces.Cache;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;

namespace Cafe.Application.Services;

public class ReportService : IReportService
{
    private readonly IReportRepository _reportRepository;
    private readonly ICacheService _cacheService;

    public ReportService(IReportRepository reportRepository, ICacheService cacheService)
    {
        _reportRepository = reportRepository;
        _cacheService = cacheService;
    }

    public async Task<Result<SalesReportDto>> GetSalesReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var validation = ValidateDateRange(filter);
        if (!validation.IsSuccess)
        {
            return Result<SalesReportDto>.Failure(validation.Message, validation.Errors);
        }

        var key = CreateCacheKey("reports:sales", filter);
        var cached = await _cacheService.GetAsync<SalesReportDto>(key, cancellationToken);
        if (cached != null)
        {
            return Result<SalesReportDto>.Success(cached);
        }

        var report = await _reportRepository.GetSalesReportAsync(filter, cancellationToken);
        await _cacheService.SetAsync(key, report, TimeSpan.FromMinutes(5), cancellationToken);
        return Result<SalesReportDto>.Success(report);
    }

    public async Task<Result<List<PopularDishesReportDto>>> GetPopularDishesReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var validation = ValidateDateRange(filter);
        if (!validation.IsSuccess)
        {
            return Result<List<PopularDishesReportDto>>.Failure(validation.Message, validation.Errors);
        }

        var key = CreateCacheKey("reports:popular-dishes", filter);
        var cached = await _cacheService.GetAsync<List<PopularDishesReportDto>>(key, cancellationToken);
        if (cached != null)
        {
            return Result<List<PopularDishesReportDto>>.Success(cached);
        }

        var report = await _reportRepository.GetPopularDishesReportAsync(filter, cancellationToken);
        await _cacheService.SetAsync(key, report, TimeSpan.FromMinutes(5), cancellationToken);
        return Result<List<PopularDishesReportDto>>.Success(report);
    }

    public async Task<Result<List<WaiterPerformanceReportDto>>> GetWaiterPerformanceReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var validation = ValidateDateRange(filter);
        if (!validation.IsSuccess)
        {
            return Result<List<WaiterPerformanceReportDto>>.Failure(validation.Message, validation.Errors);
        }

        var key = CreateCacheKey("reports:waiters", filter);
        var cached = await _cacheService.GetAsync<List<WaiterPerformanceReportDto>>(key, cancellationToken);
        if (cached != null)
        {
            return Result<List<WaiterPerformanceReportDto>>.Success(cached);
        }

        var report = await _reportRepository.GetWaiterPerformanceReportAsync(filter, cancellationToken);
        await _cacheService.SetAsync(key, report, TimeSpan.FromMinutes(5), cancellationToken);
        return Result<List<WaiterPerformanceReportDto>>.Success(report);
    }

    public async Task<Result<PaymentReportDto>> GetPaymentReportAsync(SalesReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var validation = ValidateDateRange(filter);
        if (!validation.IsSuccess)
        {
            return Result<PaymentReportDto>.Failure(validation.Message, validation.Errors);
        }

        var key = CreateCacheKey("reports:payments", filter);
        var cached = await _cacheService.GetAsync<PaymentReportDto>(key, cancellationToken);
        if (cached != null)
        {
            return Result<PaymentReportDto>.Success(cached);
        }

        var report = await _reportRepository.GetPaymentReportAsync(filter, cancellationToken);
        await _cacheService.SetAsync(key, report, TimeSpan.FromMinutes(5), cancellationToken);
        return Result<PaymentReportDto>.Success(report);
    }

    private static Result ValidateDateRange(SalesReportFilterDto filter)
    {
        if (filter.FromDate.HasValue && filter.ToDate.HasValue && filter.FromDate > filter.ToDate)
        {
            return Result.Failure("From date must be less than or equal to to date.");
        }

        return Result.Success();
    }

    private static string CreateCacheKey(string prefix, SalesReportFilterDto filter)
    {
        var from = filter.FromDate?.ToString("yyyyMMddHHmmss") ?? "null";
        var to = filter.ToDate?.ToString("yyyyMMddHHmmss") ?? "null";
        return $"{prefix}:{from}:{to}";
    }
}
