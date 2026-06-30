using Cafe.Application.DTOs.Dashboard;
using Cafe.Application.Interfaces.Cache;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;

namespace Cafe.Application.Services;

public class DashboardService : IDashboardService
{
    private const string CacheKey = "dashboard:summary";

    private readonly IDashboardRepository _dashboardRepository;
    private readonly ICacheService _cacheService;

    public DashboardService(IDashboardRepository dashboardRepository, ICacheService cacheService)
    {
        _dashboardRepository = dashboardRepository;
        _cacheService = cacheService;
    }

    public async Task<Result<DashboardSummaryDto>> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var cached = await _cacheService.GetAsync<DashboardSummaryDto>(CacheKey, cancellationToken);
        if (cached != null)
        {
            return Result<DashboardSummaryDto>.Success(cached);
        }

        var summary = await _dashboardRepository.GetSummaryAsync(cancellationToken);
        await _cacheService.SetAsync(CacheKey, summary, TimeSpan.FromMinutes(2), cancellationToken);

        return Result<DashboardSummaryDto>.Success(summary);
    }
}
