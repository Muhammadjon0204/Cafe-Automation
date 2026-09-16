namespace Cafe.Domain.Enums;

public enum OrderStatus
{
    New = 1,
    Accepted = 2,
    Cooking = 3,
    Ready = 4,
    Served = 5,
    Closed = 6,
    Cancelled = 7,

    // Pre-order created from a Reservation, not yet promoted to the kitchen's working
    // queue. Appended rather than inserted before New to avoid renumbering 1-7 and
    // touching existing rows/values already persisted or hardcoded on the frontend.
    Scheduled = 8
}
