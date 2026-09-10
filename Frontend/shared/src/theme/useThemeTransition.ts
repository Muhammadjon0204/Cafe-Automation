import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { flushSync } from 'react-dom';

const TRANSITION_DURATION = 500;
const FALLBACK_FADE_DURATION = 150;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
}

interface UseThemeTransitionResult {
  isDark: boolean;
  /** True while a theme-switch animation is in flight — use to disable the toggle. */
  isAnimating: boolean;
  /** Attach directly to the toggle button's onClick. */
  toggleTheme: (event: ReactMouseEvent<HTMLElement>) => void;
}

/**
 * Telegram-style circular reveal for light/dark switches: freezes the old
 * view, applies the new theme underneath, then wipes a circle out from the
 * toggle button (via View Transitions + clip-path) to reveal it. Owns the
 * theme flag itself so any page can drop it in without shared state.
 */
export function useThemeTransition(defaultDark = false): UseThemeTransitionResult {
  const [isDark, setIsDark] = useState(defaultDark);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatingRef = useRef(false);

  const lock = useCallback(() => {
    animatingRef.current = true;
    setIsAnimating(true);
  }, []);

  const unlock = useCallback(() => {
    animatingRef.current = false;
    setIsAnimating(false);
  }, []);

  // No View Transitions support (older Safari/Firefox): degrade to a short
  // opacity dip around the theme swap instead of an instant color snap.
  const runFallback = useCallback(
    (nextIsDark: boolean) => {
      lock();
      const root = document.documentElement;
      const fadeOut = root.animate([{ opacity: 1 }, { opacity: 0.1 }], {
        duration: FALLBACK_FADE_DURATION,
        easing: 'ease-in-out',
        fill: 'forwards',
      });
      fadeOut.finished
        .catch(() => {})
        .then(() => {
          setIsDark(nextIsDark);
          return root.animate([{ opacity: 0.1 }, { opacity: 1 }], {
            duration: FALLBACK_FADE_DURATION,
            easing: 'ease-in-out',
            fill: 'forwards',
          }).finished;
        })
        .catch(() => {})
        .finally(unlock);
    },
    [lock, unlock],
  );

  const runViewTransition = useCallback(
    (nextIsDark: boolean, x: number, y: number) => {
      lock();

      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      // Turning dark off animates the *old* pseudo-element instead of the new
      // one (see index.css) — that only reads as "shrinking away" if old is
      // stacked above new for this transition, which the reverse class flips.
      const root = document.documentElement;
      if (!nextIsDark) root.classList.add('theme-transition-reverse');

      let transition: ViewTransition;
      try {
        // flushSync forces React to commit the new theme synchronously inside
        // the callback — without it the DOM mutation lands after the browser
        // has already snapshotted "new", and the circle reveals nothing.
        transition = document.startViewTransition(() => {
          flushSync(() => setIsDark(nextIsDark));
        });
      } catch {
        root.classList.remove('theme-transition-reverse');
        setIsDark(nextIsDark);
        unlock();
        return;
      }

      transition.ready
        .then(() => {
          const clip = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`];
          // Expanding into dark animates the new (dark) layer growing from the
          // button; collapsing back to light animates the old (dark) layer
          // shrinking away instead — same effect, mirrored the other way.
          document.documentElement.animate(
            { clipPath: nextIsDark ? clip : [...clip].reverse() },
            {
              duration: TRANSITION_DURATION,
              easing: 'ease-in-out',
              pseudoElement: nextIsDark ? '::view-transition-new(root)' : '::view-transition-old(root)',
            },
          );
        })
        .catch(() => {});

      transition.finished
        .catch(() => {})
        .finally(() => {
          root.classList.remove('theme-transition-reverse');
          unlock();
        });
    },
    [lock, unlock],
  );

  const toggleTheme = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (animatingRef.current) return;

      const nextIsDark = !isDark;

      if (prefersReducedMotion()) {
        setIsDark(nextIsDark);
        return;
      }

      if (!supportsViewTransitions()) {
        runFallback(nextIsDark);
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      runViewTransition(nextIsDark, x, y);
    },
    [isDark, runFallback, runViewTransition],
  );

  return { isDark, isAnimating, toggleTheme };
}
