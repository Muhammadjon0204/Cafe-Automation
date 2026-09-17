using Cafe.Application.DTOs.Reservations;
using Cafe.Application.Results;

namespace Cafe.Application.Interfaces.Services;

public interface IReservationService
{
    Task<Result<PagedResult<GetReservationDto>>> GetAllAsync(ReservationFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<GetReservationDto>> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<GetReservationDto>> CreateAsync(CreateReservationDto dto, CancellationToken cancellationToken = default);

    // Client-app self-service: scoped to the calling customer's own reservations only, never
    // trusts a caller-supplied CustomerId. Kept separate from GetAllAsync/GetByIdAsync above
    // (staff-facing, unscoped by default) rather than widening those - see plan notes on RBAC risk.
    Task<Result<PagedResult<GetReservationDto>>> GetMyReservationsAsync(ReservationFilterDto filter, CancellationToken cancellationToken = default);

    Task<Result<GetReservationDto>> GetMyReservationByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Result<GetReservationDto>> UpdateAsync(int id, UpdateReservationDto dto, CancellationToken cancellationToken = default);

    Task<Result<GetReservationDto>> UpdateStatusAsync(int id, UpdateReservationStatusDto dto, CancellationToken cancellationToken = default);

    Task<Result> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
