using Cafe.Application.DTOs.Kitchen;
using Cafe.Application.DTOs.Orders;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface IOrderService
{
    Task<Result<PagedResult<GetOrderDto>>> GetAllAsync(OrderFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<GetOrderDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<GetOrderDto>> CreateAsync(CreateOrderDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetOrderDto>> AddItemAsync(int orderId, AddOrderItemDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetOrderDto>> UpdateItemAsync(int orderId, int itemId, UpdateOrderItemDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetOrderDto>> RemoveItemAsync(int orderId, int itemId, RemoveOrderItemDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetOrderDto>> UpdateStatusAsync(int orderId, UpdateOrderStatusDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetOrderDto>> CancelAsync(int orderId, CancelOrderDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetOrderDto>> CloseAsync(int orderId, CloseOrderDto dto, CancellationToken cancellationToken = default);

    Task<Result<OpenTableResultDto>> OpenTableAsync(OpenTableDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetOrderDto>> SendToKitchenAsync(int orderId, CancellationToken cancellationToken = default);

    // Recomputes SendToKitchenAt for a Scheduled order (e.g. after its reservation was
    // rescheduled) and promotes immediately if the new time is already due. Called by
    // ReservationService - kept here so the formula/edge-case logic isn't duplicated.
    Task<Result> RecalculateSendToKitchenTimingAsync(int orderId, CancellationToken cancellationToken = default);

    Task<Result<GetOrderDto>> CreatePreOrderAsync(int reservationId, CancellationToken cancellationToken = default);

    Task<Result<GetOrderDto>> GetPreOrderAsync(int reservationId, CancellationToken cancellationToken = default);

    Task<Result<List<KitchenUpcomingOrderDto>>> GetUpcomingScheduledAsync(DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default);
}
