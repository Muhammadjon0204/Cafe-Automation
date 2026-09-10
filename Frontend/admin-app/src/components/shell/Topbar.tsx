import type { useThemeTransition } from '@cafe/shared';
import { ThemeToggleButton } from './ThemeToggleButton';
import { UserMenu } from './UserMenu';

interface TopbarProps {
  isDark: boolean;
  isAnimating: boolean;
  toggleTheme: ReturnType<typeof useThemeTransition>['toggleTheme'];
}

export function Topbar({ isDark, isAnimating, toggleTheme }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-spacer" />
      <div className="topbar-controls">
        <ThemeToggleButton isDark={isDark} isAnimating={isAnimating} toggleTheme={toggleTheme} />
        <UserMenu />
      </div>
    </header>
  );
}
