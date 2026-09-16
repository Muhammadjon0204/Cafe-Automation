using Cafe.Application.Common;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Services;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;
using Microsoft.Extensions.Options;
using Moq;

namespace Cafe.Application.Tests;

public class TableAvailabilityServiceTests
{
    private static TableAvailabilityService CreateService(Reservation? nearest, int minFreeWindowMinutes = 60)
    {
        var repository = new Mock<IReservationRepository>();
        repository
            .Setup(x => x.GetNearestUpcomingActiveAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(nearest);

        var settings = Options.Create(new TableAvailabilitySettings { MinFreeWindowMinutes = minFreeWindowMinutes });
        return new TableAvailabilityService(repository.Object, settings);
    }

    private static Reservation ReservationAt(DateTime reservedAt) => new()
    {
        Id = 1,
        CafeTableId = 5,
        CustomerName = "Guest",
        GuestsCount = 2,
        ReservedAt = reservedAt,
        Status = ReservationStatus.Confirmed
    };

    [Fact]
    public async Task CheckWalkInAvailabilityAsync_NoUpcomingReservation_CanOpenFreely()
    {
        var service = CreateService(nearest: null);

        var result = await service.CheckWalkInAvailabilityAsync(5, DateTime.UtcNow);

        Assert.True(result.CanOpenFreely);
        Assert.False(result.IsBlocked);
        Assert.False(result.RequiresWarning);
    }

    [Fact]
    public async Task CheckWalkInAvailabilityAsync_ReservationWithinMinFreeWindow_IsBlocked()
    {
        var now = new DateTime(2026, 1, 1, 18, 50, 0, DateTimeKind.Utc);
        var service = CreateService(ReservationAt(now.AddMinutes(10)), minFreeWindowMinutes: 60);

        var result = await service.CheckWalkInAvailabilityAsync(5, now);

        Assert.True(result.IsBlocked);
        Assert.False(result.CanOpenFreely);
        Assert.Equal(10, result.MinutesUntilReservation);
    }

    [Fact]
    public async Task CheckWalkInAvailabilityAsync_ReservationBeyondMinFreeWindow_RequiresWarningOnly()
    {
        var now = new DateTime(2026, 1, 1, 16, 0, 0, DateTimeKind.Utc);
        var service = CreateService(ReservationAt(now.AddHours(3)), minFreeWindowMinutes: 60);

        var result = await service.CheckWalkInAvailabilityAsync(5, now);

        Assert.False(result.IsBlocked);
        Assert.True(result.RequiresWarning);
        Assert.False(result.CanOpenFreely);
    }

    [Fact]
    public async Task CheckWalkInAvailabilityAsync_ExactlyAtMinFreeWindowBoundary_IsNotBlocked()
    {
        // minutesUntil < MinFreeWindowMinutes blocks; exactly equal does not (TZ 3.2 phrases
        // the rule as "starts earlier than" the window, not "at or earlier than").
        var now = new DateTime(2026, 1, 1, 18, 0, 0, DateTimeKind.Utc);
        var service = CreateService(ReservationAt(now.AddMinutes(60)), minFreeWindowMinutes: 60);

        var result = await service.CheckWalkInAvailabilityAsync(5, now);

        Assert.False(result.IsBlocked);
        Assert.True(result.RequiresWarning);
    }
}
