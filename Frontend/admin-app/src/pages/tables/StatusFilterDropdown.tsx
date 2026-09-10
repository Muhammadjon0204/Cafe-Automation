import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '../../components/icons';
import { STATUS_LEGEND_ITEMS } from './statusColors';

export type StatusFilterValue = 'all' | number;

interface StatusFilterDropdownProps {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
}

const OPTIONS: { value: StatusFilterValue; label: string }[] = [{ value: 'all', label: 'Все статусы' }, ...STATUS_LEGEND_ITEMS.map((i) => ({ value: i.status, label: i.label }))];

// Same trigger+outside-click pattern as UserMenu (components/shell/UserMenu.tsx).
export function StatusFilterDropdown({ value, onChange }: StatusFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0]!;

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="status-filter" ref={rootRef}>
      <button
        type="button"
        className="status-filter-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {current.label}
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div className="status-filter-dropdown" role="menu">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitem"
              className={`status-filter-item ${option.value === value ? 'is-active' : ''}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
