import type { ReactNode } from 'react';
import { ChevronDownIcon } from '../../components/icons';

interface MenuCategoryColumnProps {
  title: string;
  count: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  children: ReactNode;
}

/** One column of the category-columns board (see MenuPage's .menu-columns grid) —
 * a plain text header ("Завтраки · 2") plus a vertical stack of DishCards. */
export function MenuCategoryColumn({ title, count, collapsed, onToggleCollapse, children }: MenuCategoryColumnProps) {
  return (
    <section className="menu-column">
      <button type="button" className="menu-column-header" onClick={onToggleCollapse} aria-expanded={!collapsed}>
        <span className="menu-column-title">
          {title} <span className="menu-column-count">{count}</span>
        </span>
        <span className="menu-column-chevron">
          <ChevronDownIcon open={!collapsed} />
        </span>
      </button>
      {!collapsed && <div className="menu-column-cards">{children}</div>}
    </section>
  );
}
