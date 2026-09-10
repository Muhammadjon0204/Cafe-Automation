import { Navigate, Route, Routes } from 'react-router';
import { AppShell } from '../components/shell/AppShell';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { OrdersPage } from '../pages/OrdersPage';
import { MenuPage } from '../pages/MenuPage';
import { StaffPage } from '../pages/StaffPage';
import { ReportsPage } from '../pages/ReportsPage';
import { ReservationsPage } from '../pages/ReservationsPage';
import { TablesPage } from '../pages/TablesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ROUTES } from './routePaths';
import { ROUTE_ROLES } from './routeRoles';

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to={ROUTES.dashboard} replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="tables" element={<TablesPage />} />

          <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.staff} />}>
            <Route path="staff" element={<StaffPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.reports} />}>
            <Route path="reports" element={<ReportsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.settings} />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
