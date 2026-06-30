using Cafe.Application.DTOs.Discounts;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;

namespace Cafe.Application.Services;

public class DiscountService : IDiscountService
{
    private readonly IDiscountRepository _discountRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DiscountService(IDiscountRepository discountRepository, IOrderRepository orderRepository, IUnitOfWork unitOfWork)
    {
        _discountRepository = discountRepository;
        _orderRepository = orderRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<List<GetDiscountDto>>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdAsync(orderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<List<GetDiscountDto>>.Failure("Order not found.");
        }

        var discounts = await _discountRepository.GetByOrderIdAsync(orderId, cancellationToken);
        return Result<List<GetDiscountDto>>.Success(discounts.Where(x => !x.IsDeleted).Select(MapToDto).ToList());
    }

    public async Task<Result<GetDiscountDto>> ApplyAsync(ApplyDiscountDto dto, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdWithDetailsAsync(dto.OrderId, cancellationToken)
            ?? await _orderRepository.GetByIdAsync(dto.OrderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<GetDiscountDto>.Failure("Order not found.");
        }

        var amountResult = CalculateDiscountAmount(dto, order);
        if (!amountResult.IsSuccess)
        {
            return Result<GetDiscountDto>.Failure(amountResult.Message, amountResult.Errors);
        }

        var discount = new Discount
        {
            OrderId = dto.OrderId,
            Order = order,
            Name = dto.Name.Trim(),
            Type = dto.Type,
            Value = dto.Value,
            Amount = amountResult.Data,
            Reason = ServiceHelpers.TrimToNull(dto.Reason),
            AppliedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await _discountRepository.AddAsync(discount, cancellationToken);
        order.Discounts.Add(discount);
        RecalculateOrderTotals(order);
        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<GetDiscountDto>.Success(MapToDto(discount), "Discount applied.");
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var discount = await _discountRepository.GetByIdAsync(id, cancellationToken);
        if (discount == null || discount.IsDeleted)
        {
            return Result.Failure("Discount not found.");
        }

        discount.IsDeleted = true;
        discount.UpdatedAt = DateTime.UtcNow;
        _discountRepository.Update(discount);

        var order = await _orderRepository.GetByIdWithDetailsAsync(discount.OrderId, cancellationToken)
            ?? await _orderRepository.GetByIdAsync(discount.OrderId, cancellationToken);
        if (order != null)
        {
            order.Discounts = await _discountRepository.GetByOrderIdAsync(order.Id, cancellationToken);
            RecalculateOrderTotals(order);
            _orderRepository.Update(order);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success("Discount deleted.");
    }

    private static Result<decimal> CalculateDiscountAmount(ApplyDiscountDto dto, Order order)
    {
        if (order.Status == OrderStatus.Closed) return Result<decimal>.Failure("Cannot discount closed order.");
        if (order.Status == OrderStatus.Cancelled) return Result<decimal>.Failure("Cannot discount cancelled order.");
        if (string.IsNullOrWhiteSpace(dto.Name)) return Result<decimal>.Failure("Name is required.");
        if (dto.Name.Trim().Length > 100) return Result<decimal>.Failure("Name must be 100 characters or less.");
        if (!ServiceHelpers.HasMaxLength(dto.Reason, 500)) return Result<decimal>.Failure("Reason must be 500 characters or less.");
        if (!Enum.IsDefined(typeof(DiscountType), dto.Type)) return Result<decimal>.Failure("Invalid discount type.");
        if (dto.Value <= 0) return Result<decimal>.Failure("Discount value must be greater than zero.");
        if (order.SubTotal <= 0) return Result<decimal>.Failure("Cannot apply discount to empty order.");

        var amount = dto.Type == DiscountType.Percentage ? order.SubTotal * dto.Value / 100 : dto.Value;
        if (dto.Type == DiscountType.Percentage && dto.Value > 100) return Result<decimal>.Failure("Percentage discount cannot be greater than 100.");
        if (amount > order.SubTotal) return Result<decimal>.Failure("Discount amount cannot be greater than order subtotal.");

        return Result<decimal>.Success(amount);
    }

    private static void RecalculateOrderTotals(Order order)
    {
        order.DiscountAmount = order.Discounts.Where(x => !x.IsDeleted).Sum(x => x.Amount);
        order.TotalAmount = order.SubTotal - order.DiscountAmount + order.TipAmount;
        if (order.TotalAmount < 0)
        {
            order.TotalAmount = 0;
        }

        var paidAmount = order.Payments.Where(x => !x.IsDeleted && x.Status == PaymentStatus.Paid).Sum(x => x.Amount);
        order.PaymentStatus = paidAmount <= 0
            ? PaymentStatus.Unpaid
            : paidAmount < order.TotalAmount
                ? PaymentStatus.PartiallyPaid
                : PaymentStatus.Paid;
        order.UpdatedAt = DateTime.UtcNow;
    }

    private static GetDiscountDto MapToDto(Discount discount)
    {
        return new GetDiscountDto
        {
            Id = discount.Id,
            OrderId = discount.OrderId,
            OrderNumber = discount.Order?.OrderNumber ?? string.Empty,
            Name = discount.Name,
            Type = discount.Type,
            Value = discount.Value,
            Amount = discount.Amount,
            Reason = discount.Reason,
            AppliedAt = discount.AppliedAt,
            CreatedAt = discount.CreatedAt
        };
    }
}
