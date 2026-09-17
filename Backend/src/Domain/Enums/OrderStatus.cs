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
    Scheduled = 8,

    // Waiter opened a table but hasn't sent anything to the kitchen yet (OpenTableAsync).
    // Distinct from Scheduled (a reservation pre-order waiting on its own timer): Draft only
    // ever leaves this status via a manual SendToKitchenAsync call, never a background job.
    Draft = 9
}
