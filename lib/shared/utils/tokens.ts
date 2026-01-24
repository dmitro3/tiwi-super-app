/**
 * Token Utilities
 * 
 * Platform-agnostic utilities for working with token arrays.
 * Can be used in both web and mobile.
 */

import type { Token } from '@/lib/frontend/types/tokens';

/**
 * Merge two token arrays, removing duplicates by token ID
 * Preserves order: API results first, then cached results
 * 
 * @param apiTokens - Tokens from API (higher priority)
 * @param cachedTokens - Tokens from cache (lower priority)
 * @returns Merged array with duplicates removed
 */
export function mergeTokens(apiTokens: Token[], cachedTokens: Token[]): Token[] {
  const tokenMap = new Map<string, Token>();
  
  // Add API tokens first (higher priority)
  apiTokens.forEach((token) => {
    tokenMap.set(token.id, token);
  });
  
  // Add cached tokens (only if not already present)
  cachedTokens.forEach((token) => {
    if (!tokenMap.has(token.id)) {
      tokenMap.set(token.id, token);
    }
  });
  
  // Return merged array: API tokens first, then cached tokens
  const apiIds = new Set(apiTokens.map((t) => t.id));
  const result: Token[] = [];
  
  // Add API tokens first
  apiTokens.forEach((token) => {
    result.push(token);
  });
  
  // Add cached tokens that weren't in API results
  cachedTokens.forEach((token) => {
    if (!apiIds.has(token.id)) {
      result.push(token);
    }
  });
  
  return result;
}

/**
 * Filter and sort tokens based on tab type
 * 
 * @param tokens - Array of tokens to filter/sort
 * @param tab - Active tab type
 * @param favoriteIds - Array of favorite token IDs
 * @returns Filtered and sorted tokens
 */
export function filterAndSortTokensByTab(
  tokens: Token[],
  tab: 'Favourite' | 'Hot' | 'New' | 'Gainers' | 'Losers',
  favoriteIds: string[] = []
): Token[] {
  let filtered = [...tokens];

  // Filter by tab type
  switch (tab) {
    case 'Favourite':
      filtered = filtered.filter(token => favoriteIds.includes(token.id));
      // If no favorites, return empty array
      if (filtered.length === 0) return [];
      // Sort favorites by volume (highest first) as secondary sort
      filtered.sort((a, b) => {
        const aVol = a.volume24h || 0;
        const bVol = b.volume24h || 0;
        return bVol - aVol;
      });
      break;

    case 'Hot':
      // Sort by volume (highest first)
      filtered.sort((a, b) => {
        const aVol = a.volume24h || 0;
        const bVol = b.volume24h || 0;
        return bVol - aVol;
      });
      break;

    case 'New':
      // For "New", we don't have creation date, so show all tokens
      // Sort by volume as secondary (most active new tokens first)
      filtered.sort((a, b) => {
        const aVol = a.volume24h || 0;
        const bVol = b.volume24h || 0;
        return bVol - aVol;
      });
      break;    case 'Gainers':
      // Sort by price change (highest positive first)
      filtered.sort((a, b) => {
        const aChange = a.priceChange24h ?? -Infinity;
        const bChange = b.priceChange24h ?? -Infinity;
        // Only show positive changes
        if (aChange <= 0 && bChange <= 0) return 0;
        if (aChange <= 0) return 1;
        if (bChange <= 0) return -1;
        return bChange - aChange;
      });
      // Filter out non-positive changes
      filtered = filtered.filter(token => (token.priceChange24h ?? 0) > 0);
      break;

    case 'Losers':
      // Sort by price change (lowest negative first)
      filtered.sort((a, b) => {
        const aChange = a.priceChange24h ?? Infinity;
        const bChange = b.priceChange24h ?? Infinity;
        // Only show negative changes
        if (aChange >= 0 && bChange >= 0) return 0;
        if (aChange >= 0) return 1;
        if (bChange >= 0) return -1;
        return aChange - bChange;
      });
      // Filter out non-negative changes
      filtered = filtered.filter(token => (token.priceChange24h ?? 0) < 0);
      break;
  }  return filtered;
}