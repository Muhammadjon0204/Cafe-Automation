import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

export type MenuStatusFilter = 'all' | 'available' | 'stoplist' | 'archived';
export type MenuSortOption = 'default' | 'name' | 'newest' | 'price-asc' | 'price-desc' | 'cooking-time';

const STATUS_VALUES: MenuStatusFilter[] = ['all', 'available', 'stoplist', 'archived'];
const SORT_VALUES: MenuSortOption[] = ['default', 'name', 'newest', 'price-asc', 'price-desc', 'cooking-time'];

function readEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Menu filter state lives in the URL query string (?search=&category=&status=&sort=)
 * rather than component state, so filters survive a refresh and can be shared/bookmarked
 * — all client-side, no new backend query params involved (the full dish list is
 * already fetched in one page per MenuPage's existing getDishesAdmin/getDishes call).
 */
export function useMenuFilters() {
  const [params, setParams] = useSearchParams();

  const search = params.get('search') ?? '';
  const categoryParam = params.get('category');
  const categoryId: number | 'all' = categoryParam && /^\d+$/.test(categoryParam) ? Number(categoryParam) : 'all';
  const status = readEnum(params.get('status'), STATUS_VALUES, 'all');
  const sort = readEnum(params.get('sort'), SORT_VALUES, 'default');

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setSearch = useCallback((value: string) => updateParam('search', value || null), [updateParam]);
  const setCategoryId = useCallback(
    (value: number | 'all') => updateParam('category', value === 'all' ? null : String(value)),
    [updateParam],
  );
  const setStatus = useCallback(
    (value: MenuStatusFilter) => updateParam('status', value === 'all' ? null : value),
    [updateParam],
  );
  const setSort = useCallback((value: MenuSortOption) => updateParam('sort', value === 'default' ? null : value), [updateParam]);

  const resetFilters = useCallback(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('search');
      next.delete('category');
      next.delete('status');
      return next;
    }, { replace: true });
  }, [setParams]);

  return useMemo(
    () => ({ search, setSearch, categoryId, setCategoryId, status, setStatus, sort, setSort, resetFilters }),
    [search, setSearch, categoryId, setCategoryId, status, setStatus, sort, setSort, resetFilters],
  );
}
