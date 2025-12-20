/**
 * useTokenSearch Hook
 * 
 * Implements hybrid search behavior:
 * 1. Shows cached tokens matching query immediately (instant results)
 * 2. Fetches from backend in background for more results
 * 3. Merges cached and API results equally
 * 
 * Uses TanStack Query for caching and background fetching.
 */

import { useState, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { useQueryClient } from '@tanstack/react-query';
import { useTokensQuery, getTokensQueryKey } from './useTokensQuery';
import type { Token } from '@/lib/frontend/types/tokens';
import type { FetchTokensParams } from '@/lib/frontend/api/tokens';
import { calculateSimilarity } from '@/lib/shared/utils/search';
import { mergeTokens } from '@/lib/shared/utils/tokens';
import { getCachedTokens } from '@/lib/frontend/utils/cache';

export interface UseTokenSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  tokens: Token[];
  isLoading: boolean; // True if initial load (no cached data)
  isSearching: boolean; // True when background fetch is happening (enriching cache)
  isApiFetching: boolean; // True when API is actively fetching (for skeleton display)
  error: Error | null;
}

export interface UseTokenSearchParams {
  chains?: number[];
  limit?: number;
  debounceDelay?: number;
}

/**
 * Filter tokens by search query with fuzzy matching (20% threshold)
 * Returns tokens that match exactly OR have >20% similarity
 */
function filterTokensByQuery(tokens: Token[], query: string): Token[] {
  if (!query.trim()) return tokens;
  
  const lowerQuery = query.toLowerCase().trim();
  const threshold = 0.2; // 20% similarity threshold
  
  return tokens
    .map((token) => {
      // Calculate similarity scores for name, symbol, and address
      const nameScore = calculateSimilarity(lowerQuery, token.name);
      const symbolScore = calculateSimilarity(lowerQuery, token.symbol);
      const addressScore = token.address.toLowerCase().includes(lowerQuery) ? 0.8 : 0;
      
      // Use highest score
      const maxScore = Math.max(nameScore, symbolScore, addressScore);
      
      return {
        token,
        score: maxScore,
      };
    })
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score) // Sort by score (best matches first)
    .map((item) => item.token);
}

/**
 * Hook for token search with hybrid behavior (cached first, then background fetch)
 * 
 * Behavior:
 * 1. Modal opens → Show cached tokens immediately (instant render, no API call)
 * 2. Chain selected → Filter cached tokens by chain, show immediately, then background fetch to enrich
 * 3. User types query → Filter cached tokens immediately, then background fetch with query (debounced)
 * 4. Always show cached data first, then enrich with API results
 * 5. If API fetch fails, continue showing cached results
 * 
 * @param params - Search parameters (chains, limit, debounceDelay)
 * @returns Search query, setter, tokens, loading states, and error
 */
export function useTokenSearch(
  params: UseTokenSearchParams = {}
): UseTokenSearchReturn {
  const { chains, limit, debounceDelay = 400 } = params;
  
  const [query, setQuery] = useState('');
  const queryClient = useQueryClient();
  
  // Debounce search query for API call
  const debouncedQuery = useDebounce(query, debounceDelay);
  
  // Get all cached tokens filtered by chains (instant results)
  const cachedTokens = useMemo(() => {
    return getCachedTokens(queryClient, chains);
  }, [queryClient, chains]);
  
  // Filter cached tokens by current query (instant results)
  const filteredCachedTokens = useMemo(() => {
    return filterTokensByQuery(cachedTokens, query);
  }, [cachedTokens, query]);
  
  // Background fetch from API to enrich cached data
  // Always fetch (even without query) to enrich cache with latest data
  const fetchParams: FetchTokensParams = {
    chains,
    query: debouncedQuery.trim() || undefined,
    limit,
  };
  
  const {
    data: apiTokens = [],
    isLoading: isApiLoading,
    isFetching: isApiFetching,
    error: apiError,
  } = useTokensQuery({
    params: fetchParams,
    // enabled: true,
    // Always fetch to enrich cache (even without query)
    // TanStack Query will use cache if available and fetch in background
    refetchOnMount: false, // Don't refetch if data is fresh
    // Keep showing cached results if API fails
    retry: 2,
  });
  
  // Merge cached and API results
  // Priority: Show cached tokens immediately, then merge with API results
  const mergedTokens = useMemo(() => {
    // If we have a search query, merge API results with filtered cached results
    if (debouncedQuery.trim()) {
      return mergeTokens(apiTokens, filteredCachedTokens);
    }
    
    // No search query: merge API results with all cached tokens for selected chains
    // This ensures we show cached data immediately, then enrich with API data
    return mergeTokens(apiTokens, cachedTokens);
  }, [apiTokens, filteredCachedTokens, cachedTokens, debouncedQuery]);
  
  // Determine loading states
  // isLoading: Only true if we have NO cached data AND API is loading (initial load)
  // isSearching: True when background fetch is happening (enriching cache)
  // isApiFetching: True when API is actively fetching (for skeleton display)
  const hasCachedData = cachedTokens.length > 0;
  const isLoading = !hasCachedData && isApiLoading;
  const isSearching = isApiFetching && hasCachedData; // Background enrichment happening
  
  return {
    query,
    setQuery,
    tokens: mergedTokens,
    isLoading,
    isSearching,
    isApiFetching, // Expose API fetching state for skeleton display
    error: apiError,
  };
}

