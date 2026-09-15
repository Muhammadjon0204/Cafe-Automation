import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useThemeTransition, useRealtimeSync } from '@cafe/shared';
import { useAuth } from '../auth/AuthContext';
import { queryClient } from '../lib/queryClient';
import { MoonIcon, SunIcon } from '../components/icons';
import './shell.css';

// Single-page app (just the board) — no sidebar, only a slim topbar for
// identity/theme/logout. Opens the realtime hub connection once here, same
// ['orders', ...] prefix convention as admin-app's AppShell so KitchenPage's
// board query picks up live invalidation automatically.
export function Shell() {
  const { isDark, isAnimating, toggleTheme } = useThemeTransition();
  const { user, logout } = useAuth();

  useRealtimeSync({
    onOrderChanged: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', isDark);
  }, [isDark]);

  return (
    <div className="shell">
      <header className="shell-topbar">
        <span className="shell-brand">AMBRE Kitchen</span>
        <div className="shell-topbar-actions">
          {user?.fullName && <span className="shell-user">{user.fullName}</span>}
          <button
            type="button"
            className="shell-icon-btn"
            aria-label="Переключить тему"
            aria-busy={isAnimating}
            disabled={isAnimating}
            onClick={toggleTheme}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button type="button" className="shell-logout" onClick={logout}>
            Выйти
          </button>
        </div>
      </header>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
