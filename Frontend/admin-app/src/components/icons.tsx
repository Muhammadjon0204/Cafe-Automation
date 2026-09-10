const commonProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function DashboardIcon() {
  return (
    <svg {...commonProps}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.5" />
      <rect x="13" y="10.5" width="7.5" height="10" rx="1.5" />
      <rect x="3.5" y="13.5" width="7.5" height="7" rx="1.5" />
    </svg>
  );
}

export function OrdersIcon() {
  return (
    <svg {...commonProps}>
      <path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2v-17Z" />
      <line x1="8.5" y1="8" x2="15.5" y2="8" />
      <line x1="8.5" y1="12" x2="15.5" y2="12" />
    </svg>
  );
}

export function MenuSectionIcon() {
  return (
    <svg {...commonProps}>
      <path d="M6 3v6.5a2.5 2.5 0 0 0 5 0V3" />
      <line x1="8.5" y1="3" x2="8.5" y2="21" />
      <path d="M17 3c-2 1.5-2 5-2 7 0 1.5.8 2.3 2 2.5V21" />
    </svg>
  );
}

export function StaffIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.5 2.5-6 5.5-6s5.5 2.5 5.5 6" />
      <circle cx="17" cy="7.5" r="2.4" />
      <path d="M15.2 12.3c2.6.3 4.8 2.6 4.8 5.9" />
    </svg>
  );
}

export function ReportsIcon() {
  return (
    <svg {...commonProps}>
      <line x1="5" y1="20.5" x2="5" y2="12" />
      <line x1="12" y1="20.5" x2="12" y2="6" />
      <line x1="19" y1="20.5" x2="19" y2="15.5" />
      <line x1="3" y1="20.5" x2="21" y2="20.5" />
    </svg>
  );
}

export function ReservationsIcon() {
  return (
    <svg {...commonProps}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="2.5" x2="8" y2="6.5" />
      <line x1="16" y1="2.5" x2="16" y2="6.5" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.6a1.7 1.7 0 0 0 1.04-1.56V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.6a1.7 1.7 0 0 0 1.56 1.04h.09a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg {...commonProps}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="21.5" y2="12" />
      <line x1="5.3" y1="5.3" x2="7" y2="7" />
      <line x1="17" y1="17" x2="18.7" y2="18.7" />
      <line x1="5.3" y1="18.7" x2="7" y2="17" />
      <line x1="17" y1="7" x2="18.7" y2="5.3" />
    </svg>
  );
}

export function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      {...commonProps}
      width={14}
      height={14}
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ChevronCollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      {...commonProps}
      style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }}
    >
      <polyline points="15 6 9 12 15 18" />
    </svg>
  );
}

export function MoneyIcon() {
  return (
    <svg {...commonProps}>
      <line x1="12" y1="2.5" x2="12" y2="21.5" />
      <path d="M16.5 6.2c0-1.8-2-2.9-4.5-2.9s-4.5 1.1-4.5 2.9 2 2.6 4.5 2.9 4.5 1.1 4.5 2.9-2 2.9-4.5 2.9-4.5-1.1-4.5-2.9" />
    </svg>
  );
}

export function ScaleIcon() {
  return (
    <svg {...commonProps}>
      <line x1="12" y1="3" x2="12" y2="21" />
      <path d="M6.5 7 4 12.5a2.7 2.7 0 0 0 5.4 0zM17.5 7 15 12.5a2.7 2.7 0 0 0 5.4 0z" />
      <line x1="8" y1="3.3" x2="16" y2="3.3" />
    </svg>
  );
}

export function TableIcon() {
  return (
    <svg {...commonProps}>
      <circle cx="12" cy="7.2" r="3.7" />
      <path d="M4.2 20.5c0-3.9 3.5-6.3 7.8-6.3s7.8 2.4 7.8 6.3" />
    </svg>
  );
}

export function WarningIcon() {
  return (
    <svg {...commonProps}>
      <path d="M12 3 2.2 20h19.6z" />
      <line x1="12" y1="9" x2="12" y2="13.5" />
      <circle cx="12" cy="16.7" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...commonProps}>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}

export function LogoutIcon() {
  return (
    <svg {...commonProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
