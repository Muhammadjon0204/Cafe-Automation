namespace Cafe.Application.DTOs.Zones;

public class GetZoneDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public string? BackgroundImageUrl { get; set; }

    public int TablesCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
