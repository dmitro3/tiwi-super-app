/**
 * Route API Service
 * 
 * Handles fetching swap routes from the backend API.
 * This function is used for fetching real swap quotes.
 */

import type { RouteRequest, RouteResponse } from '@/lib/backend/routers/types';

// ============================================================================
// API Functions
// ============================================================================

export interface FetchRouteParams {
  fromToken: {
    chainId: number;
    address: string;
    symbol?: string;
    decimals?: number;       // From token data (undefined means unknown, will be fetched)
  };
  toToken: {
    chainId: number;
    address: string;
    symbol?: string;
    decimals?: number;       // From token data (undefined means unknown, will be fetched)
  };
  fromAmount?: string;      // For normal routing (fromAmount → toAmount)
  toAmount?: string;        // For reverse routing (toAmount → fromAmount)
  slippage?: number;
  slippageMode?: 'fixed' | 'auto';
  fromAddress?: string;                // Connected wallet address (for faster routing with LiFi getQuote)
  recipient?: string;                  // Recipient address (toAddress) - user-provided or connected wallet
  order?: 'RECOMMENDED' | 'FASTEST' | 'CHEAPEST';
  liquidityUSD?: number;                // Token pair liquidity in USD (from token data)
}

export interface RouteAPIResponse {
  route: RouteResponse['route'];
  alternatives?: RouteResponse['alternatives'];
  timestamp: number;
  expiresAt: number;
  error?: string;
}

/**
 * Fetch route from backend API
 * 
 * @param params - Route request parameters
 * @returns Promise resolving to route response
 */
export async function fetchRoute(params: FetchRouteParams): Promise<RouteAPIResponse> {
  const url = new URL('/api/v1/route', window.location.origin);
  
  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    const data: RouteAPIResponse = await response.json();
    
    // Check if response has error (even if status is 200)
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!response.ok) {
      // If we got here, response wasn't ok but no error in data
      throw new Error(data.error || `Failed to fetch route: ${response.statusText}`);
    }
    
    return data;
  } catch (error) {
    console.error('[RouteAPI] Error fetching route:', error);
    throw error;
  }
}

/**
 * Check if quote is expired
 * 
 * @param expiresAt - Expiration timestamp
 * @returns true if quote is expired
 */
export function isQuoteExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

/**
 * Get time until quote expires (in seconds)
 * 
 * @param expiresAt - Expiration timestamp
 * @returns Seconds until expiration (0 if expired)
 */
export function getTimeUntilExpiration(expiresAt: number): number {
  const remaining = expiresAt - Date.now();
  return Math.max(0, Math.floor(remaining / 1000));
}

