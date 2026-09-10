import { useRef, type KeyboardEvent } from 'react';

interface CategoryTabItem {
  id: number;
  name: string;
  count: number;
}

interface CategoryTabsProps {
  categories: CategoryTabItem[];
  totalCount: number;
  activeId: number | 'all';
  onChange: (id: number | 'all') => void;
}

/** Horizontally-scrollable "Все / <category> N" tab strip. Uses the standard
 * ARIA tablist roving-tabindex pattern: only the selected tab is in the Tab
 * order, Left/Right/Home/End move selection and focus together. */
export function CategoryTabs({ categories, totalCount, activeId, onChange }: CategoryTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const ids: (number | 'all')[] = ['all', ...categories.map((c) => c.id)];

  const focusTab = (id: number | 'all') => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-tab-id="${id}"]`);
    el?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = ids.indexOf(activeId);
    if (index === -1) return;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % ids.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + ids.length) % ids.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = ids.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextId = ids[nextIndex]!;
    onChange(nextId);
    focusTab(nextId);
  };

  return (
    <div className="category-tabs" role="tablist" aria-label="Категории меню" ref={listRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        role="tab"
        data-tab-id="all"
        aria-selected={activeId === 'all'}
        tabIndex={activeId === 'all' ? 0 : -1}
        className={`category-tab ${activeId === 'all' ? 'is-active' : ''}`}
        onClick={() => onChange('all')}
      >
        Все
        <span className="category-tab-count">{totalCount}</span>
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          role="tab"
          data-tab-id={category.id}
          aria-selected={activeId === category.id}
          tabIndex={activeId === category.id ? 0 : -1}
          className={`category-tab ${activeId === category.id ? 'is-active' : ''}`}
          onClick={() => onChange(category.id)}
        >
          {category.name}
          <span className="category-tab-count">{category.count}</span>
        </button>
      ))}
    </div>
  );
}
