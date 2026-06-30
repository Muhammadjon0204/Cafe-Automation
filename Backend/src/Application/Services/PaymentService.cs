using Cafe.Application.DTOs.Payments;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;

namespace Cafe.Application.Services;

public class PaymentService : IPaymentService
{
    private readonly IPaymentRepository _paymentRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IStaffMemberRepository _staffRepository;
    private readonly IUnitOfWork _unitOfWork;

    public PaymentService(IPaymentRepository paymentRepository, IOrderRepository orderRepository, IStaffMemberRepository staffRepository, IUnitOfWork unitOfWork)
    {
        _paymentRepository = paymentRepository;
        _orderRepository = orderRepository;
        _staffRepository = staffRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<List<GetPaymentDto>>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdAsync(orderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<List<GetPaymentDto>>.Failure("Order not found.");
        }

        var payments = await _paymentRepository.GetByOrderIdAsync(orderId, cancellationToken);
        var result = payments.Where(x => !x.IsDeleted).OrderByDescending(x => x.PaidAt).Select(MapToDto).ToList();
        return Result<List<GetPaymentDto>>.Success(result);
    }

    public async Task<Result<GetPaymentDto>> CreateAsync(CreatePaymentDto dto, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdWithDetailsAsync(dto.OrderId, cancellationToken)
            ?? await _orderRepository.GetByIdAsync(dto.OrderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<GetPaymentDto>.Failure("Order not found.");
        }

        var validation = await ValidateAsync(dto, order, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetPaymentDto>.Failure(validation.Message, validation.Errors);
        }

        var payment = new Payment
        {
            OrderId = dto.OrderId,
            Order = order,
            CashierId = dto.CashierId,
            Amount = dto.Amount,
            Method = dto.Method,
            Status = PaymentStatus.Paid,
            PaidAt = DateTime.UtcNow,
            TransactionNumber = ServiceHelpers.TrimToNull(dto.TransactionNumber),
            Note = ServiceHelpers.TrimToNull(dto.Note),
            CreatedAt = DateTime.UtcNow
        };

        await _paymentRepository.AddAsync(payment, cancellationToken);

        var previousPaid = await _paymentRepository.GetPaidAmountByOrderIdAsync(order.Id, cancellationToken);
        var paidAmount = previousPaid + payment.Amount;
        order.PaymentStatus = paidAmount <= 0
            ? PaymentStatus.Unpaid
            : paidAmount < order.TotalAmount
                ? PaymentStatus.PartiallyPaid
                : PaymentStatus.Paid;
        order.UpdatedAt = DateTime.UtcNow;

        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<GetPaymentDto>.Success(MapToDto(payment), "Payment created.");
    }

    private async Task<Result> ValidateAsync(CreatePaymentDto dto, Order order, CancellationToken cancellationToken)
    {
        if (order.Status == OrderStatus.Cancelled) return Result.Failure("Cannot pay cancelled order.");
        if (order.Status == OrderStatus.Closed && order.PaymentStatus == PaymentStatus.Paid) return Result.Failure("Order is already closed and paid.");
        if (dto.Amount <= 0) return Result.Failure("Amount must be greater than zero.");
        if (!Enum.IsDefined(typeof(PaymentMethod), dto.Method)) return Result.Failure("Invalid payment method.");
        if (!ServiceHelpers.HasMaxLength(dto.TransactionNumber, 100)) return Result.Failure("Transaction number must be 100 characters or less.");
        if (!ServiceHelpers.HasMaxLength(dto.Note, 500)) return Result.Failure("Note must be 500 characters or less.");
        if (order.TotalAmount <= 0) return Result.Failure("Cannot pay order with zero total amount.");

        if (dto.CashierId.HasValue)
        {
            var cashier = await _staffRepository.GetByIdAsync(dto.CashierId.Value, cancellationToken);
            if (cashier == null || cashier.IsDeleted) return Result.Failure("Cashier not found.");
            if (cashier.Status != StaffStatus.Active) return Result.Failure("Cashier must be active.");
            if (cashier.Role != StaffRole.Cashier && cashier.Role != StaffRole.Admin && cashier.Role != StaffRole.Manager) return Result.Failure("Staff member cannot serve as cashier.");
        }

        var paidAmount = await _paymentRepository.GetPaidAmountByOrderIdAsync(order.Id, cancellationToken);
        if (paidAmount + dto.Amount > order.TotalAmount)
        {
            return Result.Failure("Payment amount exceeds order total.");
        }

        return Result.Success();
    }

    private static GetPaymentDto MapToDto(Payment payment)
    {
        return new GetPaymentDto
        {
            Id = payment.Id,
            OrderId = payment.OrderId,
            OrderNumber = payment.Order?.OrderNumber ?? string.Empty,
            CashierId = payment.CashierId,
            CashierName = ServiceHelpers.BuildStaffName(payment.Cashier),
            Amount = payment.Amount,
            Method = payment.Method,
            Status = payment.Status,
            PaidAt = payment.PaidAt,
            TransactionNumber = payment.TransactionNumber,
            Note = payment.Note,
            CreatedAt = payment.CreatedAt,
            UpdatedAt = payment.UpdatedAt
        };
    }
}
