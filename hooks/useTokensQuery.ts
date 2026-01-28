/**
 * TanStack Query hooks for token fetching
 * 
 * Provides useQuery hooks for fetching tokens with automatic caching,
 * request deduplication, and background refetching.
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { fetchTokens, type FetchTokensParams } from '@/lib/frontend/api/tokens';
import type { Token } from '@/lib/frontend/types/tokens';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Generate query key for token queries
 * Ensures consistent cache keys across the app
 */
export function getTokensQueryKey(params: FetchTokensParams = {}): readonly unknown[] {
  const { chains, query, limit, address, category, source, marketType } = params;
  
  // Normalize chains array for consistent keys (sort to avoid order issues)
  const normalizedChains =
    chains && chains.length > 0
      ? [...chains].sort((a, b) => a - b).join(',')
      : 'all';
  
  return [
    'tokens',
    {
      chains: normalizedChains,
      query: query?.trim() || '',
      address: address?.trim() || '',
      category: category || '',
      source: source || 'default',
      marketType: marketType || '',
      limit,
    },
  ] as const;
}

// ============================================================================
// Hooks
// ============================================================================

export interface UseTokensQueryOptions
  extends Omit<UseQueryOptions<Token[], Error>, 'queryKey' | 'queryFn'> {
  params?: FetchTokensParams;
}

/**
 * Hook to fetch tokens using TanStack Query
 * 
 * Provides automatic caching, request deduplication, and background refetching.
 * 
 * @param options - Query options including params and TanStack Query options
 * @returns Query result with tokens, loading state, and error
 */
export function useTokensQuery(options: UseTokensQueryOptions = {}) {
  const { params = {}, ...queryOptions } = options;
  
  return useQuery<Token[], Error>({
    queryKey: getTokensQueryKey(params),
    queryFn: () => fetchTokens(params),
    staleTime: 60_000, // 1 minute - avoid refetching on every mount
    gcTime: 5 * 60_000, // 5 minutes - keep in cache
    ...queryOptions,
  });
}

/**
 * Prefetch tokens for a given set of parameters
 * Useful for warming cache before user interaction
 * 
 * Note: This is a utility function. Use queryClient.prefetchQuery directly
 * or call this from a component that has access to queryClient.
 * 
 * @param queryClient - TanStack Query QueryClient instance
 * @param params - Token fetch parameters
 */
export async function prefetchTokens(
  queryClient: import('@tanstack/react-query').QueryClient,
  params: FetchTokensParams
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: getTokensQueryKey(params),
    queryFn: () => fetchTokens(params),
  });
}

