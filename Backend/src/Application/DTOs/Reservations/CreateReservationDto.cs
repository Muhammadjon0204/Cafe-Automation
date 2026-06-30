namespace Cafe.Application.DTOs.Reservations;

public class CreateReservationDto
{
    public int CafeTableId { get; set; }

    public int? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public int GuestsCount { get; set; }

    public DateTime ReservedAt { get; set; }

    public DateTime? ReservedUntil { get; set; }

    public string? Note { get; set; }
}
