using Cafe.Application.Common;
using Cafe.Application.DTOs.Orders;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;

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
    private readonly IUnitOfWork _unitOfWork;

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
        IUnitOfWork unitOfWork)
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
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<PagedResult<GetOrderDto>>> GetAllAsync(OrderFilterDto filter, CancellationToken cancellationToken = default)
    {
        var orders = await _orderRepository.GetAllAsync(cancellationToken);
        var query = orders.Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim();
            query = query.Where(x =>
                x.OrderNumber.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (x.Note != null && x.Note.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                ServiceHelpers.BuildCustomerName(x.Customer).Contains(search, StringComparison.OrdinalIgnoreCase) ||
                ServiceHelpers.BuildStaffName(x.Waiter).Contains(search, StringComparison.OrdinalIgnoreCase));
        }

        if (filter.Status.HasValue) query = query.Where(x => x.Status == filter.Status.Value);
        if (filter.Type.HasValue) query = query.Where(x => x.Type == filter.Type.Value);
        if (filter.PaymentStatus.HasValue) query = query.Where(x => x.PaymentStatus == filter.PaymentStatus.Value);
        if (filter.CustomerId.HasValue) query = query.Where(x => x.CustomerId == filter.CustomerId.Value);
        if (filter.CafeTableId.HasValue) query = query.Where(x => x.CafeTableId == filter.CafeTableId.Value);
        if (filter.WaiterId.HasValue) query = query.Where(x => x.WaiterId == filter.WaiterId.Value);
        if (filter.FromDate.HasValue) query = query.Where(x => x.OrderedAt >= filter.FromDate.Value);
        if (filter.ToDate.HasValue) query = query.Where(x => x.OrderedAt <= filter.ToDate.Value);

        var result = PaginationHelper.CreatePagedResult(query.OrderByDescending(x => x.OrderedAt).Select(MapToDto), filter.PageNumber, filter.PageSize);
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
        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

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
        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<GetOrderDto>.Success(MapToDto(order), "Order item updated.");
    }

    public async Task<Result<GetOrderDto>> RemoveItemAsync(int orderId, int itemId, CancellationToken cancellationToken = default)
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

        await RecalculateOrderTotalsAsync(order, cancellationToken);
        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

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

        if (order.PaymentStatus == PaymentStatus.Paid)
        {
            return Result<GetOrderDto>.Failure("Cannot cancel paid order without refund logic.");
        }

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

        await ReleaseTableAsync(order, cancellationToken);
        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
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
        return Result<GetOrderDto>.Success(MapToDto(order), "Order closed.");
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

        table.Status = TableStatus.Free;
        table.UpdatedAt = DateTime.UtcNow;
        _tableRepository.Update(table);
        order.CafeTable = table;
    }

    private static bool IsClosedOrCancelled(Order order)
    {
        return order.Status == OrderStatus.Closed || order.Status == OrderStatus.Cancelled;
    }

    private static bool CanMoveToStatus(Order order, OrderStatus target)
    {
        if (order.Status == OrderStatus.Closed || order.Status == OrderStatus.Cancelled)
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
            Note = item.Note
        };
    }
}
