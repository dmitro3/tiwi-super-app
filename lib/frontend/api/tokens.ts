/**
 * Token API Service
 * 
 * Handles fetching tokens from the backend API.
 * This function is used as a queryFn for TanStack Query.
 * TanStack Query handles caching, deduplication, and retries.
 */

import type { NormalizedToken } from '@/lib/backend/types/backend-tokens';
import type { TokensAPIResponse } from '@/lib/shared/types/api';
import type { Token } from '@/lib/frontend/types/tokens';
import { cleanImageUrl } from '@/lib/shared/utils/formatting';

// ============================================================================
// API Functions
// ============================================================================

export interface FetchTokensParams {
  chains?: number[];
  query?: string;
  limit?: number;
}

/**
 * Fetch tokens from backend API
 * 
 * Pure function used as queryFn for TanStack Query.
 * TanStack Query handles caching, request deduplication, and retries.
 * 
 * @param params - Request parameters
 * @returns Promise resolving to transformed tokens
 */
export async function fetchTokens(params: FetchTokensParams = {}): Promise<Token[]> {
  const { chains, query, limit } = params;
  
  // Build API URL
  const url = new URL('/api/v1/tokens', window.location.origin);
  
  // Add query parameters
  if (chains && chains.length > 0) {
    url.searchParams.set('chains', chains.join(','));
  }
  if (query && query.trim()) {
    url.searchParams.set('query', query.trim());
  }
  if (limit) {
    url.searchParams.set('limit', limit.toString());
  }
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch tokens: ${response.statusText}`);
    }
    
    const data: TokensAPIResponse = await response.json();
    
    // Transform backend tokens to frontend format
    return data.tokens.map(transformToken);
  } catch (error) {
    console.error('[TokenAPI] Error fetching tokens:', error);
    throw error;
  }
}

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Transform backend NormalizedToken to frontend Token format
 * 
 * @param backendToken - Token from backend API
 * @returns Transformed token for frontend use
 */
function transformToken(backendToken: NormalizedToken): Token {
  // Generate unique ID from chainId + address
  const id = `${backendToken.chainId}-${backendToken.address.toLowerCase()}`;
  
  // Map chainName to chain string (for backward compatibility)
  const chain = backendToken.chainName || `Chain ${backendToken.chainId}`;
  
  return {
    id,
    name: backendToken.name,
    symbol: backendToken.symbol,
    address: backendToken.address,
    logo: cleanImageUrl(backendToken.logoURI || ''),
    chain,
    chainId: backendToken.chainId,
    price: backendToken.priceUSD,
    // balance and usdValue are not from API (wallet data, set separately)
  };
}

