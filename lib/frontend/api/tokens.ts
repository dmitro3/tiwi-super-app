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
  address?: string;  // Token contract address for specific token lookup
  source?: 'market' | 'default';  // Data source: 'market' for DexScreener market data, 'default' for regular fetching
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
  const { chains, query, limit, address, source } = params;
  
  // Build API URL
  const url = new URL('/api/v1/tokens', window.location.origin);
  
  // Add query parameters
  if (chains && chains.length > 0) {
    url.searchParams.set('chains', chains.join(','));
  }
  if (query && query.trim()) {
    url.searchParams.set('query', query.trim());
  }
  if (address && address.trim()) {
    url.searchParams.set('address', address.trim());
  }
  if (limit) {
    url.searchParams.set('limit', limit.toString());
  }
  if (source) {
    url.searchParams.set('source', source);
  }
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Extract user-friendly error message from API response
      const errorMessage = errorData.error || `Unable to load tokens`;
      
      // Create error with user-friendly message
      const error = new Error(errorMessage);
      // Preserve original error data for debugging
      (error as any).status = response.status;
      (error as any).data = errorData;
      
      throw error;
    }
    
    const data: TokensAPIResponse = await response.json();
    
    // Transform backend tokens to frontend format
    return data.tokens.map(transformToken);
  } catch (error) {
    console.error('[TokenAPI] Error fetching tokens:', error);
    
    // If error is already an Error with a message, re-throw as-is
    if (error instanceof Error) {
      throw error;
    }
    
    // Otherwise, wrap in user-friendly error
    throw new Error('Unable to load tokens. Please check your connection and try again.');
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
    decimals: backendToken.decimals, // Required: from token data (enriched by TokenService from blockchain)
    price: backendToken.priceUSD,
    priceChange24h: backendToken.priceChange24h,
    volume24h: backendToken.volume24h,
    liquidity: backendToken.liquidity,
    marketCap: backendToken.marketCap,
    holders: backendToken.holders,
    // balance and usdValue are not from API (wallet data, set separately)
  };
}

