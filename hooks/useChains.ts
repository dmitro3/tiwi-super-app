/**
 * useChains Hook (TanStack Query)
 * 
 * Fetches chains from the backend API using TanStack Query.
 * Provides automatic caching, request deduplication, and background refetching.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchChains, type FetchChainsParams } from '@/lib/frontend/api/chains';
import type { Chain } from '@/lib/frontend/types/tokens';

export interface UseChainsReturn {
  chains: Chain[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Generate query key for chains queries
 */
function getChainsQueryKey(params: FetchChainsParams = {}): readonly unknown[] {
  const { provider, type } = params;
  return ['chains', { provider, type }] as const;
}

/**
 * Hook to fetch chains from backend API using TanStack Query
 * 
 * @param params - Optional filter parameters (provider, type)
 * @returns Chains, loading state, and error
 */
export function useChains(params: FetchChainsParams = {}): UseChainsReturn {
  const {
    data: chains = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: getChainsQueryKey(params),
    queryFn: () => fetchChains(params),
    staleTime: 10 * 60 * 1000, // 10 minutes - chains are stable data
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache for 30min
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    chains,
    isLoading,
    error: error ? (error instanceof Error ? error : new Error('Failed to fetch chains')) : null,
  };
}
