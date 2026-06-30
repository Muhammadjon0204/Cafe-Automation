using Cafe.Application.DTOs.Tips;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;

namespace Cafe.Application.Services;

public class TipService : ITipService
{
    private readonly ITipRepository _tipRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IStaffMemberRepository _staffRepository;
    private readonly IPaymentRepository _paymentRepository;
    private readonly IUnitOfWork _unitOfWork;

    public TipService(ITipRepository tipRepository, IOrderRepository orderRepository, IStaffMemberRepository staffRepository, IPaymentRepository paymentRepository, IUnitOfWork unitOfWork)
    {
        _tipRepository = tipRepository;
        _orderRepository = orderRepository;
        _staffRepository = staffRepository;
        _paymentRepository = paymentRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<List<GetTipDto>>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdAsync(orderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<List<GetTipDto>>.Failure("Order not found.");
        }

        var tips = await _tipRepository.GetByOrderIdAsync(orderId, cancellationToken);
        return Result<List<GetTipDto>>.Success(tips.Where(x => !x.IsDeleted).Select(MapToDto).ToList());
    }

    public async Task<Result<GetTipDto>> AddAsync(AddTipDto dto, CancellationToken cancellationToken = default)
    {
        var order = await _orderRepository.GetByIdWithDetailsAsync(dto.OrderId, cancellationToken)
            ?? await _orderRepository.GetByIdAsync(dto.OrderId, cancellationToken);
        if (order == null || order.IsDeleted)
        {
            return Result<GetTipDto>.Failure("Order not found.");
        }

        var validation = await ValidateAsync(dto, order, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetTipDto>.Failure(validation.Message, validation.Errors);
        }

        var tip = new Tip
        {
            OrderId = dto.OrderId,
            Order = order,
            StaffMemberId = dto.StaffMemberId,
            Amount = dto.Amount,
            Method = dto.Method,
            GivenAt = DateTime.UtcNow,
            Note = ServiceHelpers.TrimToNull(dto.Note),
            CreatedAt = DateTime.UtcNow
        };

        await _tipRepository.AddAsync(tip, cancellationToken);
        order.Tips.Add(tip);
        await RecalculateOrderTotalsAsync(order, cancellationToken);
        _orderRepository.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<GetTipDto>.Success(MapToDto(tip), "Tip added.");
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var tip = await _tipRepository.GetByIdAsync(id, cancellationToken);
        if (tip == null || tip.IsDeleted)
        {
            return Result.Failure("Tip not found.");
        }

        tip.IsDeleted = true;
        tip.UpdatedAt = DateTime.UtcNow;
        _tipRepository.Update(tip);

        var order = await _orderRepository.GetByIdWithDetailsAsync(tip.OrderId, cancellationToken)
            ?? await _orderRepository.GetByIdAsync(tip.OrderId, cancellationToken);
        if (order != null)
        {
            order.Tips = await _tipRepository.GetByOrderIdAsync(order.Id, cancellationToken);
            await RecalculateOrderTotalsAsync(order, cancellationToken);
            _orderRepository.Update(order);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success("Tip deleted.");
    }

    private async Task<Result> ValidateAsync(AddTipDto dto, Order order, CancellationToken cancellationToken)
    {
        if (order.Status == OrderStatus.Cancelled) return Result.Failure("Cannot add tip to cancelled order.");
        if (dto.Amount <= 0) return Result.Failure("Amount must be greater than zero.");
        if (!Enum.IsDefined(typeof(PaymentMethod), dto.Method)) return Result.Failure("Invalid payment method.");
        if (!ServiceHelpers.HasMaxLength(dto.Note, 500)) return Result.Failure("Note must be 500 characters or less.");

        if (dto.StaffMemberId.HasValue)
        {
            var staff = await _staffRepository.GetByIdAsync(dto.StaffMemberId.Value, cancellationToken);
            if (staff == null || staff.IsDeleted) return Result.Failure("Staff member not found.");
            if (staff.Status != StaffStatus.Active) return Result.Failure("Staff member must be active.");
        }

        return Result.Success();
    }

    private async Task RecalculateOrderTotalsAsync(Order order, CancellationToken cancellationToken)
    {
        order.TipAmount = order.Tips.Where(x => !x.IsDeleted).Sum(x => x.Amount);
        order.TotalAmount = order.SubTotal - order.DiscountAmount + order.TipAmount;
        if (order.TotalAmount < 0)
        {
            order.TotalAmount = 0;
        }

        order.Payments = await _paymentRepository.GetByOrderIdAsync(order.Id, cancellationToken);
        var paidAmount = order.Payments.Where(x => !x.IsDeleted && x.Status == PaymentStatus.Paid).Sum(x => x.Amount);
        order.PaymentStatus = paidAmount <= 0
            ? PaymentStatus.Unpaid
            : paidAmount < order.TotalAmount
                ? PaymentStatus.PartiallyPaid
                : PaymentStatus.Paid;
        order.UpdatedAt = DateTime.UtcNow;
    }

    private static GetTipDto MapToDto(Tip tip)
    {
        return new GetTipDto
        {
            Id = tip.Id,
            OrderId = tip.OrderId,
            OrderNumber = tip.Order?.OrderNumber ?? string.Empty,
            StaffMemberId = tip.StaffMemberId,
            StaffMemberName = ServiceHelpers.BuildStaffName(tip.StaffMember),
            Amount = tip.Amount,
            Method = tip.Method,
            GivenAt = tip.GivenAt,
            Note = tip.Note,
            CreatedAt = tip.CreatedAt
        };
    }
}
