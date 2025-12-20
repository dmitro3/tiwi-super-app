/**
 * Cache Utilities
 * 
 * Frontend-specific utilities for working with TanStack Query cache.
 * These utilities are React/Query-specific and not platform-agnostic.
 */

import type { QueryClient } from '@tanstack/react-query';
import type { Token } from '@/lib/frontend/types/tokens';

/**
 * Get all cached tokens from TanStack Query cache
 * Searches through all token queries in cache
 * 
 * @param queryClient - TanStack Query client instance
 * @param chains - Optional chain IDs to filter by
 * @returns Array of cached tokens
 */
export function getCachedTokens(
  queryClient: QueryClient,
  chains?: number[]
): Token[] {
  const cache = queryClient.getQueryCache();
  const allCachedTokens: Token[] = [];
  
  // Get all token queries from cache
  cache.getAll().forEach((query) => {
    const queryKey = query.queryKey;
    
    // Check if this is a token query
    if (queryKey[0] === 'tokens' && query.state.data) {
      const cachedData = query.state.data as Token[];
      
      // If chains filter is specified, only include tokens from those chains
      if (chains && chains.length > 0) {
        const filtered = cachedData.filter((token) =>
          token.chainId && chains.includes(token.chainId)
        );
        allCachedTokens.push(...filtered);
      } else {
        allCachedTokens.push(...cachedData);
      }
    }
  });
  
  // Remove duplicates by token ID
  const uniqueTokens = new Map<string, Token>();
  allCachedTokens.forEach((token) => {
    if (!uniqueTokens.has(token.id)) {
      uniqueTokens.set(token.id, token);
    }
  });
  
  return Array.from(uniqueTokens.values());
}

