// Small icon set scoped to the /tables floor plan — kept local rather than in the shared
// components/icons.tsx (that file is for shell nav icons). Same visual convention: 24x24
// viewBox, stroke currentColor, rounded caps/joins.
const commonProps = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function PencilIcon() {
  return (
    <svg {...commonProps}>
      <path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19 4 20Z" />
      <line x1="13" y1="7.5" x2="16.5" y2="11" />
    </svg>
  );
}

export function AllZonesIcon() {
  return (
    <svg {...commonProps}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </svg>
  );
}

export function HallIcon() {
  return (
    <svg {...commonProps}>
      <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function TerraceIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="12" cy="8" r="3.4" />
      <line x1="12" y1="1.5" x2="12" y2="3.3" />
      <line x1="12" y1="12.7" x2="12" y2="14.5" />
      <line x1="5.5" y1="8" x2="7.3" y2="8" />
      <line x1="16.7" y1="8" x2="18.5" y2="8" />
      <line x1="7.3" y1="3.3" x2="8.6" y2="4.6" />
      <line x1="15.4" y1="11.4" x2="16.7" y2="12.7" />
      <line x1="16.7" y1="3.3" x2="15.4" y2="4.6" />
      <line x1="8.6" y1="11.4" x2="7.3" y2="12.7" />
      <path d="M3.5 21c1.6-2.6 4.9-4 8.5-4s6.9 1.4 8.5 4" />
    </svg>
  );
}

export function VipIcon() {
  return (
    <svg {...commonProps}>
      <path d="M12 3.5l2.4 5.3 5.6.6-4.2 3.9 1.2 5.6-4.9-3-4.9 3 1.2-5.6-4.2-3.9 5.6-.6L12 3.5Z" />
    </svg>
  );
}

export function BarIcon() {
  return (
    <svg {...commonProps}>
      <path d="M5 3.5h14l-5.5 8v7M18.5 18.5h-7" />
      <line x1="8.5" y1="18.5" x2="15.5" y2="18.5" />
      <line x1="6.3" y1="6.5" x2="17.7" y2="6.5" />
    </svg>
  );
}

export function UnzonedIcon() {
  return (
    <svg {...commonProps}>
      <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3.5 3" />
    </svg>
  );
}
