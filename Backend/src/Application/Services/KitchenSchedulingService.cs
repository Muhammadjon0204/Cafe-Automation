using Cafe.Application.Common;
using Cafe.Application.Interfaces.Services;
using Microsoft.Extensions.Options;

namespace Cafe.Application.Services;

public class KitchenSchedulingService : IKitchenSchedulingService
{
    private readonly KitchenTimingSettings _settings;

    public KitchenSchedulingService(IOptions<KitchenTimingSettings> options)
    {
        _settings = options.Value;
    }

    public DateTime CalculateSendToKitchenAt(DateTime reservedAtUtc, IEnumerable<int> itemCookingTimesMinutes)
    {
        var maxCookingTime = itemCookingTimesMinutes.DefaultIfEmpty(0).Max();
        var leadMinutes = Math.Max(maxCookingTime + _settings.BufferMinutes, _settings.MinLeadTimeMinutes);
        return reservedAtUtc.AddMinutes(-leadMinutes);
    }
}
