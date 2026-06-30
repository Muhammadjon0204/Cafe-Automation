using Cafe.Application.Common;
using Cafe.Application.DTOs.CafeTables;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Domain.Entities;
using Cafe.Domain.Enums;

namespace Cafe.Application.Services;

public class CafeTableService : ICafeTableService
{
    private readonly ICafeTableRepository _tableRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CafeTableService(ICafeTableRepository tableRepository, IUnitOfWork unitOfWork)
    {
        _tableRepository = tableRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<PagedResult<GetCafeTableDto>>> GetAllAsync(CafeTableFilterDto filter, CancellationToken cancellationToken = default)
    {
        var tables = await _tableRepository.GetAllAsync(cancellationToken);
        var query = tables.Where(x => !x.IsDeleted);

        if (filter.TableNumber.HasValue) query = query.Where(x => x.TableNumber == filter.TableNumber.Value);
        if (filter.Status.HasValue) query = query.Where(x => x.Status == filter.Status.Value);
        if (filter.MinSeatsCount.HasValue) query = query.Where(x => x.SeatsCount >= filter.MinSeatsCount.Value);
        if (filter.MaxSeatsCount.HasValue) query = query.Where(x => x.SeatsCount <= filter.MaxSeatsCount.Value);
        if (!string.IsNullOrWhiteSpace(filter.Location))
        {
            var location = filter.Location.Trim();
            query = query.Where(x => x.Location != null && x.Location.Contains(location, StringComparison.OrdinalIgnoreCase));
        }

        var result = PaginationHelper.CreatePagedResult(query.OrderBy(x => x.TableNumber).Select(MapToDto), filter.PageNumber, filter.PageSize);
        return Result<PagedResult<GetCafeTableDto>>.Success(result);
    }

    public async Task<Result<GetCafeTableDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var table = await _tableRepository.GetByIdAsync(id, cancellationToken);
        if (table == null || table.IsDeleted)
        {
            return Result<GetCafeTableDto>.Failure("Table not found.");
        }

        return Result<GetCafeTableDto>.Success(MapToDto(table));
    }

    public async Task<Result<GetCafeTableDto>> CreateAsync(CreateCafeTableDto dto, CancellationToken cancellationToken = default)
    {
        var validation = await ValidateAsync(dto.TableNumber, dto.SeatsCount, dto.Location, dto.Note, null, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetCafeTableDto>.Failure(validation.Message, validation.Errors);
        }

        var table = new CafeTable
        {
            TableNumber = dto.TableNumber,
            SeatsCount = dto.SeatsCount,
            Status = TableStatus.Free,
            Location = ServiceHelpers.TrimToNull(dto.Location),
            Note = ServiceHelpers.TrimToNull(dto.Note),
            CreatedAt = DateTime.UtcNow
        };

        await _tableRepository.AddAsync(table, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
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
        return Result<GetCafeTableDto>.Success(MapToDto(table), "Table updated.");
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

        table.Status = dto.Status;
        table.UpdatedAt = DateTime.UtcNow;
        _tableRepository.Update(table);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
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

    private static GetCafeTableDto MapToDto(CafeTable table)
    {
        return new GetCafeTableDto
        {
            Id = table.Id,
            TableNumber = table.TableNumber,
            SeatsCount = table.SeatsCount,
            Status = table.Status,
            Location = table.Location,
            Note = table.Note,
            CreatedAt = table.CreatedAt,
            UpdatedAt = table.UpdatedAt
        };
    }
}
