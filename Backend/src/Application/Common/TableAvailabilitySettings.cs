namespace Cafe.Application.Common;

public class TableAvailabilitySettings
{
    public const string SectionName = "TableAvailabilitySettings";

    public int MinFreeWindowMinutes { get; set; } = 60;
}
