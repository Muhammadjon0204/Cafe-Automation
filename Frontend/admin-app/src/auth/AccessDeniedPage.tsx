import { Link } from 'react-router';
import { ROUTES } from '../routes/routePaths';

export function AccessDeniedPage() {
  return (
    <div className="page-state">
      <h1>Access denied</h1>
      <p>You don't have permission to view this page.</p>
      <Link to={ROUTES.dashboard}>Back to dashboard</Link>
    </div>
  );
}
