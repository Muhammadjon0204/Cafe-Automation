using Cafe.Application.Common;
using Cafe.Application.DTOs.CafeTables;
using Cafe.Application.DTOs.Reservations;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;

namespace Cafe.Application.Services;

public class CafeTableService : ICafeTableService
{
    private readonly ICafeTableRepository _tableRepository;
    private readonly IZoneRepository _zoneRepository;
    private readonly IReservationRepository _reservationRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IRealtimeNotifier _realtimeNotifier;
    private readonly ITableAvailabilityService _tableAvailabilityService;

    public CafeTableService(
        ICafeTableRepository tableRepository,
        IZoneRepository zoneRepository,
        IReservationRepository reservationRepository,
        IOrderRepository orderRepository,
        IUnitOfWork unitOfWork,
        IRealtimeNotifier realtimeNotifier,
        ITableAvailabilityService tableAvailabilityService)
    {
        _tableRepository = tableRepository;
        _zoneRepository = zoneRepository;
        _reservationRepository = reservationRepository;
        _orderRepository = orderRepository;
        _unitOfWork = unitOfWork;
        _realtimeNotifier = realtimeNotifier;
        _tableAvailabilityService = tableAvailabilityService;
    }

    // Same check OrderService.OpenTableAsync uses (TZ 3.2), exposed read-only so the UI can
    // warn before the waiter even clicks "open table".
    public async Task<Result<TableAvailabilityDto>> GetAvailabilityAsync(int id, CancellationToken cancellationToken = default)
    {
        var table = await _tableRepository.GetByIdAsync(id, cancellationToken);
        if (table == null || table.IsDeleted)
        {
            return Result<TableAvailabilityDto>.Failure("Table not found.");
        }

        var availability = await _tableAvailabilityService.CheckWalkInAvailabilityAsync(id, DateTime.UtcNow, cancellationToken);
        return Result<TableAvailabilityDto>.Success(new TableAvailabilityDto
        {
            CanOpenFreely = availability.CanOpenFreely,
            RequiresWarning = availability.RequiresWarning,
            IsBlocked = availability.IsBlocked,
            NearestReservationAt = availability.NearestReservation?.ReservedAt,
            MinutesUntilReservation = availability.MinutesUntilReservation,
            Message = availability.Message
        });
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

    public async Task<Result<PagedResult<GetCafeTableDto>>> GetAllAsync(CafeTableFilterDto filter, CancellationToken cancellationToken = default)
    {
        var tables = await _tableRepository.GetAllAsync(cancellationToken);
        var query = tables.Where(x => !x.IsDeleted);

        if (filter.TableNumber.HasValue) query = query.Where(x => x.TableNumber == filter.TableNumber.Value);
        if (filter.Status.HasValue) query = query.Where(x => x.Status == filter.Status.Value);
        if (filter.MinSeatsCount.HasValue) query = query.Where(x => x.SeatsCount >= filter.MinSeatsCount.Value);
        if (filter.MaxSeatsCount.HasValue) query = query.Where(x => x.SeatsCount <= filter.MaxSeatsCount.Value);
        if (filter.ZoneId.HasValue) query = query.Where(x => x.ZoneId == filter.ZoneId.Value);
        if (!string.IsNullOrWhiteSpace(filter.Location))
        {
            var location = filter.Location.Trim();
            query = query.Where(x => x.Location != null && x.Location.Contains(location, StringComparison.OrdinalIgnoreCase));
        }

        var matched = query.OrderBy(x => x.TableNumber).ToList();
        var reservationsByTableId = await GetUpcomingReservationsByTableIdAsync(matched.Select(x => x.Id), cancellationToken);
        var result = PaginationHelper.CreatePagedResult(
            matched.Select(x => MapToDto(x, reservationsByTableId.GetValueOrDefault(x.Id))),
            filter.PageNumber,
            filter.PageSize);
        return Result<PagedResult<GetCafeTableDto>>.Success(result);
    }

    public async Task<Result<GetCafeTableDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var table = await _tableRepository.GetByIdAsync(id, cancellationToken);
        if (table == null || table.IsDeleted)
        {
            return Result<GetCafeTableDto>.Failure("Table not found.");
        }

        var upcomingReservation = await _reservationRepository.GetNearestUpcomingActiveAsync(id, DateTime.UtcNow, cancellationToken);
        return Result<GetCafeTableDto>.Success(MapToDto(table, upcomingReservation));
    }

