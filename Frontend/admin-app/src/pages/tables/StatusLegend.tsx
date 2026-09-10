import { STATUS_LEGEND_ITEMS, statusAccent } from './statusColors';

interface StatusLegendProps {
  isDark: boolean;
}

// Compact corner block, mirrors the reference: one swatch per status using the exact
// same stroke/overlay pair the canvas draws on each table, so the legend and the floor
// stay visually in sync automatically if the palette ever changes.
export function StatusLegend({ isDark }: StatusLegendProps) {
  return (
    <div className="status-legend">
      {STATUS_LEGEND_ITEMS.map((item) => {
        const accent = statusAccent(item.status, isDark);
        return (
          <div className="status-legend-item" key={item.status}>
            <span
              className="status-legend-swatch"
              style={{ borderColor: accent.stroke, backgroundColor: accent.overlayFill }}
            />
            {item.label}
          </div>
        );
      })}
    </div>
  );
}
