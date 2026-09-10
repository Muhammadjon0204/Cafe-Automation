// Small icon set scoped to /menu — kept local rather than in the shared
// components/icons.tsx (that file is for shell nav icons), same convention as
// pages/tables/tableIcons.tsx.
const commonProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// Dish-type placeholder glyphs — shown in the row thumbnail when a dish has
// no photo, instead of a broken-image icon or a stock photo.
export function DishFoodIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function DishDrinkIcon() {
  return (
    <svg {...commonProps}>
      <path d="M6 3.5h12l-1.4 14a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8L6 3.5Z" />
      <line x1="7" y1="8" x2="17" y2="8" />
    </svg>
  );
}

export function DishDessertIcon() {
  return (
    <svg {...commonProps}>
      <path d="M4 11h16l-1.6 8.2a1.5 1.5 0 0 1-1.47 1.3H7.07a1.5 1.5 0 0 1-1.47-1.3L4 11Z" />
      <path d="M12 3v3.5M8.5 6.5A3.5 3.5 0 0 1 12 3a3.5 3.5 0 0 1 3.5 3.5" />
    </svg>
  );
}

export function DishOtherIcon() {
  return (
    <svg {...commonProps}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <line x1="8.5" y1="9" x2="15.5" y2="9" />
      <line x1="8.5" y1="13" x2="13.5" y2="13" />
    </svg>
  );
}

export function PhotoIcon() {
  return (
    <svg {...commonProps}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4" />
    </svg>
  );
}
