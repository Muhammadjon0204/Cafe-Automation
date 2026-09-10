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
}
