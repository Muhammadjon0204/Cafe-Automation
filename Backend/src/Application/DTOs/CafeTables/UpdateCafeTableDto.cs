using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.CafeTables;

public class UpdateCafeTableDto
{
    public int TableNumber { get; set; }

    public int SeatsCount { get; set; }

    public TableStatus Status { get; set; }

    public string? Location { get; set; }

    public string? Note { get; set; }
}
