import { useEffect, useState } from 'react';

// Editor mode needs precise drag-and-drop that isn't practical on touch/narrow viewports;
// Live mode has no such requirement and stays available everywhere (see TablesPage).
const DESKTOP_BREAKPOINT = 900;

function readIsDesktop(): boolean {
  return window.innerWidth >= DESKTOP_BREAKPOINT;
}

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(readIsDesktop);

  useEffect(() => {
    const onResize = () => setIsDesktop(readIsDesktop());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isDesktop;
}
