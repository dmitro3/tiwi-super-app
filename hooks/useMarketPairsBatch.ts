import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { fetchMarketPairs, type FetchMarketPairsParams } from '@/lib/frontend/api/tokens';
import type { MarketTokenPair } from '@/lib/backend/types/backend-tokens';

interface UseMarketPairsBatchOptions {
    category: 'hot' | 'new' | 'gainers' | 'losers';
    network?: string;
    uiPage: number;      // The current UI page (1-based)
    uiRowsPerPage: number; // e.g., 60
    apiRowsPerPage?: number; // optional, defaults to 20
}


/**
 * Hook to fetch batch data for the market page.
 * CoinGecko returns 20 per page. If UI needs 60, we fetch 3 API pages.
 */
export function useMarketPairsBatch({
    category,
    network,
    uiPage,
    uiRowsPerPage,
    apiRowsPerPage = 20
}: UseMarketPairsBatchOptions) {
    const pagesToFetch = Math.ceil(uiRowsPerPage / apiRowsPerPage); // e.g., 60/20 = 3
    
    // Calculate which API pages we need
    // UI Page 1 -> API Pages 1, 2, 3
    // UI Page 2 -> API Pages 4, 5, 6
    const apiPages = useMemo(() => {
        const startPage = (uiPage - 1) * pagesToFetch + 1;
        return Array.from({ length: pagesToFetch }, (_, i) => startPage + i);
    }, [uiPage, pagesToFetch]);

    const queries = useQueries({
        queries: apiPages.map((page) => ({
            queryKey: ['market-pairs', category, 20, network, page],
            queryFn: () => fetchMarketPairs({ category, limit: 20, network, page }),
            staleTime: 60_000,
            gcTime: 5 * 60 * 1000,
        })),
    });

    const isLoading = queries.some((q) => q.isLoading);
    const error = queries.find((q) => q.error)?.error;

    const allPairs = useMemo(() => {
        const pairs: MarketTokenPair[] = [];
        queries.forEach((q) => {
            if (q.data?.pairs) {
                pairs.push(...q.data.pairs);
            }
        });
        return pairs;
    }, [queries]);

    // We take the total from the first successful query as a baseline
    // Note: Total in CoinGecko API is usually total pairs in category
    const total = queries[0]?.data?.total ?? 0;

    return {
        pairs: allPairs,
        isLoading,
        error,
        total,
    };
}
