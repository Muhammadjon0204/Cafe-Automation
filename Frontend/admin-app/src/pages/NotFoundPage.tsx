import { Link } from 'react-router';
import { ROUTES } from '../routes/routePaths';

export function NotFoundPage() {
  return (
    <div className="page-state">
      <h1>Page not found</h1>
      <p>That page doesn't exist.</p>
      <Link to={ROUTES.dashboard}>Back to dashboard</Link>
    </div>
  );
}
