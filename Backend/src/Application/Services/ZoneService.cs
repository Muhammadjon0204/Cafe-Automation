using Cafe.Application.DTOs.Zones;
using Cafe.Application.Interfaces.Repositories;
using Cafe.Application.Interfaces.Services;
using Cafe.Application.Results;
using Cafe.Domain.Entities;

namespace Cafe.Application.Services;

public class ZoneService : IZoneService
{
    private readonly IZoneRepository _zoneRepository;
    private readonly ICafeTableRepository _tableRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ZoneService(IZoneRepository zoneRepository, ICafeTableRepository tableRepository, IUnitOfWork unitOfWork)
    {
        _zoneRepository = zoneRepository;
        _tableRepository = tableRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<List<GetZoneDto>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var zones = await _zoneRepository.GetAllAsync(cancellationToken);
        var result = zones
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .Select(MapToDto)
            .ToList();

        return Result<List<GetZoneDto>>.Success(result);
    }

    public async Task<Result<GetZoneDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var zone = await _zoneRepository.GetByIdAsync(id, cancellationToken);
        if (zone == null || zone.IsDeleted)
        {
            return Result<GetZoneDto>.Failure("Zone not found.");
        }

        return Result<GetZoneDto>.Success(MapToDto(zone));
    }

    public async Task<Result<GetZoneDto>> CreateAsync(CreateZoneDto dto, CancellationToken cancellationToken = default)
    {
        var validation = await ValidateAsync(dto.Name, dto.SortOrder, null, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetZoneDto>.Failure(validation.Message, validation.Errors);
        }

        var zone = new Zone
        {
            Name = dto.Name.Trim(),
            SortOrder = dto.SortOrder,
            CreatedAt = DateTime.UtcNow
        };

        await _zoneRepository.AddAsync(zone, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<GetZoneDto>.Success(MapToDto(zone), "Zone created.");
    }

    public async Task<Result<GetZoneDto>> UpdateAsync(int id, UpdateZoneDto dto, CancellationToken cancellationToken = default)
    {
        var zone = await _zoneRepository.GetByIdAsync(id, cancellationToken);
        if (zone == null || zone.IsDeleted)
        {
            return Result<GetZoneDto>.Failure("Zone not found.");
        }

        var validation = await ValidateAsync(dto.Name, dto.SortOrder, id, cancellationToken);
        if (!validation.IsSuccess)
        {
            return Result<GetZoneDto>.Failure(validation.Message, validation.Errors);
        }

        zone.Name = dto.Name.Trim();
        zone.SortOrder = dto.SortOrder;
        zone.UpdatedAt = DateTime.UtcNow;

        _zoneRepository.Update(zone);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<GetZoneDto>.Success(MapToDto(zone), "Zone updated.");
    }

    public async Task<Result<GetZoneDto>> UpdateBackgroundAsync(int id, UpdateZoneBackgroundDto dto, CancellationToken cancellationToken = default)
    {
        var zone = await _zoneRepository.GetByIdAsync(id, cancellationToken);
        if (zone == null || zone.IsDeleted)
        {
            return Result<GetZoneDto>.Failure("Zone not found.");
        }

        zone.BackgroundImageUrl = ServiceHelpers.TrimToNull(dto.BackgroundImageUrl);
        zone.UpdatedAt = DateTime.UtcNow;

        _zoneRepository.Update(zone);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<GetZoneDto>.Success(MapToDto(zone), "Zone background updated.");
    }

    public async Task<Result> DeleteAsync(int id, bool force, CancellationToken cancellationToken = default)
    {
        var zone = await _zoneRepository.GetByIdAsync(id, cancellationToken);
        if (zone == null || zone.IsDeleted)
        {
            return Result.Failure("Zone not found.");
        }

        var assignedTables = zone.CafeTables.Where(x => !x.IsDeleted).ToList();
        if (assignedTables.Count > 0 && !force)
        {
            return Result.Failure(
                $"Zone has {assignedTables.Count} assigned table(s). Pass force=true to move them to Unzoned and delete.");
        }

        foreach (var table in assignedTables)
        {
            table.ZoneId = null;
            table.UpdatedAt = DateTime.UtcNow;
            _tableRepository.Update(table);
        }

        zone.IsDeleted = true;
        zone.UpdatedAt = DateTime.UtcNow;
        _zoneRepository.Update(zone);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success("Zone deleted.");
    }

    private async Task<Result> ValidateAsync(string name, int sortOrder, int? excludeId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(name)) return Result.Failure("Name is required.");
        if (name.Trim().Length > 100) return Result.Failure("Name must be 100 characters or less.");
        if (sortOrder < 0) return Result.Failure("Sort order must be zero or greater.");
        if (await _zoneRepository.NameExistsAsync(name.Trim(), excludeId, cancellationToken)) return Result.Failure("Zone name already exists.");
        return Result.Success();
    }

    private static GetZoneDto MapToDto(Zone zone)
    {
        return new GetZoneDto
        {
            Id = zone.Id,
            Name = zone.Name,
            SortOrder = zone.SortOrder,
            BackgroundImageUrl = zone.BackgroundImageUrl,
            TablesCount = zone.CafeTables?.Count(x => !x.IsDeleted) ?? 0,
            CreatedAt = zone.CreatedAt,
            UpdatedAt = zone.UpdatedAt
        };
    }
}
