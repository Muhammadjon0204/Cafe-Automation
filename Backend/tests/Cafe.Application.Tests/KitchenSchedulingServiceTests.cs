using Cafe.Application.Common;
using Cafe.Application.Services;
using Microsoft.Extensions.Options;

namespace Cafe.Application.Tests;

public class KitchenSchedulingServiceTests
{
    private static KitchenSchedulingService CreateService(int bufferMinutes = 10, int minLeadTimeMinutes = 5)
    {
        var settings = new KitchenTimingSettings
        {
            BufferMinutes = bufferMinutes,
            MinLeadTimeMinutes = minLeadTimeMinutes
        };
        return new KitchenSchedulingService(Options.Create(settings));
    }

    [Fact]
    public void CalculateSendToKitchenAt_UsesMaxCookingTime_PlusBuffer()
    {
        // TZ example: 30-minute dish, 10-minute buffer -> sent 40 minutes before the reservation.
        var service = CreateService(bufferMinutes: 10);
        var reservedAt = new DateTime(2026, 1, 1, 19, 0, 0, DateTimeKind.Utc);

        var result = service.CalculateSendToKitchenAt(reservedAt, new[] { 15, 30, 10 });

        Assert.Equal(reservedAt.AddMinutes(-40), result);
    }

    [Fact]
    public void CalculateSendToKitchenAt_EnforcesMinLeadTime_WhenCookingTimePlusBufferIsSmaller()
    {
        var service = CreateService(bufferMinutes: 1, minLeadTimeMinutes: 5);
        var reservedAt = new DateTime(2026, 1, 1, 19, 0, 0, DateTimeKind.Utc);

        // maxCookingTime(0) + buffer(1) = 1, which is less than MinLeadTimeMinutes(5) -> 5 wins.
        var result = service.CalculateSendToKitchenAt(reservedAt, new[] { 0 });

        Assert.Equal(reservedAt.AddMinutes(-5), result);
    }

    [Fact]
    public void CalculateSendToKitchenAt_NoItems_FallsBackToBufferOrMinLeadTime()
    {
        var service = CreateService(bufferMinutes: 10, minLeadTimeMinutes: 5);
        var reservedAt = new DateTime(2026, 1, 1, 19, 0, 0, DateTimeKind.Utc);

        var result = service.CalculateSendToKitchenAt(reservedAt, Array.Empty<int>());

        // maxCookingTime(0) + buffer(10) = 10, which beats MinLeadTimeMinutes(5).
        Assert.Equal(reservedAt.AddMinutes(-10), result);
    }

    [Fact]
    public void CalculateSendToKitchenAt_CanReturnAnInstantAlreadyInThePast()
    {
        // This method is a pure formula - it does not know "now" and must not clamp. The
        // "send immediately instead of hanging" behavior for a too-late pre-order lives in
        // OrderService.PromoteIfDueAsync, which compares this result against UtcNow itself.
        var service = CreateService(bufferMinutes: 30);
        var reservedAt = DateTime.UtcNow.AddMinutes(5);

        var result = service.CalculateSendToKitchenAt(reservedAt, new[] { 30 });

        Assert.True(result < DateTime.UtcNow);
    }
}
