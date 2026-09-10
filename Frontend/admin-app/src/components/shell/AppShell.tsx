import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useThemeTransition } from '@cafe/shared';
import { useAuth } from '../../auth/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useSidebarCollapsed } from './useSidebarCollapsed';
import './shell.css';

export function AppShell() {
  const { isDark, isAnimating, toggleTheme } = useThemeTransition();
  const { collapsed, toggle } = useSidebarCollapsed();
  const { roles } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', isDark);
  }, [isDark]);

  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggleCollapse={toggle} roles={roles} />
      <div className="app-shell-main">
        <Topbar isDark={isDark} isAnimating={isAnimating} toggleTheme={toggleTheme} />
        <main className="app-shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
