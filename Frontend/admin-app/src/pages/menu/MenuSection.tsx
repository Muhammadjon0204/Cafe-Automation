import type { ReactNode } from 'react';
import { ChevronDownIcon } from '../../components/icons';

interface MenuSectionProps {
  title: string;
  count: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  children: ReactNode;
}

export function MenuSection({ title, count, collapsed, onToggleCollapse, children }: MenuSectionProps) {
  return (
    <section className="menu-section">
      <button
        type="button"
        className="menu-section-header"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
      >
        <span className="menu-section-title">{title}</span>
        <span className="menu-section-count">{count}</span>
        <span className="menu-section-chevron">
          <ChevronDownIcon open={!collapsed} />
        </span>
      </button>
      {!collapsed && <div className="menu-section-body">{children}</div>}
    </section>
  );
}
