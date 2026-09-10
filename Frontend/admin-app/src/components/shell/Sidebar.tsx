import type { ReactElement } from 'react';
import { NavLink } from 'react-router';
import type { StaffRole } from '@cafe/shared';
import { ROUTES } from '../../routes/routePaths';
import { ROUTE_ROLES } from '../../routes/routeRoles';
import {
  ChevronCollapseIcon,
  DashboardIcon,
  MenuSectionIcon,
  OrdersIcon,
  ReportsIcon,
  ReservationsIcon,
  StaffIcon,
  TableIcon,
} from '../icons';

interface NavItem {
  path: string;
  label: string;
  icon: () => ReactElement;
  allowedRoles?: StaffRole[];
}

const NAV_ITEMS: NavItem[] = [
  { path: ROUTES.dashboard, label: 'Dashboard', icon: DashboardIcon },
  { path: ROUTES.orders, label: 'Orders', icon: OrdersIcon },
  { path: ROUTES.menu, label: 'Menu', icon: MenuSectionIcon },
  { path: ROUTES.staff, label: 'Staff', icon: StaffIcon, allowedRoles: ROUTE_ROLES.staff },
  { path: ROUTES.reports, label: 'Reports', icon: ReportsIcon, allowedRoles: ROUTE_ROLES.reports },
  { path: ROUTES.reservations, label: 'Reservations', icon: ReservationsIcon },
  { path: ROUTES.tables, label: 'Tables', icon: TableIcon },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  roles: StaffRole[];
}

export function Sidebar({ collapsed, onToggleCollapse, roles }: SidebarProps) {
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.allowedRoles || item.allowedRoles.some((role) => roles.includes(role)),
  );

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">A</span>
        {!collapsed && <span className="sidebar-brand-name">AMBRE Admin</span>}
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <button type="button" className="sidebar-collapse-btn" onClick={onToggleCollapse} aria-label="Toggle sidebar">
        <ChevronCollapseIcon collapsed={collapsed} />
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
