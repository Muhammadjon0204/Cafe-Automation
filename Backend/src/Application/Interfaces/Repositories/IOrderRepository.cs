using Cafe.Application.Common.Specifications;
using Cafe.Application.Results;
using Cafe.Domain.Entities;

namespace Cafe.Application.Interfaces.Repositories;

public interface IOrderRepository
{
    Task<PagedResult<Order>> GetAsync(ISpecification<Order> spec, CancellationToken cancellationToken = default);

    Task<Order?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Order?> GetByIdWithDetailsAsync(int id, CancellationToken cancellationToken = default);

    Task AddAsync(Order order, CancellationToken cancellationToken = default);

    void Update(Order order);

    void Delete(Order order);

    Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default);

    Task<bool> OrderNumberExistsAsync(string orderNumber, CancellationToken cancellationToken = default);

    // Any order on this table that isn't Closed/Cancelled - includes Scheduled, so
    // OrderService.OpenTableAsync can tell an existing pre-order apart from a genuinely
    // active order (TZ 7: hand the waiter the existing pre-order instead of erroring).
    Task<Order?> GetActiveByTableIdAsync(int cafeTableId, CancellationToken cancellationToken = default);

    // At most one non-cancelled order per reservation (see IX_Orders_ActiveByReservation).
    Task<Order?> GetByReservationIdAsync(int reservationId, CancellationToken cancellationToken = default);

    // Scheduled orders whose SendToKitchenAt has arrived - polled by KitchenPromotionBackgroundService.
    Task<List<Order>> GetDueForKitchenPromotionAsync(DateTime asOfUtc, CancellationToken cancellationToken = default);

    // Scheduled orders whose linked Reservation.ReservedAt falls in range - for
    // GET /api/kitchen/upcoming-orders (TZ 6).
    Task<List<Order>> GetUpcomingScheduledAsync(DateTime fromDateUtc, DateTime toDateUtc, CancellationToken cancellationToken = default);
}
