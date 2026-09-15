import { useAuth } from './AuthContext';

// Reached when a login succeeds but the account isn't Waiter/Admin/Manager —
// e.g. a Kitchen account used on this app by mistake. Points them at the
// right door rather than showing a broken/empty board.
export function AccessDeniedPage() {
  const { logout } = useAuth();
  return (
    <div className="page-state">
      <h1>Нет доступа</h1>
      <p>Этот аккаунт не привязан к залу. Попросите администратора выдать роль Waiter, либо войдите в панель кухни/админку.</p>
      <button type="button" className="error-retry-btn" onClick={logout}>
        Выйти
      </button>
    </div>
  );
}
