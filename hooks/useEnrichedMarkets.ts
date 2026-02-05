"use client";

import { useQuery } from '@tanstack/react-query';
import { Token } from '@/lib/frontend/types/tokens';

interface UseEnrichedMarketsParams {
    marketType?: 'spot' | 'perp' | 'all';
    enabled?: boolean;
}

/**
 * Hook to fetch enriched market data from the unified API
 */
export function useEnrichedMarkets({
    marketType = 'all',
    enabled = true
}: UseEnrichedMarketsParams = {}) {
    return useQuery({
        queryKey: ['enriched-markets', marketType],
        queryFn: async () => {
            const response = await fetch(`/ `);
            if (!response.ok) {
                throw new Error('Failed to fetch enriched markets');
            }
            const data = await response.json();
            console.log("🚀 ~ useEnrichedMarkets ~ data:", data)

            // Transform into frontend Token format
            return (data.markets || []).map((m: any) => ({
                id: m.id,
                symbol: m.symbol,
                name: m.name,
                address: m.symbol, // For Binance/dYdX we use symbol as address for routing
                logo: m.logo,
                logoURI: m.logo,
                chain: m.provider === 'binance' ? 'Binance' : 'dYdX',
                chainId: m.provider === 'binance' ? 0 : 4, // 0 for Binance, 4 for dYdX (internal convention)
                price: m.price.toString(),
                priceUSD: m.price,
                priceChange24h: m.priceChange24h,
                volume24h: m.volume24h,
                high24h: m.high24h,
                low24h: m.low24h,
                marketType: m.marketType,
                provider: m.provider,
                fundingRate: m.fundingRate,
                openInterest: m.openInterest,
                marketCap: m.marketCap,
                fdv: m.fdv,
                marketCapRank: m.marketCapRank,
                liquidity: m.liquidity,
                socials: m.socials,
                website: m.website,
                websites: m.websites,
                decimals: m.decimals,
                description: m.description,
            } as Token));
        },
        enabled,
        staleTime: 30000,
        refetchInterval: 60000,
    });
}
