using System.Data;
using Cafe.Application.Common;
using Cafe.Application.DTOs.Kitchen;
using Cafe.Application.DTOs.Orders;
using Cafe.Application.Interfaces.Identity;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Application.Services.Orders.Specifications;
using Cafe.Domain.Constants;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace Cafe.Application.Services;

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IOrderItemRepository _orderItemRepository;
    private readonly IDishRepository _dishRepository;
    private readonly ICafeTableRepository _tableRepository;
    private readonly ICustomerRepository _customerRepository;
    private readonly IStaffMemberRepository _staffRepository;
    private readonly IPaymentRepository _paymentRepository;
    private readonly IDiscountRepository _discountRepository;
    private readonly ITipRepository _tipRepository;
    private readonly IReservationRepository _reservationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;
    private readonly IRealtimeNotifier _realtimeNotifier;
    private readonly ITableAvailabilityService _tableAvailabilityService;
    private readonly IKitchenSchedulingService _kitchenSchedulingService;
    private readonly ILogger<OrderService> _logger;

    public OrderService(
        IOrderRepository orderRepository,
        IOrderItemRepository orderItemRepository,
        IDishRepository dishRepository,
        ICafeTableRepository tableRepository,
        ICustomerRepository customerRepository,
        IStaffMemberRepository staffRepository,
        IPaymentRepository paymentRepository,
        IDiscountRepository discountRepository,
        ITipRepository tipRepository,
        IReservationRepository reservationRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        IRealtimeNotifier realtimeNotifier,
        ITableAvailabilityService tableAvailabilityService,
        IKitchenSchedulingService kitchenSchedulingService,
        ILogger<OrderService> logger)
    {
        _orderRepository = orderRepository;
        _orderItemRepository = orderItemRepository;
        _dishRepository = dishRepository;
        _tableRepository = tableRepository;
        _customerRepository = customerRepository;
        _staffRepository = staffRepository;
        _paymentRepository = paymentRepository;
        _discountRepository = discountRepository;
        _tipRepository = tipRepository;
        _reservationRepository = reservationRepository;
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
        _realtimeNotifier = realtimeNotifier;
        _tableAvailabilityService = tableAvailabilityService;
        _kitchenSchedulingService = kitchenSchedulingService;
        _logger = logger;
    }

    // Fire-and-forget from the caller's perspective (awaited, but its failure must never
    // fail the request that already committed — a missed live-update is far cheaper than
    // a 500 on a successful order change) — every mutating method below calls this once
    // right after SaveChangesAsync. Takes ids rather than an Order entity so it can be
    // called from OpenTableAsync's transaction result (a DTO) too.
    private async Task NotifyOrderChangedAsync(int orderId, int? cafeTableId, CancellationToken cancellationToken)
    {
        try
        {
            await _realtimeNotifier.OrderChangedAsync(orderId, cafeTableId, cancellationToken);
            if (cafeTableId.HasValue)
            {
                await _realtimeNotifier.TableChangedAsync(cafeTableId.Value, cancellationToken);
            }
        }
        catch
        {
            // Best-effort broadcast — a disconnected hub/client must not surface as a
            // failure of the order operation that already succeeded and was saved.
        }
    }

    public async Task<Result<PagedResult<GetOrderDto>>> GetAllAsync(OrderFilterDto filter, CancellationToken cancellationToken = default)
    {
        // Row-level scoping: a Waiter can only ever see their own orders, regardless of what
        // WaiterId the caller put in the filter DTO (a client could otherwise spoof another
        // waiter's id to read their orders). Admin/Manager/other roles use the DTO filter as-is.
        // A Waiter-role token with no linked StaffMemberId is scoped to a filter that matches
        // nothing (-1) rather than falling back to "unfiltered" (deny-by-default).
        if (_currentUserService.IsInRole(SystemRoles.Waiter))
        {
            filter.WaiterId = _currentUserService.StaffMemberId ?? -1;
        }

        var spec = new OrderFilterSpecification(filter);
        var pagedOrders = await _orderRepository.GetAsync(spec, cancellationToken);
        var result = pagedOrders.MapTo(MapToDto);
        return Result<PagedResult<GetOrderDto>>.Success(result);
    }

    public async Task<Result<GetOrderDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var order = await GetOrderWithDetailsAsync(id, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<GetOrderDto>.Failure("Order not found.");
        }

        return Result<GetOrderDto>.Success(MapToDto(order));
    }

    public async Task<Result<GetOrderDto>> CreateAsync(CreateOrderDto dto, CancellationToken cancellationToken = default)
    {
        var validation = await ValidateCreateAsync(dto, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetOrderDto>.Failure(validation.Message, validation.Errors);
        }

        var now = DateTime.UtcNow;
        var order = new Order
        {
            OrderNumber = $"ORD-{now:yyyyMMddHHmmssfff}",
            OrderedAt = now,
            Status = OrderStatus.New,
            Type = dto.Type,
            CustomerId = dto.CustomerId,
            CafeTableId = dto.CafeTableId,
            WaiterId = dto.WaiterId,
            CreatedByStaffMemberId = dto.CreatedByStaffMemberId,
            PaymentStatus = PaymentStatus.Unpaid,
            Note = ServiceHelpers.TrimToNull(dto.Note),
            CreatedAt = now
        };

        await _orderRepository.AddAsync(order, cancellationToken);

        if (dto.Type == OrderType.DineIn && dto.CafeTableId.HasValue)
        {
            var table = await _tableRepository.GetByIdAsync(dto.CafeTableId.Value, cancellationToken);
            if (table != null)
            {
                table.Status = TableStatus.Occupied;
                table.UpdatedAt = now;
                _tableRepository.Update(table);
                order.CafeTable = table;
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyOrderChangedAsync(order.Id, order.CafeTableId, cancellationToken);
        return Result<GetOrderDto>.Success(MapToDto(order), "Order created.");
    }

    public async Task<Result<GetOrderDto>> AddItemAsync(int orderId, AddOrderItemDto dto, CancellationToken cancellationToken = default)
    {
        var order = await GetOrderWithDetailsAsync(orderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<GetOrderDto>.Failure("Order not found.");
        }

        if (IsClosedOrCancelled(order))
        {
            return Result<GetOrderDto>.Failure("Cannot change closed or cancelled order.");
        }

        if (dto.Quantity <= 0 || dto.Quantity > 100)
        {
            return Result<GetOrderDto>.Failure("Quantity must be between 1 and 100.");
        }

        if (!ServiceHelpers.HasMaxLength(dto.Note, 500))
        {
            return Result<GetOrderDto>.Failure("Note must be 500 characters or less.");
        }

        var dish = await _dishRepository.GetByIdWithCategoryAsync(dto.DishId, cancellationToken)
            ?? await _dishRepository.GetByIdAsync(dto.DishId, cancellationToken);
        if (dish == null || dish.IsDeleted || !dish.IsAvailable || dish.Status != DishStatus.Active)
        {
            return Result<GetOrderDto>.Failure("Dish is not available.");
        }

        var item = new OrderItem
        {
            OrderId = orderId,
            DishId = dish.Id,
            Dish = dish,
            Quantity = dto.Quantity,
            UnitPrice = dish.Price,
            TotalPrice = dish.Price * dto.Quantity,
            Status = OrderItemStatus.New,
            Note = ServiceHelpers.TrimToNull(dto.Note),
            CreatedAt = DateTime.UtcNow
        };

        await _orderItemRepository.AddAsync(item, cancellationToken);
        order.Items.Add(item);
        await RecalculateOrderTotalsAsync(order, cancellationToken);
        await RecalculateSendToKitchenAsync(order, cancellationToken);
        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyOrderChangedAsync(order.Id, order.CafeTableId, cancellationToken);
        await PromoteIfDueAsync(order, cancellationToken);

        return Result<GetOrderDto>.Success(MapToDto(order), "Order item added.");
    }

    public async Task<Result<GetOrderDto>> UpdateItemAsync(int orderId, int itemId, UpdateOrderItemDto dto, CancellationToken cancellationToken = default)
    {
        var order = await GetOrderWithDetailsAsync(orderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<GetOrderDto>.Failure("Order not found.");
        }

        if (IsClosedOrCancelled(order))
        {
            return Result<GetOrderDto>.Failure("Cannot change closed or cancelled order.");
        }

        if (dto.Quantity <= 0 || dto.Quantity > 100)
        {
            return Result<GetOrderDto>.Failure("Quantity must be between 1 and 100.");
        }

        if (!ServiceHelpers.HasMaxLength(dto.Note, 500))
        {
            return Result<GetOrderDto>.Failure("Note must be 500 characters or less.");
        }

        var item = await _orderItemRepository.GetByIdAsync(itemId, cancellationToken);
        if (item == null || item.IsDeleted || item.OrderId != orderId)
        {
            return Result<GetOrderDto>.Failure("Order item not found.");
        }

        var guardFailure = ValidateForceGuard(item, dto.Force, dto.Reason);
        if (guardFailure != null)
        {
            return guardFailure;
        }

        item.Quantity = dto.Quantity;
        item.TotalPrice = item.UnitPrice * dto.Quantity;
        item.Note = ServiceHelpers.TrimToNull(dto.Note);
        item.UpdatedAt = DateTime.UtcNow;
        _orderItemRepository.Update(item);

        var existing = order.Items.FirstOrDefault(x => x.Id == item.Id);
        if (existing != null)
        {
            existing.Quantity = item.Quantity;
            existing.TotalPrice = item.TotalPrice;
            existing.Note = item.Note;
            existing.UpdatedAt = item.UpdatedAt;
        }

        await RecalculateOrderTotalsAsync(order, cancellationToken);
        await RecalculateSendToKitchenAsync(order, cancellationToken);
        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyOrderChangedAsync(order.Id, order.CafeTableId, cancellationToken);
        await PromoteIfDueAsync(order, cancellationToken);

        return Result<GetOrderDto>.Success(MapToDto(order), "Order item updated.");
    }

    public async Task<Result<GetOrderDto>> RemoveItemAsync(int orderId, int itemId, RemoveOrderItemDto dto, CancellationToken cancellationToken = default)
    {
        var order = await GetOrderWithDetailsAsync(orderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<GetOrderDto>.Failure("Order not found.");
        }

        if (IsClosedOrCancelled(order))
        {
            return Result<GetOrderDto>.Failure("Cannot change closed or cancelled order.");
        }

        var item = await _orderItemRepository.GetByIdAsync(itemId, cancellationToken);
        if (item == null || item.IsDeleted || item.OrderId != orderId)
        {
            return Result<GetOrderDto>.Failure("Order item not found.");
        }

        var guardFailure = ValidateForceGuard(item, dto.Force, dto.Reason);
        if (guardFailure != null)
        {
            return guardFailure;
        }

        item.IsDeleted = true;
        item.Status = OrderItemStatus.Cancelled;
        item.UpdatedAt = DateTime.UtcNow;
        _orderItemRepository.Update(item);

        var existing = order.Items.FirstOrDefault(x => x.Id == item.Id);
        if (existing != null)
        {
            existing.IsDeleted = true;
            existing.Status = OrderItemStatus.Cancelled;
            existing.UpdatedAt = item.UpdatedAt;
        }

        // Removing the last active item off an already-promoted order (New/Accepted/Cooking/
        // Ready/Served) would otherwise leave a ghost order sitting in that status forever -
        // nothing left to cook or serve, but still "active" so it keeps haunting the waiter
        // board and never becomes eligible for the Cashier's checks (TotalAmount is now 0,
        // there's nothing to charge). Falling back to Draft is exactly the "nothing sent to
        // the kitchen yet" state this already means elsewhere - the waiter can add new items
        // and send again, or explicitly cancel the table's order via the table-status guard.
        var stillHasItems = order.Items.Any(x => !x.IsDeleted && x.Status != OrderItemStatus.Cancelled);
        if (!stillHasItems && order.Status != OrderStatus.Draft && order.Status != OrderStatus.Scheduled &&
            order.Status != OrderStatus.Closed && order.Status != OrderStatus.Cancelled)
        {
            order.Status = OrderStatus.Draft;
        }

        await RecalculateOrderTotalsAsync(order, cancellationToken);
        await RecalculateSendToKitchenAsync(order, cancellationToken);
        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyOrderChangedAsync(order.Id, order.CafeTableId, cancellationToken);
        await PromoteIfDueAsync(order, cancellationToken);

        return Result<GetOrderDto>.Success(MapToDto(order), "Order item removed.");
    }

    public async Task<Result<GetOrderDto>> UpdateStatusAsync(int orderId, UpdateOrderStatusDto dto, CancellationToken cancellationToken = default)
    {
        var order = await GetOrderWithDetailsAsync(orderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<GetOrderDto>.Failure("Order not found.");
        }

        if (!Enum.IsDefined(typeof(OrderStatus), dto.Status))
        {
            return Result<GetOrderDto>.Failure("Invalid order status.");
        }

        // A Draft (walk-in, not yet sent) or Scheduled (reservation pre-order, not yet due)
        // order only ever leaves that status through SendToKitchenAsync (manual "send to
        // kitchen" or the promotion background job) - never through this generic endpoint.
        // This is also what keeps Kitchen from touching it early (TZ 6.2): Kitchen's only
        // status-change path is this same method.
        if (order.Status == OrderStatus.Draft || order.Status == OrderStatus.Scheduled)
        {
            return Result<GetOrderDto>.Failure("Draft order must be sent to the kitchen before its status can change.");
        }

        // Kitchen only runs the cooking pipeline (Accepted/Cooking/Ready) and never touches
        // Served/Closed/Cancelled, which involve waiter/cashier handoff or payment. A user who
        // also holds Admin/Manager/Waiter keeps the unrestricted transitions.
        if (IsKitchenOnly() && dto.Status != OrderStatus.Accepted && dto.Status != OrderStatus.Cooking && dto.Status != OrderStatus.Ready)
        {
            return Result<GetOrderDto>.Failure("Kitchen role can only move an order through Accepted, Cooking, or Ready.");
        }

        if (dto.Status == OrderStatus.Closed || dto.Status == OrderStatus.Cancelled)
        {
            await RecalculateOrderTotalsAsync(order, cancellationToken);
        }

        if (!CanMoveToStatus(order, dto.Status))
        {
            return Result<GetOrderDto>.Failure("Invalid order status transition.");
        }

        order.Status = dto.Status;
        order.Note = MergeNote(order.Note, dto.Note);
        order.UpdatedAt = DateTime.UtcNow;

        if (dto.Status == OrderStatus.Closed)
        {
            order.ClosedAt = DateTime.UtcNow;
            await ReleaseTableAsync(order, cancellationToken);
        }

        if (dto.Status == OrderStatus.Cancelled)
        {
            order.ClosedAt = DateTime.UtcNow;
            await ReleaseTableAsync(order, cancellationToken);
        }

        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyOrderChangedAsync(order.Id, order.CafeTableId, cancellationToken);
        return Result<GetOrderDto>.Success(MapToDto(order), "Order status updated.");
    }

    public async Task<Result<GetOrderDto>> CancelAsync(int orderId, CancelOrderDto dto, CancellationToken cancellationToken = default)
    {
        var order = await GetOrderWithDetailsAsync(orderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<GetOrderDto>.Failure("Order not found.");
        }

        if (order.Status == OrderStatus.Closed)
        {
            return Result<GetOrderDto>.Failure("Cannot cancel closed order.");
        }

        await RecalculateOrderTotalsAsync(order, cancellationToken);
        if (order.PaymentStatus == PaymentStatus.Paid)
        {
            return Result<GetOrderDto>.Failure("Cannot cancel paid order without refund logic.");
        }

        // A Scheduled pre-order never actually occupied its table (only OpenTableAsync sets
        // TableStatus.Occupied) - releasing here would wrongly flip a still-Reserved table to
        // Free just because its pre-order was cancelled.
        var wasScheduled = order.Status == OrderStatus.Scheduled;

        order.Status = OrderStatus.Cancelled;
        order.ClosedAt = DateTime.UtcNow;
        order.Note = MergeNote(order.Note, dto.Reason);
        order.UpdatedAt = DateTime.UtcNow;

        foreach (var item in order.Items.Where(x => !x.IsDeleted))
        {
            item.Status = OrderItemStatus.Cancelled;
            item.UpdatedAt = DateTime.UtcNow;
            _orderItemRepository.Update(item);
        }

        if (!wasScheduled)
        {
            await ReleaseTableAsync(order, cancellationToken);
        }

        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyOrderChangedAsync(order.Id, order.CafeTableId, cancellationToken);
        return Result<GetOrderDto>.Success(MapToDto(order), "Order cancelled.");
    }

    public async Task<Result<GetOrderDto>> CloseAsync(int orderId, CloseOrderDto dto, CancellationToken cancellationToken = default)
    {
        var order = await GetOrderWithDetailsAsync(orderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<GetOrderDto>.Failure("Order not found.");
        }

        if (order.Status == OrderStatus.Cancelled)
        {
            return Result<GetOrderDto>.Failure("Cannot close cancelled order.");
        }

        if (order.Status == OrderStatus.Closed)
        {
            return Result<GetOrderDto>.Failure("Order is already closed.");
        }

        await RecalculateOrderTotalsAsync(order, cancellationToken);
        if (order.PaymentStatus != PaymentStatus.Paid)
        {
            return Result<GetOrderDto>.Failure("Order must be paid before closing.");
        }

        order.Status = OrderStatus.Closed;
        order.ClosedAt = DateTime.UtcNow;
        order.Note = MergeNote(order.Note, dto.Note);
        order.UpdatedAt = DateTime.UtcNow;

        await ReleaseTableAsync(order, cancellationToken);
        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyOrderChangedAsync(order.Id, order.CafeTableId, cancellationToken);
        return Result<GetOrderDto>.Success(MapToDto(order), "Order closed.");
    }

    public async Task<Result<OpenTableResultDto>> OpenTableAsync(OpenTableDto dto, CancellationToken cancellationToken = default)
    {
        var isAdmin = _currentUserService.IsInRole(SystemRoles.Admin);
        if (dto.ForceOpen && !isAdmin)
        {
            return Result<OpenTableResultDto>.Failure("Only Admin can force-open a table with an upcoming reservation.");
        }

        if (!ServiceHelpers.HasMaxLength(dto.Note, 500))
        {
            return Result<OpenTableResultDto>.Failure("Note must be 500 characters or less.");
        }

        var result = await _unitOfWork.ExecuteInTransactionAsync(
            ct => OpenTableInTransactionAsync(dto, cancellationToken: ct),
            IsolationLevel.Serializable,
            cancellationToken);

        if (result.IsSuccess)
        {
            // Outside the transaction on purpose - a dropped/slow hub connection must never
            // roll back an already-committed table open.
            await NotifyOrderChangedAsync(result.Data!.Order.Id, result.Data.Order.CafeTableId, cancellationToken);
        }

        return result;
    }

    // Runs inside IUnitOfWork.ExecuteInTransactionAsync's Serializable transaction (see
    // OpenTableAsync). Everything here is the check-then-act TZ 3.1 is worried about; the
    // partial unique index IX_Orders_ActiveByTable is the second line of defense if this
    // transaction's isolation somehow doesn't catch a race (translated to 409 by
    // ExceptionHandlingMiddleware either way).
    private async Task<Result<OpenTableResultDto>> OpenTableInTransactionAsync(OpenTableDto dto, CancellationToken cancellationToken)
    {
        var table = await _tableRepository.GetByIdAsync(dto.CafeTableId, cancellationToken);
        if (table == null || table.IsDeleted)
        {
            return Result<OpenTableResultDto>.Failure("Table not found.");
        }

        if (table.Status == TableStatus.Disabled)
        {
            return Result<OpenTableResultDto>.Failure("Table is disabled.");
        }

        var existingOrder = await _orderRepository.GetActiveByTableIdAsync(dto.CafeTableId, cancellationToken);
        if (existingOrder != null)
        {
            if (existingOrder.Status == OrderStatus.Scheduled)
            {
                // TZ 7: the guest arrived on/near an existing pre-order - hand it back instead
                // of erroring, so the waiter picks it up (and can send-to-kitchen manually)
                // rather than ending up with two orders on the same table. The guest is now
                // physically seated, so the table itself becomes Occupied here even though the
                // order stays Scheduled until promoted.
                if (table.Status != TableStatus.Occupied)
                {
                    table.Status = TableStatus.Occupied;
                    table.UpdatedAt = DateTime.UtcNow;
                    _tableRepository.Update(table);
                    await _unitOfWork.SaveChangesAsync(cancellationToken);
                }

                return Result<OpenTableResultDto>.Success(
                    new OpenTableResultDto { Order = MapToDto(existingOrder) },
                    "An existing pre-order was found for this table.");
            }

            return Result<OpenTableResultDto>.Failure("Table already has an active order.");
        }

        string? warning = null;
        var availability = await _tableAvailabilityService.CheckWalkInAvailabilityAsync(dto.CafeTableId, DateTime.UtcNow, cancellationToken);
        if (availability.IsBlocked)
        {
            if (!dto.ForceOpen)
            {
                return Result<OpenTableResultDto>.Failure(availability.Message ?? "Table cannot be opened right now.");
            }

            // Admin override of a reservation-proximity block - explicitly one of the "critical
            // administrator operations" the project's logging rules call out.
            _logger.LogWarning(
                "Admin (staff {StaffId}) force-opened table {TableId} despite a reservation at {ReservedAt:O}",
                _currentUserService.StaffMemberId, dto.CafeTableId, availability.NearestReservation?.ReservedAt);
            warning = availability.Message;
        }
        else if (availability.RequiresWarning)
        {
            warning = availability.Message;
        }

        var now = DateTime.UtcNow;
        var order = new Order
        {
            OrderNumber = $"ORD-{now:yyyyMMddHHmmssfff}",
            OrderedAt = now,
            // Draft: table and order are separate concerns - opening a table never implies the
            // kitchen sees anything yet. The waiter builds up items here and explicitly calls
            // SendToKitchenAsync when ready (same promotion path a reservation pre-order uses).
            Status = OrderStatus.Draft,
            Type = OrderType.DineIn,
            CafeTableId = dto.CafeTableId,
            WaiterId = dto.WaiterId ?? _currentUserService.StaffMemberId,
            CreatedByStaffMemberId = _currentUserService.StaffMemberId,
            PaymentStatus = PaymentStatus.Unpaid,
            Note = ServiceHelpers.TrimToNull(dto.Note),
            CreatedAt = now
        };

        await _orderRepository.AddAsync(order, cancellationToken);

        table.Status = TableStatus.Occupied;
        table.UpdatedAt = now;
        _tableRepository.Update(table);
        order.CafeTable = table;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<OpenTableResultDto>.Success(new OpenTableResultDto { Order = MapToDto(order), Warning = warning }, "Table opened.");
    }

    // Covers two distinct cases behind one action (what the waiter UI always calls "Отправить
    // на кухню"):
    //  - Draft (walk-in table, never sent) or Scheduled (reservation pre-order, not yet due) -
    //    promotes the whole order into the kitchen's working queue, same as before.
    //  - Already-live order (New/Accepted/Cooking/Ready) with items added since the last send -
    //    order.Status is untouched; only the newly-added, still-unsent items get stamped, so the
    //    kitchen sees just the addition rather than the whole order re-appearing as new.
    // Used identically by the manual endpoint and KitchenPromotionBackgroundService for the
    // Draft/Scheduled case - no duplicated transition logic between the two.
    public async Task<Result<GetOrderDto>> SendToKitchenAsync(int orderId, CancellationToken cancellationToken = default)
    {
        var order = await GetOrderWithDetailsAsync(orderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<GetOrderDto>.Failure("Order not found.");
        }

        var isInitialPromotion = order.Status == OrderStatus.Draft || order.Status == OrderStatus.Scheduled;
        if (!isInitialPromotion && order.Status != OrderStatus.New && order.Status != OrderStatus.Accepted &&
            order.Status != OrderStatus.Cooking && order.Status != OrderStatus.Ready)
        {
            return Result<GetOrderDto>.Failure("Order is not open for sending items to the kitchen.");
        }

        var pendingItems = order.Items.Where(x => !x.IsDeleted && x.Status != OrderItemStatus.Cancelled && x.SentToKitchenAt == null).ToList();
        if (pendingItems.Count == 0)
        {
            return Result<GetOrderDto>.Failure(isInitialPromotion
                ? "Cannot send an empty order to the kitchen."
                : "No new items to send to the kitchen.");
        }

        var now = DateTime.UtcNow;
        foreach (var item in pendingItems)
        {
            item.SentToKitchenAt = now;
            item.UpdatedAt = now;
            _orderItemRepository.Update(item);
        }

        if (isInitialPromotion)
        {
            // Items already sit at OrderItemStatus.New from AddItemAsync - promotion is purely a
            // Status/OrderedAt change on the parent Order so it enters the kitchen's normal
            // working queue (and its normal PATCH /status lifecycle) from here on.
            order.Status = OrderStatus.New;
            order.OrderedAt = now;
        }

        order.UpdatedAt = now;

        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyOrderChangedAsync(order.Id, order.CafeTableId, cancellationToken);

        return Result<GetOrderDto>.Success(MapToDto(order), "Order sent to kitchen.");
    }

    public async Task<Result> RecalculateSendToKitchenTimingAsync(int orderId, CancellationToken cancellationToken = default)
    {
        var order = await GetOrderWithDetailsAsync(orderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result.Failure("Order not found.");
        }

        await RecalculateSendToKitchenAsync(order, cancellationToken);
        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await PromoteIfDueAsync(order, cancellationToken);

        return Result.Success();
    }

    public async Task<Result<GetOrderDto>> CreatePreOrderAsync(int reservationId, CancellationToken cancellationToken = default)
    {
        var reservation = await _reservationRepository.GetByIdAsync(reservationId, cancellationToken);
        if (reservation == null || reservation.IsDeleted)
        {
            return Result<GetOrderDto>.Failure("Reservation not found.");
        }

        if (reservation.Status != ReservationStatus.Pending && reservation.Status != ReservationStatus.Confirmed)
        {
            return Result<GetOrderDto>.Failure("Cannot create a pre-order for a cancelled or completed reservation.");
        }

        var existing = await _orderRepository.GetByReservationIdAsync(reservationId, cancellationToken);
        if (existing != null)
        {
            return Result<GetOrderDto>.Failure("A pre-order already exists for this reservation.");
        }

        var now = DateTime.UtcNow;
        var order = new Order
        {
            OrderNumber = $"ORD-{now:yyyyMMddHHmmssfff}",
            OrderedAt = now,
            Status = OrderStatus.Scheduled,
            Type = OrderType.DineIn,
            ReservationId = reservation.Id,
            CafeTableId = reservation.CafeTableId,
            CustomerId = reservation.CustomerId,
            CreatedByStaffMemberId = _currentUserService.StaffMemberId,
            PaymentStatus = PaymentStatus.Unpaid,
            CreatedAt = now
        };

        await _orderRepository.AddAsync(order, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<GetOrderDto>.Success(MapToDto(order), "Pre-order created.");
    }

    public async Task<Result<GetOrderDto>> GetPreOrderAsync(int reservationId, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByReservationIdAsync(reservationId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<GetOrderDto>.Failure("Pre-order not found for this reservation.");
        }

        return Result<GetOrderDto>.Success(MapToDto(order));
    }

    public async Task<Result<List<KitchenUpcomingOrderDto>>> GetUpcomingScheduledAsync(DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default)
    {
        if (toDate < fromDate)
        {
            return Result<List<KitchenUpcomingOrderDto>>.Failure("toDate must not be before fromDate.");
        }

        var orders = await _orderRepository.GetUpcomingScheduledAsync(fromDate, toDate, cancellationToken);
        var result = orders.Select(x => new KitchenUpcomingOrderDto
        {
            Order = MapToDto(x),
            ReservedAt = x.Reservation!.ReservedAt
        }).ToList();

        return Result<List<KitchenUpcomingOrderDto>>.Success(result);
    }

    // Client-app self-checkout: one atomic cart -> order call, price always taken from
    // Dish.Price server-side (never trust a client-sent price). Reuses the same
    // RecalculateOrderTotalsAsync/NotifyOrderChangedAsync helpers CreateAsync/AddItemAsync use,
    // so the order shows up live on the admin/kitchen boards exactly like any other
    // TakeAway/Delivery order - no changes needed there.
    public async Task<Result<GetOrderDto>> CreateDeliveryOrderAsync(int customerId, CreateDeliveryOrderDto dto, CancellationToken cancellationToken = default)
    {
        if (dto.Items.Count == 0)
        {
            return Result<GetOrderDto>.Failure("Cart is empty.");
        }

        if (dto.Items.Count > 50)
        {
            return Result<GetOrderDto>.Failure("Too many items in one order.");
        }

        if (string.IsNullOrWhiteSpace(dto.DeliveryAddress))
        {
            return Result<GetOrderDto>.Failure("Delivery address is required.");
        }

        if (!ServiceHelpers.HasMaxLength(dto.DeliveryAddress, 300))
        {
            return Result<GetOrderDto>.Failure("Delivery address must be 300 characters or less.");
        }

        if (!ServiceHelpers.HasMaxLength(dto.Phone, 30))
        {
            return Result<GetOrderDto>.Failure("Phone must be 30 characters or less.");
        }

        if (!ServiceHelpers.HasMaxLength(dto.Note, 500))
        {
            return Result<GetOrderDto>.Failure("Note must be 500 characters or less.");
        }

        var customer = await _customerRepository.GetByIdAsync(customerId, cancellationToken);
        if (customer == null || customer.IsDeleted)
        {
            return Result<GetOrderDto>.Failure("Customer not found.");
        }

        if (customer.Status == CustomerStatus.Blocked)
        {
            return Result<GetOrderDto>.Failure("Customer is blocked.");
        }

        var items = new List<OrderItem>();
        foreach (var line in dto.Items)
        {
            if (line.Quantity <= 0 || line.Quantity > 100)
            {
                return Result<GetOrderDto>.Failure("Quantity must be between 1 and 100.");
            }

            if (!ServiceHelpers.HasMaxLength(line.Note, 500))
            {
                return Result<GetOrderDto>.Failure("Item note must be 500 characters or less.");
            }

            var dish = await _dishRepository.GetByIdWithCategoryAsync(line.DishId, cancellationToken)
                ?? await _dishRepository.GetByIdAsync(line.DishId, cancellationToken);
            if (dish == null || dish.IsDeleted || !dish.IsAvailable || dish.Status != DishStatus.Active)
            {
                return Result<GetOrderDto>.Failure($"Dish #{line.DishId} is not available.");
            }

            items.Add(new OrderItem
            {
                DishId = dish.Id,
                Dish = dish,
                Quantity = line.Quantity,
                UnitPrice = dish.Price,
                TotalPrice = dish.Price * line.Quantity,
                Status = OrderItemStatus.New,
                Note = ServiceHelpers.TrimToNull(line.Note),
                CreatedAt = DateTime.UtcNow
            });
        }

        var now = DateTime.UtcNow;
        var order = new Order
        {
            OrderNumber = $"DLV-{now:yyyyMMddHHmmssfff}",
            OrderedAt = now,
            Status = OrderStatus.New,
            Type = OrderType.Delivery,
            CustomerId = customerId,
            Customer = customer,
            DeliveryAddress = dto.DeliveryAddress.Trim(),
            PaymentStatus = PaymentStatus.Unpaid,
            Note = ServiceHelpers.TrimToNull(dto.Note),
            CreatedAt = now
        };

        foreach (var item in items)
        {
            order.Items.Add(item);
        }

        await _orderRepository.AddAsync(order, cancellationToken);
        await RecalculateOrderTotalsAsync(order, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyOrderChangedAsync(order.Id, order.CafeTableId, cancellationToken);

        return Result<GetOrderDto>.Success(MapToDto(order), "Order created.");
    }

    public async Task<Result<PagedResult<GetOrderDto>>> GetMyOrdersAsync(int customerId, OrderFilterDto filter, CancellationToken cancellationToken = default)
    {
        // Deny-by-default, matching the Waiter row-scoping above: a Client-role caller can never
        // widen this beyond their own orders, regardless of what the filter DTO says.
        filter.CustomerId = customerId;

        var spec = new OrderFilterSpecification(filter);
        var pagedOrders = await _orderRepository.GetAsync(spec, cancellationToken);
        var result = pagedOrders.MapTo(MapToDto);
        return Result<PagedResult<GetOrderDto>>.Success(result);
    }

    public async Task<Result<GetOrderDto>> GetMyOrderByIdAsync(int customerId, int orderId, CancellationToken cancellationToken = default)
    {
        var order = await GetOrderWithDetailsAsync(orderId, cancellationToken);
        if (order == null || order.IsDeleted || order.CustomerId != customerId)
        {
            return Result<GetOrderDto>.Failure("Order not found.");
        }

        return Result<GetOrderDto>.Success(MapToDto(order));
    }

    private async Task<Result> ValidateCreateAsync(CreateOrderDto dto, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(typeof(OrderType), dto.Type)) return Result.Failure("Invalid order type.");
        if (!ServiceHelpers.HasMaxLength(dto.Note, 500)) return Result.Failure("Note must be 500 characters or less.");

        if (dto.Type == OrderType.DineIn)
        {
            if (!dto.CafeTableId.HasValue) return Result.Failure("Cafe table is required for dine in order.");
            var table = await _tableRepository.GetByIdAsync(dto.CafeTableId.Value, cancellationToken);
            if (table == null || table.IsDeleted) return Result.Failure("Table not found.");
            if (table.Status != TableStatus.Free && table.Status != TableStatus.Reserved) return Result.Failure("Table must be free or reserved.");
        }

        if (dto.CustomerId.HasValue)
        {
            var customer = await _customerRepository.GetByIdAsync(dto.CustomerId.Value, cancellationToken);
            if (customer == null || customer.IsDeleted) return Result.Failure("Customer not found.");
            if (customer.Status == CustomerStatus.Blocked) return Result.Failure("Customer is blocked.");
        }

        if (dto.WaiterId.HasValue)
        {
            var waiter = await _staffRepository.GetByIdAsync(dto.WaiterId.Value, cancellationToken);
            if (waiter == null || waiter.IsDeleted) return Result.Failure("Waiter not found.");
            if (waiter.Status != StaffStatus.Active) return Result.Failure("Waiter must be active.");
            if (waiter.Role != StaffRole.Waiter && waiter.Role != StaffRole.Manager && waiter.Role != StaffRole.Admin) return Result.Failure("Staff member cannot serve as waiter.");
        }

        if (dto.CreatedByStaffMemberId.HasValue)
        {
            var creator = await _staffRepository.GetByIdAsync(dto.CreatedByStaffMemberId.Value, cancellationToken);
            if (creator == null || creator.IsDeleted) return Result.Failure("Creator staff member not found.");
            if (creator.Status != StaffStatus.Active) return Result.Failure("Creator staff member must be active.");
        }

        return Result.Success();
    }

    private async Task<Order?> GetOrderWithDetailsAsync(int orderId, CancellationToken cancellationToken)
    {
        var order = await _orderRepository.GetByIdWithDetailsAsync(orderId, cancellationToken)
            ?? await _orderRepository.GetByIdAsync(orderId, cancellationToken);
        if (order == null)
        {
            return null;
        }

        order.Items = await _orderItemRepository.GetByOrderIdAsync(orderId, cancellationToken);
        order.Payments = await _paymentRepository.GetByOrderIdAsync(orderId, cancellationToken);
        order.Discounts = await _discountRepository.GetByOrderIdAsync(orderId, cancellationToken);
        order.Tips = await _tipRepository.GetByOrderIdAsync(orderId, cancellationToken);
        return order;
    }

    private async Task RecalculateOrderTotalsAsync(Order order, CancellationToken cancellationToken)
    {
        if (order.Items.Count == 0)
        {
            order.Items = await _orderItemRepository.GetByOrderIdAsync(order.Id, cancellationToken);
        }

        if (order.Payments.Count == 0)
        {
            order.Payments = await _paymentRepository.GetByOrderIdAsync(order.Id, cancellationToken);
        }

        if (order.Discounts.Count == 0)
        {
            order.Discounts = await _discountRepository.GetByOrderIdAsync(order.Id, cancellationToken);
        }

        if (order.Tips.Count == 0)
        {
            order.Tips = await _tipRepository.GetByOrderIdAsync(order.Id, cancellationToken);
        }

        var activeItems = order.Items.Where(x => !x.IsDeleted && x.Status != OrderItemStatus.Cancelled);
        var discounts = order.Discounts.Where(x => !x.IsDeleted);
        var tips = order.Tips.Where(x => !x.IsDeleted);
        var paidAmount = order.Payments.Where(x => !x.IsDeleted && x.Status == PaymentStatus.Paid).Sum(x => x.Amount);

        order.SubTotal = activeItems.Sum(x => x.TotalPrice);
        order.DiscountAmount = discounts.Sum(x => x.Amount);
        order.TipAmount = tips.Sum(x => x.Amount);
        order.TotalAmount = order.SubTotal - order.DiscountAmount + order.TipAmount;
        if (order.TotalAmount < 0)
        {
            order.TotalAmount = 0;
        }

        order.PaymentStatus = paidAmount <= 0
            ? PaymentStatus.Unpaid
            : paidAmount < order.TotalAmount
                ? PaymentStatus.PartiallyPaid
                : PaymentStatus.Paid;
        order.UpdatedAt = DateTime.UtcNow;
    }

    // Recalculates SendToKitchenAt after any item mutation on a not-yet-promoted pre-order.
    // A no-op for a normal order (ReservationId is null) or an already-promoted one.
    private async Task RecalculateSendToKitchenAsync(Order order, CancellationToken cancellationToken)
    {
        if (!order.ReservationId.HasValue || order.Status != OrderStatus.Scheduled)
        {
            return;
        }

        var activeItems = order.Items.Where(x => !x.IsDeleted && x.Status != OrderItemStatus.Cancelled).ToList();
        if (activeItems.Count == 0)
        {
            // Nothing to cook yet - leave it unscheduled rather than compute a bogus
            // zero-cooking-time send time (see SendToKitchenAsync's empty-order guard).
            order.SendToKitchenAt = null;
            return;
        }

        var reservation = order.Reservation ?? await _reservationRepository.GetByIdAsync(order.ReservationId.Value, cancellationToken);
        if (reservation == null)
        {
            return;
        }

        var cookingTimes = activeItems.Select(x => x.Dish?.CookingTimeMinutes ?? 0);
        order.SendToKitchenAt = _kitchenSchedulingService.CalculateSendToKitchenAt(reservation.ReservedAt, cookingTimes);
    }

    // TZ 5.1's "already in the past" edge case: if the just-recalculated SendToKitchenAt is
    // already due, promote immediately in the same request instead of waiting for the next
    // KitchenPromotionBackgroundService tick.
    private async Task PromoteIfDueAsync(Order order, CancellationToken cancellationToken)
    {
        if (order.Status != OrderStatus.Scheduled || !order.SendToKitchenAt.HasValue || order.SendToKitchenAt.Value > DateTime.UtcNow)
        {
            return;
        }

        var result = await SendToKitchenAsync(order.Id, cancellationToken);
        if (!result.IsSuccess)
        {
            _logger.LogWarning(
                "Failed to immediately promote pre-order {OrderId} whose SendToKitchenAt had already passed: {Message}",
                order.Id, result.Message);
        }
    }

    private async Task ReleaseTableAsync(Order order, CancellationToken cancellationToken)
    {
        if (!order.CafeTableId.HasValue)
        {
            return;
        }

        var table = order.CafeTable ?? await _tableRepository.GetByIdAsync(order.CafeTableId.Value, cancellationToken);
        if (table == null || table.IsDeleted)
        {
            return;
        }

        // The order is done (paid and closed, or cancelled), but the table itself may still be
        // physically dirty - it goes through Cleaning rather than straight back to Free. A
        // waiter explicitly marks it "Стол убран" (CafeTableService.UpdateStatusAsync) to free it.
        table.Status = TableStatus.Cleaning;
        table.UpdatedAt = DateTime.UtcNow;
        _tableRepository.Update(table);
        order.CafeTable = table;
    }

    // Once the kitchen has started (or finished) preparing an item, silently editing the
    // quantity or deleting it would desync what's on the pass from what the guest is billed
    // for. Force+Reason is an explicit, auditable override for corrections (wrong item fired,
    // guest changed their mind after cooking started, etc.).
    private static Result<GetOrderDto>? ValidateForceGuard(OrderItem item, bool force, string? reason)
    {
        // SentToKitchenAt is the real "kitchen has already seen this" signal (OrderItemStatus
        // is never transitioned per-item today); kept alongside the Cooking/Served check for
        // forward compat if per-item kitchen statuses get wired up later.
        var isProtected = item.SentToKitchenAt != null || item.Status == OrderItemStatus.Cooking || item.Status == OrderItemStatus.Served;
        if (!isProtected)
        {
            return null;
        }

        if (!force)
        {
            return Result<GetOrderDto>.Failure("Item was already sent to the kitchen; pass force=true with a reason to cancel it.");
        }

        if (string.IsNullOrWhiteSpace(reason))
        {
            return Result<GetOrderDto>.Failure("A reason is required to force-change an item that is already Cooking or Served.");
        }

        return null;
    }

    private bool IsKitchenOnly()
    {
        return _currentUserService.IsInRole(SystemRoles.Kitchen) &&
            !_currentUserService.IsInRole(SystemRoles.Admin) &&
            !_currentUserService.IsInRole(SystemRoles.Manager) &&
            !_currentUserService.IsInRole(SystemRoles.Waiter);
    }

    private static bool IsClosedOrCancelled(Order order)
    {
        return order.Status == OrderStatus.Closed || order.Status == OrderStatus.Cancelled;
    }

    private static bool CanMoveToStatus(Order order, OrderStatus target)
    {
        if (order.Status == OrderStatus.Draft || order.Status == OrderStatus.Scheduled ||
            order.Status == OrderStatus.Closed || order.Status == OrderStatus.Cancelled)
        {
            return false;
        }

        if (target == OrderStatus.Cancelled)
        {
            return order.Status == OrderStatus.New || order.Status == OrderStatus.Accepted || order.Status == OrderStatus.Cooking || order.Status == OrderStatus.Ready;
        }

        if (target == OrderStatus.Closed)
        {
            return order.Status == OrderStatus.Served && order.PaymentStatus == PaymentStatus.Paid;
        }

        return (order.Status == OrderStatus.New && target == OrderStatus.Accepted) ||
               (order.Status == OrderStatus.Accepted && target == OrderStatus.Cooking) ||
               (order.Status == OrderStatus.Cooking && target == OrderStatus.Ready) ||
               (order.Status == OrderStatus.Ready && target == OrderStatus.Served);
    }

    private static string? MergeNote(string? current, string? addition)
    {
        var trimmedAddition = ServiceHelpers.TrimToNull(addition);
        if (trimmedAddition == null)
        {
            return current;
        }

        return string.IsNullOrWhiteSpace(current) ? trimmedAddition : $"{current} {trimmedAddition}";
    }

    private static GetOrderDto MapToDto(Order order)
    {
        return new GetOrderDto
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            OrderedAt = order.OrderedAt,
            ClosedAt = order.ClosedAt,
            Status = order.Status,
            Type = order.Type,
            CustomerId = order.CustomerId,
            CustomerName = ServiceHelpers.BuildCustomerName(order.Customer),
            CafeTableId = order.CafeTableId,
            TableNumber = order.CafeTable?.TableNumber,
            DeliveryAddress = order.DeliveryAddress,
            WaiterId = order.WaiterId,
            WaiterName = ServiceHelpers.BuildStaffName(order.Waiter),
            CreatedByStaffMemberId = order.CreatedByStaffMemberId,
            CreatedByStaffMemberName = ServiceHelpers.BuildStaffName(order.CreatedByStaffMember),
            SubTotal = order.SubTotal,
            DiscountAmount = order.DiscountAmount,
            TipAmount = order.TipAmount,
            TotalAmount = order.TotalAmount,
            PaymentStatus = order.PaymentStatus,
            Note = order.Note,
            ReservationId = order.ReservationId,
            SendToKitchenAt = order.SendToKitchenAt,
            Items = order.Items.Where(x => !x.IsDeleted).Select(MapItemToDto).ToList(),
            CreatedAt = order.CreatedAt,
            UpdatedAt = order.UpdatedAt
        };
    }

    private static GetOrderItemDto MapItemToDto(OrderItem item)
    {
        return new GetOrderItemDto
        {
            Id = item.Id,
            DishId = item.DishId,
            DishName = item.Dish?.Name ?? string.Empty,
            Quantity = item.Quantity,
            UnitPrice = item.UnitPrice,
            TotalPrice = item.TotalPrice,
            Status = item.Status,
            Note = item.Note,
            SentToKitchenAt = item.SentToKitchenAt
        };
    }
}
