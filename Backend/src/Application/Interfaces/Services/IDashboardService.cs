using Cafe.Application.DTOs.Dashboard;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface IDashboardService
{
    Task<Result<DashboardSummaryDto>> GetSummaryAsync(CancellationToken cancellationToken = default);
}
