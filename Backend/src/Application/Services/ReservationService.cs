using Cafe.Application.Common;
using Cafe.Application.DTOs.Orders;
using Cafe.Application.DTOs.Reservations;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Application.Services.Reservations.Specifications;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;

namespace Cafe.Application.Services;

public class ReservationService : IReservationService
{
    private readonly IReservationRepository _reservationRepository;
    private readonly ICafeTableRepository _tableRepository;
    private readonly ICustomerRepository _customerRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IOrderService _orderService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IRealtimeNotifier _realtimeNotifier;

    public ReservationService(
        IReservationRepository reservationRepository,
        ICafeTableRepository tableRepository,
        ICustomerRepository customerRepository,
        IOrderRepository orderRepository,
        IOrderService orderService,
        IUnitOfWork unitOfWork,
        IRealtimeNotifier realtimeNotifier)
    {
        _reservationRepository = reservationRepository;
        _tableRepository = tableRepository;
        _customerRepository = customerRepository;
        _orderRepository = orderRepository;
        _orderService = orderService;
        _unitOfWork = unitOfWork;
        _realtimeNotifier = realtimeNotifier;
    }

    // Shared by UpdateStatusAsync and DeleteAsync: a reservation ending up Cancelled cancels
    // its linked pre-order too (TZ 4.1.6), if that order hasn't already reached a terminal
    // state. Reuses OrderService.CancelAsync rather than reimplementing table-release/item-
    // cancellation/totals here - that also means an already-promoted (non-Scheduled) order
    // still gets OrderService's existing "can't cancel a paid order" guard for free.
    private async Task CancelLinkedOrderAsync(int reservationId, string reason, CancellationToken cancellationToken)
    {
        var linkedOrder = await _orderRepository.GetByReservationIdAsync(reservationId, cancellationToken);
        if (linkedOrder == null || linkedOrder.Status == OrderStatus.Cancelled || linkedOrder.Status == OrderStatus.Closed)
        {
            return;
        }

        await _orderService.CancelAsync(linkedOrder.Id, new CancelOrderDto { Reason = reason }, cancellationToken);
    }

    // See OrderService.NotifyOrderChangedAsync — same best-effort reasoning.
    private async Task NotifyTableChangedAsync(int tableId, CancellationToken cancellationToken)
    {
        try
        {
            await _realtimeNotifier.TableChangedAsync(tableId, cancellationToken);
        }
        catch
        {
        }
    }

    public async Task<Result<PagedResult<GetReservationDto>>> GetAllAsync(ReservationFilterDto filter, CancellationToken cancellationToken = default)
    {
        var spec = new ReservationFilterSpecification(filter);
        var pagedReservations = await _reservationRepository.GetAsync(spec, cancellationToken);
        var result = pagedReservations.MapTo(MapToDto);
        return Result<PagedResult<GetReservationDto>>.Success(result);
    }

    public async Task<Result<GetReservationDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var reservation = await _reservationRepository.GetByIdAsync(id, cancellationToken);
        if (reservation == null || reservation.IsDeleted)
        {
            return Result<GetReservationDto>.Failure("Reservation not found.");
        }

