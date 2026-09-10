import { useThemeTransition } from '@cafe/shared';
import { MoonIcon, SunIcon } from '../icons';

interface ThemeToggleButtonProps {
  isDark: boolean;
  isAnimating: boolean;
  toggleTheme: ReturnType<typeof useThemeTransition>['toggleTheme'];
}

export function ThemeToggleButton({ isDark, isAnimating, toggleTheme }: ThemeToggleButtonProps) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label="Toggle theme"
      aria-busy={isAnimating}
      disabled={isAnimating}
      onClick={toggleTheme}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
