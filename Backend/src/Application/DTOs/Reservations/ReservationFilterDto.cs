using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Reservations;

public class ReservationFilterDto
{
    public int? CafeTableId { get; set; }

    public int? CustomerId { get; set; }

    public string? Search { get; set; }

    public ReservationStatus? Status { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
