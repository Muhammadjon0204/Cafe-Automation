// Konva renders to <canvas> and can't resolve CSS custom properties, so these mirror
// the light/dark hex values in Frontend/shared/src/theme/tokens.css by hand. Muted
// palette per project convention — not traffic-light red/green/yellow.
const TABLE_STATUS = { Free: 1, Occupied: 2, Reserved: 3, Cleaning: 4, Disabled: 5 } as const;

// Konva's fillRadialGradientColorStops / fillLinearGradientColorStops format: flat
// [offset, color, offset, color, ...] tuples, not an array of pairs.
export const WOOD_GRADIENT_STOPS = {
  light: [0, '#F0DBB4', 0.55, '#C99A5E', 1, '#8C6135'],
  dark: [0, '#8C6A44', 0.55, '#6B4C2C', 1, '#40301F'],
};

// Text drawn directly on the wood surface (table number / seats caption) — chosen for
// contrast against the wood gradient itself, independent of status.
export const WOOD_TEXT_COLOR = { light: '#3A2515', dark: '#F3E6D2' };

// Silhouette seat pips read the same regardless of status, so they don't compete with
// the status stroke/overlay.
export const SEAT_PIP_COLOR = { light: 'rgba(58, 37, 21, .45)', dark: 'rgba(243, 230, 210, .4)' };

export interface TableStatusAccent {
  /** Thin outline colored by status — not a solid fill, so the wood texture stays visible. */
  stroke: string;
  /** Light translucent tint layered over the wood surface (~15-20% opacity baked in). */
  overlayFill: string;
  /** Applied to the whole table Group — dims Cleaning/Disabled without touching stroke/overlay alpha. */
  opacity: number;
  dash?: number[];
}

// Occupied/Reserved/Cleaning each get one distinct hue from the new Graphite & Sage
// system (gold / info-blue / neutral gray) so they stay scannable at a glance without
// reaching for literal traffic-light red-green-yellow.
const LIGHT: Record<'free' | 'occupied' | 'reserved' | 'cleaning' | 'disabled', TableStatusAccent> = {
  free: { stroke: 'rgba(24,32,30,.22)', overlayFill: 'rgba(255,255,255,.05)', opacity: 1 },
  occupied: { stroke: '#C98B4A', overlayFill: 'rgba(201,139,74,.18)', opacity: 1 },
  reserved: { stroke: '#466E9E', overlayFill: 'rgba(70,110,158,.18)', opacity: 1 },
  cleaning: { stroke: '#8B958F', overlayFill: 'rgba(139,149,143,.20)', opacity: 0.75 },
  disabled: { stroke: 'rgba(24,32,30,.22)', overlayFill: 'rgba(24,32,30,.12)', opacity: 0.4, dash: [6, 4] },
};

const DARK: Record<'free' | 'occupied' | 'reserved' | 'cleaning' | 'disabled', TableStatusAccent> = {
  free: { stroke: 'rgba(255,255,255,.22)', overlayFill: 'rgba(0,0,0,.08)', opacity: 1 },
  occupied: { stroke: '#D9A968', overlayFill: 'rgba(217,169,104,.20)', opacity: 1 },
  reserved: { stroke: '#7FA6D6', overlayFill: 'rgba(127,166,214,.22)', opacity: 1 },
  cleaning: { stroke: '#A3ACA6', overlayFill: 'rgba(163,172,166,.22)', opacity: 0.75 },
  disabled: { stroke: 'rgba(255,255,255,.22)', overlayFill: 'rgba(0,0,0,.18)', opacity: 0.4, dash: [6, 4] },
};

export function statusAccent(status: number, isDark: boolean): TableStatusAccent {
  const palette = isDark ? DARK : LIGHT;
  switch (status) {
    case TABLE_STATUS.Occupied:
      return palette.occupied;
    case TABLE_STATUS.Reserved:
      return palette.reserved;
    case TABLE_STATUS.Cleaning:
      return palette.cleaning;
    case TABLE_STATUS.Disabled:
      return palette.disabled;
    case TABLE_STATUS.Free:
    default:
      return palette.free;
  }
}

export function isDisabledStatus(status: number): boolean {
  return status === TABLE_STATUS.Disabled;
}

export const STATUS_LEGEND_ITEMS: { status: number; label: string }[] = [
  { status: TABLE_STATUS.Free, label: 'Свободен' },
  { status: TABLE_STATUS.Occupied, label: 'Занят' },
  { status: TABLE_STATUS.Reserved, label: 'Бронь' },
  { status: TABLE_STATUS.Cleaning, label: 'Уборка' },
];
