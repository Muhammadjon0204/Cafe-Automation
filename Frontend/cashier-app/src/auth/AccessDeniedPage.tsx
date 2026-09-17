import { useAuth } from './AuthContext';

// Reached when a login succeeds but the account isn't Cashier/Admin/Manager —
// e.g. a Waiter or Kitchen account used on this app by mistake. Points them
// at the right door rather than showing a broken/empty board.
export function AccessDeniedPage() {
  const { logout } = useAuth();
  return (
    <div className="page-state">
      <h1>Нет доступа</h1>
      <p>Этот аккаунт не привязан к кассе. Попросите администратора выдать роль Cashier, либо войдите в панель официанта/кухни/админку.</p>
      <button type="button" className="error-retry-btn" onClick={logout}>
        Выйти
      </button>
    </div>
  );
}
