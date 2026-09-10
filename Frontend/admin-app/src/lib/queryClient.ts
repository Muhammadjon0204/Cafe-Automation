import { QueryClient } from '@tanstack/react-query';

// Default options only — Phase 1 has no real queries yet. Phase 2+ tunes
// staleTime/retry per-query once dashboard/list fetches exist.
export const queryClient = new QueryClient();
