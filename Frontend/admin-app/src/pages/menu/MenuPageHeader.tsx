import type { ReactNode } from 'react';

interface MenuPageHeaderProps {
  actions?: ReactNode;
}

export function MenuPageHeader({ actions }: MenuPageHeaderProps) {
  return (
    <div className="menu-header">
      <div className="menu-header-copy">
        <p className="menu-eyebrow">Кухня и ассортимент</p>
        <h1 className="menu-title">Меню</h1>
        <p className="menu-subtitle">Управляйте блюдами, ценами, доступностью и категориями меню.</p>
      </div>
      {actions && <div className="menu-header-actions">{actions}</div>}
    </div>
  );
}
