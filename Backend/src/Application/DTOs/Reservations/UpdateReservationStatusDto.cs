using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.Reservations;

public class UpdateReservationStatusDto
{
    public ReservationStatus Status { get; set; }

    public DateTime? CancelledAt { get; set; }

    public string? Note { get; set; }
}
