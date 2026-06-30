using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Reservations;

public class GetReservationDto
{
    public int Id { get; set; }

    public int CafeTableId { get; set; }

    public int TableNumber { get; set; }

    public int? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public int GuestsCount { get; set; }

    public DateTime ReservedAt { get; set; }

    public DateTime? ReservedUntil { get; set; }

    public DateTime? CancelledAt { get; set; }

    public ReservationStatus Status { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
