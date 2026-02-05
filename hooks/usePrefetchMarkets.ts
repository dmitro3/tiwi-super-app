"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchBinanceTickers } from "@/lib/frontend/api/binance-tickers";
import { getBinanceTickersQueryKey } from "@/hooks/useBinanceTickersQuery";

/**
 * Hook to prefetch enriched market data for fast loading.
 * Prefetches all top markets from our unified API.
 */
export function usePrefetchMarkets() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchMarkets = async (type: string) => {
      const res = await fetch(`/api/v1/market/list?marketType=${type}`);
      if (!res.ok) throw new Error('Prefetch failed');
      const data = await res.json();
      return (data.markets || []).map((m: any) => ({
        id: m.id,
        symbol: m.symbol,
        name: m.name,
        address: m.symbol,
        logo: m.logo,
        logoURI: m.logo,
        chain: 'dYdX',
        chainId: 4,
        price: m.price?.toString() || '0',
        priceUSD: m.price || 0,
        priceChange24h: m.priceChange24h || 0,
        volume24h: m.volume24h || 0,
        marketType: m.marketType,
        provider: m.provider,
        fundingRate: m.fundingRate,
        openInterest: m.openInterest,
        marketCap: m.marketCap,
        liquidity: m.liquidity,
        socials: m.socials,
        website: m.website,
        decimals: m.decimals,
        description: m.description,
      }));
    };

    // Prefetch enriched spot markets
    queryClient.prefetchQuery({
      queryKey: ['enriched-markets', 'spot'],
      queryFn: () => fetchMarkets('spot'),
      staleTime: 30_000,
    });

    // Prefetch enriched perp markets
    queryClient.prefetchQuery({
      queryKey: ['enriched-markets', 'perp'],
      queryFn: () => fetchMarkets('perp'),
      staleTime: 30_000,
    });
  }, [queryClient]);
}
