import { Navigate, Outlet, useLocation } from 'react-router';
import type { StaffRole } from '@cafe/shared';
import { useAuth } from '../auth/AuthContext';
import { AccessDeniedPage } from '../auth/AccessDeniedPage';
import { ROUTES } from '../routes/routePaths';

export interface ProtectedRouteProps {
  /** Omitted = any authenticated role may pass. */
  allowedRoles?: StaffRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, roles } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.some((role) => roles.includes(role))) {
    return <AccessDeniedPage />;
  }

  return <Outlet />;
}
