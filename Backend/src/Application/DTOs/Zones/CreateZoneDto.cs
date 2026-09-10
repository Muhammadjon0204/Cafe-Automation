namespace Cafe.Application.DTOs.Zones;

public class CreateZoneDto
{
    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}
