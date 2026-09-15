import { Route, Routes } from 'react-router';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { WaiterPage } from '../pages/WaiterPage';
import { Shell } from '../shell/Shell';
import { ROUTES } from './routePaths';

const ALLOWED_ROLES = ['Admin', 'Manager', 'Waiter'] as const;

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />

      <Route element={<ProtectedRoute allowedRoles={[...ALLOWED_ROLES]} />}>
        <Route element={<Shell />}>
          <Route index element={<WaiterPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
