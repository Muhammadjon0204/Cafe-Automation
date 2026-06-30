using Cafe.Application.DTOs.Dashboard;

namespace Cafe.Application.Interfaces.Repositories;

public interface IDashboardRepository
{
    Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
}