        return Result<GetReservationDto>.Success(MapToDto(reservation));
    }

    public async Task<Result<GetReservationDto>> CreateAsync(CreateReservationDto dto, CancellationToken cancellationToken = default)
    {
        dto.ReservedAt = ServiceHelpers.AsUtc(dto.ReservedAt);
        dto.ReservedUntil = ServiceHelpers.AsUtc(dto.ReservedUntil);

        var validation = await ValidateAsync(dto.CafeTableId, dto.CustomerId, dto.CustomerName, dto.Phone, dto.GuestsCount, dto.ReservedAt, dto.ReservedUntil, dto.Note, null, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetReservationDto>.Failure(validation.Message, validation.Errors);
        }

        var table = await _tableRepository.GetByIdAsync(dto.CafeTableId, cancellationToken);
        var reservation = new Reservation
        {
            CafeTableId = dto.CafeTableId,
            CafeTable = table,
            CustomerId = dto.CustomerId,
            CustomerName = dto.CustomerName.Trim(),
            Phone = ServiceHelpers.TrimToNull(dto.Phone),
            GuestsCount = dto.GuestsCount,
            ReservedAt = dto.ReservedAt,
            ReservedUntil = dto.ReservedUntil,
            Status = ReservationStatus.Pending,
            Note = ServiceHelpers.TrimToNull(dto.Note),
            CreatedAt = DateTime.UtcNow
        };

        await _reservationRepository.AddAsync(reservation, cancellationToken);

        var tableStatusChanged = table != null && table.Status == TableStatus.Free;
        if (tableStatusChanged)
        {
            table!.Status = TableStatus.Reserved;
            table.UpdatedAt = DateTime.UtcNow;
            _tableRepository.Update(table);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (tableStatusChanged)
        {
            await NotifyTableChangedAsync(table!.Id, cancellationToken);
        }
        return Result<GetReservationDto>.Success(MapToDto(reservation), "Reservation created.");
    }

    public async Task<Result<GetReservationDto>> UpdateAsync(int id, UpdateReservationDto dto, CancellationToken cancellationToken = default)
    {
        var reservation = await _reservationRepository.GetByIdAsync(id, cancellationToken);
        if (reservation == null || reservation.IsDeleted)
        {
            return Result<GetReservationDto>.Failure("Reservation not found.");
        }

        if (!Enum.IsDefined(typeof(ReservationStatus), dto.Status))
        {
            return Result<GetReservationDto>.Failure("Invalid reservation status.");
        }

        dto.ReservedAt = ServiceHelpers.AsUtc(dto.ReservedAt);
        dto.ReservedUntil = ServiceHelpers.AsUtc(dto.ReservedUntil);

        var validation = await ValidateAsync(dto.CafeTableId, dto.CustomerId, dto.CustomerName, dto.Phone, dto.GuestsCount, dto.ReservedAt, dto.ReservedUntil, dto.Note, id, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetReservationDto>.Failure(validation.Message, validation.Errors);
        }

        var originalReservedAt = reservation.ReservedAt;

        reservation.CafeTableId = dto.CafeTableId;
        reservation.CafeTable = await _tableRepository.GetByIdAsync(dto.CafeTableId, cancellationToken);
        reservation.CustomerId = dto.CustomerId;
        reservation.CustomerName = dto.CustomerName.Trim();
        reservation.Phone = ServiceHelpers.TrimToNull(dto.Phone);
        reservation.GuestsCount = dto.GuestsCount;
        reservation.ReservedAt = dto.ReservedAt;
        reservation.ReservedUntil = dto.ReservedUntil;
        reservation.Status = dto.Status;
        reservation.Note = ServiceHelpers.TrimToNull(dto.Note);
        reservation.UpdatedAt = DateTime.UtcNow;

        _reservationRepository.Update(reservation);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // TZ 4.3: a rescheduled reservation with a not-yet-promoted pre-order needs its
        // SendToKitchenAt recomputed against the new time. Delegates to OrderService (which
        // owns the formula + the "already due -> promote now" edge case) rather than
        // reimplementing that branching here.
        if (reservation.ReservedAt != originalReservedAt)
        {
            var linkedOrder = await _orderRepository.GetByReservationIdAsync(id, cancellationToken);
            if (linkedOrder != null && linkedOrder.Status == OrderStatus.Scheduled)
            {
                await _orderService.RecalculateSendToKitchenTimingAsync(linkedOrder.Id, cancellationToken);
            }
        }

        return Result<GetReservationDto>.Success(MapToDto(reservation), "Reservation updated.");
    }

    public async Task<Result<GetReservationDto>> UpdateStatusAsync(int id, UpdateReservationStatusDto dto, CancellationToken cancellationToken = default)
    {
        var reservation = await _reservationRepository.GetByIdAsync(id, cancellationToken);
        if (reservation == null || reservation.IsDeleted)
        {
            return Result<GetReservationDto>.Failure("Reservation not found.");
        }

        if (!Enum.IsDefined(typeof(ReservationStatus), dto.Status))
        {
            return Result<GetReservationDto>.Failure("Invalid reservation status.");
        }

        reservation.Status = dto.Status;
        reservation.UpdatedAt = DateTime.UtcNow;
        if (dto.Status == ReservationStatus.Cancelled)
        {
            reservation.CancelledAt = ServiceHelpers.AsUtc(dto.CancelledAt) ?? DateTime.UtcNow;
        }

        if (!string.IsNullOrWhiteSpace(dto.Note))
        {
            reservation.Note = dto.Note.Trim();
        }

        var table = reservation.CafeTable ?? await _tableRepository.GetByIdAsync(reservation.CafeTableId, cancellationToken);
        if (table != null)
        {
            if (dto.Status == ReservationStatus.Seated)
            {
                table.Status = TableStatus.Occupied;
            }
            else if (dto.Status == ReservationStatus.Completed || dto.Status == ReservationStatus.Cancelled)
            {
                table.Status = TableStatus.Free;
            }

            table.UpdatedAt = DateTime.UtcNow;
            _tableRepository.Update(table);
            reservation.CafeTable = table;
        }

        _reservationRepository.Update(reservation);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (table != null)
        {
            await NotifyTableChangedAsync(table.Id, cancellationToken);
        }

        if (dto.Status == ReservationStatus.Cancelled)
        {
            await CancelLinkedOrderAsync(id, "Reservation cancelled.", cancellationToken);
        }

        return Result<GetReservationDto>.Success(MapToDto(reservation), "Reservation status updated.");
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var reservation = await _reservationRepository.GetByIdAsync(id, cancellationToken);
        if (reservation == null || reservation.IsDeleted)
        {
            return Result.Failure("Reservation not found.");
        }

        reservation.IsDeleted = true;
        if (reservation.Status != ReservationStatus.Completed && reservation.Status != ReservationStatus.Cancelled)
        {
            reservation.Status = ReservationStatus.Cancelled;
            reservation.CancelledAt = DateTime.UtcNow;
        }

        reservation.UpdatedAt = DateTime.UtcNow;
        _reservationRepository.Update(reservation);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (reservation.Status == ReservationStatus.Cancelled)
        {
            await CancelLinkedOrderAsync(id, "Reservation deleted.", cancellationToken);
        }

        return Result.Success("Reservation deleted.");
    }

    private async Task<Result> ValidateAsync(int tableId, int? customerId, string customerName, string? phone, int guestsCount, DateTime reservedAt, DateTime? reservedUntil, string? note, int? excludeId, CancellationToken cancellationToken)
    {
        var table = await _tableRepository.GetByIdAsync(tableId, cancellationToken);
        if (table == null || table.IsDeleted) return Result.Failure("Table not found.");
        if (table.Status == TableStatus.Disabled) return Result.Failure("Table is disabled.");

        if (customerId.HasValue)
        {
            var customer = await _customerRepository.GetByIdAsync(customerId.Value, cancellationToken);
            if (customer == null || customer.IsDeleted) return Result.Failure("Customer not found.");
            if (customer.Status == CustomerStatus.Blocked) return Result.Failure("Customer is blocked.");
        }

        if (string.IsNullOrWhiteSpace(customerName)) return Result.Failure("Customer name is required.");
        if (customerName.Trim().Length > 150) return Result.Failure("Customer name must be 150 characters or less.");
        if (!ServiceHelpers.HasMaxLength(phone, 30)) return Result.Failure("Phone must be 30 characters or less.");
        if (guestsCount <= 0) return Result.Failure("Guests count must be greater than zero.");
        if (guestsCount > table.SeatsCount) return Result.Failure("Guests count exceeds table seats count.");
        if (reservedAt <= DateTime.UtcNow) return Result.Failure("Reserved at must be in the future.");
        if (reservedUntil.HasValue && reservedUntil.Value <= reservedAt) return Result.Failure("Reserved until must be greater than reserved at.");
        if (!ServiceHelpers.HasMaxLength(note, 500)) return Result.Failure("Note must be 500 characters or less.");
        if (await _reservationRepository.HasConflictAsync(tableId, reservedAt, reservedUntil, excludeId, cancellationToken)) return Result.Failure("Reservation conflicts with another reservation.");
        return Result.Success();
    }

    private static GetReservationDto MapToDto(Reservation reservation)
    {
        return new GetReservationDto
        {
            Id = reservation.Id,
            CafeTableId = reservation.CafeTableId,
            TableNumber = reservation.CafeTable?.TableNumber ?? 0,
            CustomerId = reservation.CustomerId,
            CustomerName = reservation.CustomerName,
            Phone = reservation.Phone,
            GuestsCount = reservation.GuestsCount,
            ReservedAt = reservation.ReservedAt,
            ReservedUntil = reservation.ReservedUntil,
            CancelledAt = reservation.CancelledAt,
            Status = reservation.Status,
            Note = reservation.Note,
            CreatedAt = reservation.CreatedAt,
            UpdatedAt = reservation.UpdatedAt
        };
    }
}
