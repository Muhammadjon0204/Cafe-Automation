namespace Cafe.Application.Common;

public class TableAvailabilitySettings
{
    public const string SectionName = "TableAvailabilitySettings";

    // Blocks a walk-in table-open when a reservation is closer than this (TableAvailabilityService).
    public int MinFreeWindowMinutes { get; set; } = 60;

    // How long before Reservation.ReservedAt a still-Free table auto-flips to
    // TableStatus.Reserved (ReservationActivationBackgroundService). Distinct from
    // MinFreeWindowMinutes above: that one blocks/warns on walk-in open, this one drives the
    // table's own status/badge.
    public int ReservationActivationWindowMinutes { get; set; } = 120;

    // Poll interval for ReservationActivationBackgroundService, mirroring
    // KitchenTimingSettings.PromotionIntervalSeconds.
    public int ReservationActivationIntervalSeconds { get; set; } = 60;
}
