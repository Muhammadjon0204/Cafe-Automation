namespace Cafe.Application.DTOs.CafeTables;

public class TableAvailabilityDto
{
    public bool CanOpenFreely { get; set; }

    public bool RequiresWarning { get; set; }

    public bool IsBlocked { get; set; }

    public DateTime? NearestReservationAt { get; set; }

    public int? MinutesUntilReservation { get; set; }

    public string? Message { get; set; }
}
