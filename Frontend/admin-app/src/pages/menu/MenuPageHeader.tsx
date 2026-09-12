import type { ReactNode } from 'react';

interface MenuPageHeaderProps {
  actions?: ReactNode;
}

export function MenuPageHeader({ actions }: MenuPageHeaderProps) {
  return (
    <div className="menu-header">
      <div className="menu-header-copy">
        <h1 className="menu-title">Меню</h1>
      </div>
      {actions && <div className="menu-header-actions">{actions}</div>}
    </div>
  );
}
