import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '../../components/icons';
import type { MenuSortOption, MenuStatusFilter } from './useMenuFilters';

const STATUS_OPTIONS: { value: MenuStatusFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'available', label: 'В продаже' },
  { value: 'stoplist', label: 'Стоп-лист' },
  { value: 'archived', label: 'Архивные' },
];

const SORT_OPTIONS: { value: MenuSortOption; label: string }[] = [
  { value: 'default', label: 'По умолчанию' },
  { value: 'name', label: 'По названию' },
  { value: 'newest', label: 'Сначала новые' },
  { value: 'price-asc', label: 'Цена: по возрастанию' },
  { value: 'price-desc', label: 'Цена: по убыванию' },
  { value: 'cooking-time', label: 'Время приготовления' },
];

interface ToolbarSelectProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

// Same trigger + outside-click + role="menu" pattern as StatusFilterDropdown
// (pages/tables/StatusFilterDropdown.tsx) and UserMenu — kept local since each
// of the three call sites has slightly different option shapes.
function ToolbarSelect<T extends string>({ label, value, options, onChange }: ToolbarSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0]!;

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div className="toolbar-select" ref={rootRef}>
      <button
        type="button"
        className="toolbar-select-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="toolbar-select-label">{label}</span>
        <span className="toolbar-select-value">{current.label}</span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div className="toolbar-select-dropdown" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`toolbar-select-item ${option.value === value ? 'is-active' : ''}`}
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

interface MenuToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: MenuStatusFilter;
  onStatusChange: (value: MenuStatusFilter) => void;
  sort: MenuSortOption;
  onSortChange: (value: MenuSortOption) => void;
}

export function MenuToolbar({ search, onSearchChange, status, onStatusChange, sort, onSortChange }: MenuToolbarProps) {
  return (
    <div className="menu-toolbar">
      <input
        className="menu-search"
        placeholder="Поиск по названию, описанию или категории"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="Поиск по меню"
      />
      <div className="menu-toolbar-filters">
        <ToolbarSelect label="Статус" value={status} options={STATUS_OPTIONS} onChange={onStatusChange} />
        <ToolbarSelect label="Сортировка" value={sort} options={SORT_OPTIONS} onChange={onSortChange} />
      </div>
    </div>
  );
}
