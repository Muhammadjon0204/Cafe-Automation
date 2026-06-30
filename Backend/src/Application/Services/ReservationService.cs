using Cafe.Application.Common;
using Cafe.Application.DTOs.Reservations;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;

namespace Cafe.Application.Services;

public class ReservationService : IReservationService
{
    private readonly IReservationRepository _reservationRepository;
    private readonly ICafeTableRepository _tableRepository;
    private readonly ICustomerRepository _customerRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ReservationService(IReservationRepository reservationRepository, ICafeTableRepository tableRepository, ICustomerRepository customerRepository, IUnitOfWork unitOfWork)
    {
        _reservationRepository = reservationRepository;
        _tableRepository = tableRepository;
        _customerRepository = customerRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<PagedResult<GetReservationDto>>> GetAllAsync(ReservationFilterDto filter, CancellationToken cancellationToken = default)
    {
        var reservations = await _reservationRepository.GetAllAsync(cancellationToken);
        var query = reservations.Where(x => !x.IsDeleted);

        if (filter.CafeTableId.HasValue) query = query.Where(x => x.CafeTableId == filter.CafeTableId.Value);
        if (filter.CustomerId.HasValue) query = query.Where(x => x.CustomerId == filter.CustomerId.Value);
        if (filter.Status.HasValue) query = query.Where(x => x.Status == filter.Status.Value);
        if (filter.FromDate.HasValue) query = query.Where(x => x.ReservedAt >= filter.FromDate.Value);
        if (filter.ToDate.HasValue) query = query.Where(x => x.ReservedAt <= filter.ToDate.Value);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim();
            query = query.Where(x =>
                x.CustomerName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (x.Phone != null && x.Phone.Contains(search, StringComparison.OrdinalIgnoreCase)));
        }

        var result = PaginationHelper.CreatePagedResult(query.OrderByDescending(x => x.ReservedAt).Select(MapToDto), filter.PageNumber, filter.PageSize);
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

        if (table != null && table.Status == TableStatus.Free)
        {
            table.Status = TableStatus.Reserved;
            table.UpdatedAt = DateTime.UtcNow;
            _tableRepository.Update(table);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
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

        var validation = await ValidateAsync(dto.CafeTableId, dto.CustomerId, dto.CustomerName, dto.Phone, dto.GuestsCount, dto.ReservedAt, dto.ReservedUntil, dto.Note, id, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetReservationDto>.Failure(validation.Message, validation.Errors);
        }

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
            reservation.CancelledAt = dto.CancelledAt ?? DateTime.UtcNow;
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
