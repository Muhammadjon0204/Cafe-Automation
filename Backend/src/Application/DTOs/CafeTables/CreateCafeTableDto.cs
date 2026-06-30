namespace Cafe.Application.DTOs.CafeTables;

public class CreateCafeTableDto
{
    public int TableNumber { get; set; }

    public int SeatsCount { get; set; }

    public string? Location { get; set; }

    public string? Note { get; set; }
}
