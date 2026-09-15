import { useAuth } from './AuthContext';

// Reached when a login succeeds but the account isn't Kitchen/Admin/Manager —
// e.g. a Waiter account used on this app by mistake. Points them at the right
// door rather than showing a broken/empty board.
export function AccessDeniedPage() {
  const { logout } = useAuth();
  return (
    <div className="page-state">
      <h1>Нет доступа</h1>
      <p>Этот аккаунт не привязан к кухне. Попросите администратора выдать роль Kitchen, либо войдите в панель официанта/админку.</p>
      <button type="button" className="error-retry-btn" onClick={logout}>
        Выйти
      </button>
    </div>
  );
}
