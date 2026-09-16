namespace Cafe.Application.Interfaces.Services;

// TZ formula, isolated here so it's directly unit-testable (see Cafe.Application.Tests):
// SendToKitchenAt = reservedAt - max(BufferMinutes + maxCookingTime, MinLeadTimeMinutes).
// Callers (OrderService) decide what to do when the result is already <= now - this method
// just computes the raw instant.
public interface IKitchenSchedulingService
{
    DateTime CalculateSendToKitchenAt(DateTime reservedAtUtc, IEnumerable<int> itemCookingTimesMinutes);
}
