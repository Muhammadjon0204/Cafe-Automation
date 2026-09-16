namespace Cafe.Application.Common;

public class KitchenTimingSettings
{
    public const string SectionName = "KitchenTimingSettings";

    public int BufferMinutes { get; set; } = 10;

    public int MinLeadTimeMinutes { get; set; } = 5;

    public int PromotionIntervalSeconds { get; set; } = 60;
}