    // One query for all matched tables instead of one per table (see
    // IReservationRepository.GetNearestUpcomingActiveForTablesAsync).
    private async Task<Dictionary<int, Reservation>> GetUpcomingReservationsByTableIdAsync(IEnumerable<int> tableIds, CancellationToken cancellationToken)
    {
        var reservations = await _reservationRepository.GetNearestUpcomingActiveForTablesAsync(tableIds, DateTime.UtcNow, cancellationToken);
        return reservations.ToDictionary(x => x.CafeTableId);
    }

    public async Task<Result<GetCafeTableDto>> CreateAsync(CreateCafeTableDto dto, CancellationToken cancellationToken = default)
    {
        var validation = await ValidateAsync(dto.TableNumber, dto.SeatsCount, dto.Location, dto.Note, null, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetCafeTableDto>.Failure(validation.Message, validation.Errors);
        }

        if (dto.Width is <= 0 or > 400 || dto.Height is <= 0 or > 400)
        {
            return Result<GetCafeTableDto>.Failure("Width and height must be between 1 and 400.");
        }

        if (dto.Shape.HasValue && !Enum.IsDefined(typeof(TableShape), dto.Shape.Value))
        {
            return Result<GetCafeTableDto>.Failure("Invalid table shape.");
        }

        Zone? zone = null;
        if (dto.ZoneId.HasValue)
        {
            zone = await _zoneRepository.GetByIdAsync(dto.ZoneId.Value, cancellationToken);
            if (zone == null || zone.IsDeleted)
            {
                return Result<GetCafeTableDto>.Failure("Zone not found.");
            }
        }

        var table = new CafeTable
        {
            TableNumber = dto.TableNumber,
            SeatsCount = dto.SeatsCount,
            Status = TableStatus.Free,
            Location = ServiceHelpers.TrimToNull(dto.Location),
            Note = ServiceHelpers.TrimToNull(dto.Note),
            PositionX = dto.PositionX ?? 40,
            PositionY = dto.PositionY ?? 40,
            Width = dto.Width ?? 80,
            Height = dto.Height ?? 80,
            Shape = dto.Shape ?? TableShape.Rectangle,
            ZoneId = dto.ZoneId,
            Zone = zone,
            CreatedAt = DateTime.UtcNow
        };

        await _tableRepository.AddAsync(table, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyTableChangedAsync(table.Id, cancellationToken);
        return Result<GetCafeTableDto>.Success(MapToDto(table), "Table created.");
    }

    public async Task<Result<GetCafeTableDto>> UpdateAsync(int id, UpdateCafeTableDto dto, CancellationToken cancellationToken = default)
    {
        var table = await _tableRepository.GetByIdAsync(id, cancellationToken);
        if (table == null || table.IsDeleted)
        {
            return Result<GetCafeTableDto>.Failure("Table not found.");
        }

        var validation = await ValidateAsync(dto.TableNumber, dto.SeatsCount, dto.Location, dto.Note, id, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetCafeTableDto>.Failure(validation.Message, validation.Errors);
        }

        if (!Enum.IsDefined(typeof(TableStatus), dto.Status))
        {
            return Result<GetCafeTableDto>.Failure("Invalid table status.");
        }

        table.TableNumber = dto.TableNumber;
        table.SeatsCount = dto.SeatsCount;
        table.Status = dto.Status;
        table.Location = ServiceHelpers.TrimToNull(dto.Location);
        table.Note = ServiceHelpers.TrimToNull(dto.Note);
        table.UpdatedAt = DateTime.UtcNow;

        _tableRepository.Update(table);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyTableChangedAsync(table.Id, cancellationToken);
        return Result<GetCafeTableDto>.Success(MapToDto(table), "Table updated.");
    }

    public async Task<Result<GetCafeTableDto>> UpdateLayoutAsync(int id, UpdateCafeTableLayoutDto dto, CancellationToken cancellationToken = default)
    {
        var table = await _tableRepository.GetByIdAsync(id, cancellationToken);
        if (table == null || table.IsDeleted)
        {
            return Result<GetCafeTableDto>.Failure("Table not found.");
        }

        if (dto.Width <= 0 || dto.Width > 400 || dto.Height <= 0 || dto.Height > 400)
        {
            return Result<GetCafeTableDto>.Failure("Width and height must be between 1 and 400.");
        }

        if (!Enum.IsDefined(typeof(TableShape), dto.Shape))
        {
            return Result<GetCafeTableDto>.Failure("Invalid table shape.");
        }

        Zone? zone = null;
        if (dto.ZoneId.HasValue)
        {
            zone = await _zoneRepository.GetByIdAsync(dto.ZoneId.Value, cancellationToken);
            if (zone == null || zone.IsDeleted)
            {
                return Result<GetCafeTableDto>.Failure("Zone not found.");
            }
        }

        table.PositionX = dto.PositionX;
        table.PositionY = dto.PositionY;
        table.Width = dto.Width;
        table.Height = dto.Height;
        table.Shape = dto.Shape;
        table.ZoneId = dto.ZoneId;
        table.Zone = zone;
        table.UpdatedAt = DateTime.UtcNow;

        _tableRepository.Update(table);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyTableChangedAsync(table.Id, cancellationToken);
        return Result<GetCafeTableDto>.Success(MapToDto(table), "Table layout updated.");
    }

    public async Task<Result> UpdateStatusAsync(int id, UpdateCafeTableStatusDto dto, CancellationToken cancellationToken = default)
    {
        var table = await _tableRepository.GetByIdAsync(id, cancellationToken);
        if (table == null || table.IsDeleted)
        {
            return Result.Failure("Table not found.");
        }

        if (!Enum.IsDefined(typeof(TableStatus), dto.Status))
        {
            return Result.Failure("Invalid table status.");
        }

        // The one hard-enforced rule (TZ 27): the waiter/frontend "Изменить статус" menu can
        // otherwise offer whatever manual correction the situation calls for, but a table can
        // never be silently marked Free while it's still carrying an unpaid balance - that
        // would strand the order with no table to reference on the floor.
        if (dto.Status == TableStatus.Free)
        {
            var activeOrder = await _orderRepository.GetActiveByTableIdAsync(id, cancellationToken);
            if (activeOrder != null && activeOrder.PaymentStatus != PaymentStatus.Paid && activeOrder.TotalAmount > 0)
            {
                return Result.Failure($"Table has an unpaid order for {activeOrder.TotalAmount}. Close the order before freeing the table.");
            }
        }

        table.Status = dto.Status;
        table.UpdatedAt = DateTime.UtcNow;
        _tableRepository.Update(table);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyTableChangedAsync(table.Id, cancellationToken);
        return Result.Success("Table status updated.");
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var table = await _tableRepository.GetByIdAsync(id, cancellationToken);
        if (table == null || table.IsDeleted)
        {
            return Result.Failure("Table not found.");
        }

        table.IsDeleted = true;
        table.Status = TableStatus.Disabled;
        table.UpdatedAt = DateTime.UtcNow;
        _tableRepository.Update(table);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await NotifyTableChangedAsync(table.Id, cancellationToken);
        return Result.Success("Table deleted.");
    }

    private async Task<Result> ValidateAsync(int tableNumber, int seatsCount, string? location, string? note, int? excludeId, CancellationToken cancellationToken)
    {
        if (tableNumber <= 0) return Result.Failure("Table number must be greater than zero.");
        if (await _tableRepository.TableNumberExistsAsync(tableNumber, excludeId, cancellationToken)) return Result.Failure("Table number already exists.");
        if (seatsCount <= 0) return Result.Failure("Seats count must be greater than zero.");
        if (seatsCount > 50) return Result.Failure("Seats count must be 50 or less.");
        if (!ServiceHelpers.HasMaxLength(location, 100)) return Result.Failure("Location must be 100 characters or less.");
        if (!ServiceHelpers.HasMaxLength(note, 500)) return Result.Failure("Note must be 500 characters or less.");
        return Result.Success();
    }

    private static GetCafeTableDto MapToDto(CafeTable table, Reservation? upcomingReservation = null)
    {
        return new GetCafeTableDto
        {
            Id = table.Id,
            TableNumber = table.TableNumber,
            SeatsCount = table.SeatsCount,
            Status = table.Status,
            Location = table.Location,
            Note = table.Note,
            PositionX = table.PositionX,
            PositionY = table.PositionY,
            Width = table.Width,
            Height = table.Height,
            Shape = table.Shape,
            ZoneId = table.ZoneId,
            ZoneName = table.Zone?.Name,
            CreatedAt = table.CreatedAt,
            UpdatedAt = table.UpdatedAt,
            UpcomingReservation = upcomingReservation == null ? null : MapReservationToDto(upcomingReservation, table.TableNumber)
        };
    }

    private static GetReservationDto MapReservationToDto(Reservation reservation, int tableNumber)
    {
        return new GetReservationDto
        {
            Id = reservation.Id,
            CafeTableId = reservation.CafeTableId,
            TableNumber = tableNumber,
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
