using Cafe.Domain.Enums;

namespace Cafe.Application.DTOs.CafeTables;

public class CafeTableFilterDto
{
    public int? TableNumber { get; set; }

    public TableStatus? Status { get; set; }

    public int? MinSeatsCount { get; set; }

    public int? MaxSeatsCount { get; set; }

    public string? Location { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
