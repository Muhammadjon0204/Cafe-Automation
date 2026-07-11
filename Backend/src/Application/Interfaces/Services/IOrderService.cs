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
}
