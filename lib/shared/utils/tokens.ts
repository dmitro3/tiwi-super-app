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

