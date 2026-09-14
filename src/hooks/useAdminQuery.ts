import { useQuery } from '@tanstack/react-query';

import { adminApi } from '@/api/endpoints';
import type { SortDir } from '@/api/types';

/** Shared list-screen state: page, sort, and the toggle behaviour of a sortable header. */
export function useSortState(initialKey: string, initialDir: SortDir = 'desc') {
  return {
    initialKey,
    initialDir,
  };
}

export function toggleSort(
  key: string,
  current: { sortBy: string; sortDir: SortDir },
): { sortBy: string; sortDir: SortDir } {
  if (current.sortBy !== key) {
    // A new column starts descending: for washes, spend and recency the interesting
    // end is the top, and ascending would open on the emptiest rows.
    return { sortBy: key, sortDir: 'desc' };
  }
  return { sortBy: key, sortDir: current.sortDir === 'desc' ? 'asc' : 'desc' };
}

export function useSites() {
  return useQuery({
    queryKey: ['sites', 'all'],
    queryFn: () => adminApi.listSites({ page_size: 100, sort_by: 'name', sort_dir: 'asc' }),
    staleTime: 5 * 60_000,
  });
}
