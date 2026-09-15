import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useThemeTransition, useRealtimeSync } from '@cafe/shared';
import { useAuth } from '../../auth/AuthContext';
import { queryClient } from '../../lib/queryClient';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useSidebarCollapsed } from './useSidebarCollapsed';
import './shell.css';

// One hub connection for the whole app, opened here (not per-page) — every page's
// useQuery still keys off ['orders', ...] / ['tables', ...], so a broad prefix
// invalidation on either event is enough to refetch whatever's currently mounted
// (OrdersPage/KitchenPage/WaiterPage/TablesPage all pick this up automatically).
export function AppShell() {
  const { isDark, isAnimating, toggleTheme } = useThemeTransition();
  const { collapsed, toggle } = useSidebarCollapsed();
  const { roles } = useAuth();

  useRealtimeSync({
    onOrderChanged: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onTableChanged: () => {
      void queryClient.invalidateQueries({ queryKey: ['tables'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      // A reservation's own Seat/Cancel action is what fires this event as often
      // as a plain table-status edit does (see ReservationService), so
      // ReservationsPage/TablesPage's by-table reservation lookup need it too.
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });

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
