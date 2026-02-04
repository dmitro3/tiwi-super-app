/**
 * TanStack Query hook for Binance ticker data
 *
 * Provides automatic caching, request deduplication, and auto-refetching
 * for live market data from Binance.
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchBinanceTickers,
  type FetchBinanceTickersParams,
} from '@/lib/frontend/api/binance-tickers';
import type { Token } from '@/lib/frontend/types/tokens';

/**
 * Generate consistent query key for Binance ticker queries
 */
export function getBinanceTickersQueryKey(params: FetchBinanceTickersParams) {
  return [
    'binance-tickers',
    {
      marketType: params.marketType,
      category: params.category || 'top',
      limit: params.limit,
    },
  ] as const;
}

/**
 * Hook to fetch Binance tickers with auto-refresh
 */
export function useBinanceTickersQuery(options: {
  params: FetchBinanceTickersParams;
  enabled?: boolean;
}) {
  return useQuery<Token[], Error>({
    queryKey: getBinanceTickersQueryKey(options.params),
    queryFn: () => fetchBinanceTickers(options.params),
    staleTime: 30_000,       // 30 seconds
    gcTime: 2 * 60_000,      // 2 minutes
    refetchInterval: 30_000,  // Auto-refresh every 30s for live feel
    enabled: options.enabled ?? true,
  });
}
