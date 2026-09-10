import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { ROUTES } from '../../routes/routePaths';
import { ROUTE_ROLES } from '../../routes/routeRoles';
import { ConfirmModal } from '../ConfirmModal';
import { ChevronDownIcon, LogoutIcon, SettingsIcon } from '../icons';

function initialsOf(fullName: string | undefined): string {
  if (!fullName) return '';
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function UserMenu() {
  const { user, roles, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const canSeeSettings = ROUTE_ROLES.settings.some((role) => roles.includes(role));

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const handleLogout = () => {
    logout();
    setConfirmingLogout(false);
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="user-menu-avatar">{initialsOf(user?.fullName)}</span>
        <span className="user-menu-text">
          <span className="user-menu-name">{user?.fullName}</span>
          <span className="user-menu-role">{user?.roles.join(', ')}</span>
        </span>
        <span className="user-menu-chevron">
          <ChevronDownIcon open={open} />
        </span>
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-dropdown-header">
            <span className="user-menu-avatar user-menu-avatar-lg">{initialsOf(user?.fullName)}</span>
            <div className="user-menu-dropdown-identity">
              <div className="user-menu-dropdown-name">{user?.fullName}</div>
              <div className="user-menu-dropdown-role">{user?.roles.join(', ')}</div>
              {user?.email && <div className="user-menu-dropdown-email">{user.email}</div>}
            </div>
          </div>
          <div className="user-menu-divider" />
          {canSeeSettings && (
            <button
              type="button"
              role="menuitem"
              className="user-menu-item"
              onClick={() => {
                setOpen(false);
                navigate(ROUTES.settings);
              }}
            >
              <SettingsIcon />
              Настройки
            </button>
          )}
          {canSeeSettings && <div className="user-menu-divider" />}
          <button
            type="button"
            role="menuitem"
            className="user-menu-item user-menu-item-danger"
            onClick={() => {
              setOpen(false);
              setConfirmingLogout(true);
            }}
          >
            <LogoutIcon />
            Выйти
          </button>
        </div>
      )}

      {confirmingLogout && (
        <ConfirmModal
          title="Вы уверены, что хотите выйти?"
          message="Текущая сессия завершится, для продолжения работы потребуется войти снова."
          confirmLabel="Выйти"
          cancelLabel="Отмена"
          tone="danger"
          onConfirm={handleLogout}
          onCancel={() => setConfirmingLogout(false)}
        />
      )}
    </div>
  );
}
