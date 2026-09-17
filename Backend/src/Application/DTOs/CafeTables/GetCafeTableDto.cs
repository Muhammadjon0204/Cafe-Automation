using Cafe.Application.DTOs.Reservations;
using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.CafeTables;

public class GetCafeTableDto
{
    public int Id { get; set; }

    public int TableNumber { get; set; }

    public int SeatsCount { get; set; }

    public TableStatus Status { get; set; }

    public string? Location { get; set; }

    public string? Note { get; set; }

    public double PositionX { get; set; }

    public double PositionY { get; set; }

    public double Width { get; set; }

    public double Height { get; set; }

    public TableShape Shape { get; set; }

    public int? ZoneId { get; set; }

    public string? ZoneName { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    // Nearest active (Pending/Confirmed) reservation on this table, regardless of whether the
    // table has already flipped to Reserved yet - lets the waiter board show a "Бронь сегодня в
    // 20:00" preview before the activation window kicks in. Null when there is none.
    public GetReservationDto? UpcomingReservation { get; set; }
}
