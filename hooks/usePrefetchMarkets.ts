"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchBinanceTickers } from "@/lib/frontend/api/binance-tickers";
import { getBinanceTickersQueryKey } from "@/hooks/useBinanceTickersQuery";

/**
 * Hook to prefetch Binance market data for fast loading.
 * Prefetches spot and perp top tickers.
 */
export function usePrefetchMarkets() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch Binance spot top tickers
    queryClient.prefetchQuery({
      queryKey: getBinanceTickersQueryKey({ marketType: 'spot', category: 'top' }),
      queryFn: () => fetchBinanceTickers({ marketType: 'spot', category: 'top' }),
      staleTime: 30_000,
    });

    // Prefetch Binance perp top tickers
    queryClient.prefetchQuery({
      queryKey: getBinanceTickersQueryKey({ marketType: 'perp', category: 'top' }),
      queryFn: () => fetchBinanceTickers({ marketType: 'perp', category: 'top' }),
      staleTime: 30_000,
    });
  }, [queryClient]);
}
