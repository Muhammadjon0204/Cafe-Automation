using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.CafeTables;

public class UpdateCafeTableLayoutDto
{
    public double PositionX { get; set; }

    public double PositionY { get; set; }

    public double Width { get; set; }

    public double Height { get; set; }

    public TableShape Shape { get; set; }

    public int? ZoneId { get; set; }
}
