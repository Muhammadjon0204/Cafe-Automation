using Cafe.Application.DTOs.Reservations;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface IReservationService
{
    Task<Result<PagedResult<GetReservationDto>>> GetAllAsync(ReservationFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<GetReservationDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<GetReservationDto>> CreateAsync(CreateReservationDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetReservationDto>> UpdateAsync(int id, UpdateReservationDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetReservationDto>> UpdateStatusAsync(int id, UpdateReservationStatusDto dto, CancellationToken cancellationToken = default);

    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
