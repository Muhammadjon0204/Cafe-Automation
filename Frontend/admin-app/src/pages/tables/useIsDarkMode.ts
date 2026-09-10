import { useEffect, useState } from 'react';

function readIsDark(): boolean {
  return document.documentElement.classList.contains('theme-dark');
}

// AppShell (components/shell/AppShell.tsx) only toggles a class on <html> via
// useThemeTransition (@cafe/shared) — isDark isn't lifted into context/props, and Konva
// renders to <canvas> so it can't read CSS custom properties directly. Smallest fix
// scoped to this feature; see the session's flagged decision if you'd rather lift
// isDark into shared shell context instead.
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(readIsDark);

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(readIsDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
