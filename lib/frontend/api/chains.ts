/**
 * Chain API Service
 * 
 * Handles fetching chains from the backend API.
 * Includes in-memory caching (fetch once per session).
 */

import type { ChainDTO } from '@/lib/backend/types/backend-tokens';
import type { ChainsAPIResponse } from '@/lib/shared/types/api';
import type { Chain } from '@/lib/frontend/types/tokens';
import { cleanImageUrl } from '@/lib/shared/utils/formatting';

// ============================================================================
// In-Memory Cache
// ============================================================================

/**
 * Cache for chains (fetch once per session)
 * Chains are stable data that rarely change
 */
let chainsCache: Chain[] | null = null;
let chainsCachePromise: Promise<Chain[]> | null = null;

// ============================================================================
// API Functions
// ============================================================================

export interface FetchChainsParams {
  provider?: 'lifi' | 'dexscreener' | 'relay';
  type?: 'EVM' | 'Solana' | 'Cosmos' | 'CosmosAppChain' | 'Sui' | 'TON' | 'Bitcoin';
}

/**
 * Fetch chains from backend API
 * 
 * Uses in-memory cache to avoid refetching (chains are stable data).
 * 
 * @param params - Optional filter parameters
 * @returns Promise resolving to transformed chains
 */
export async function fetchChains(params: FetchChainsParams = {}): Promise<Chain[]> {
  const { provider, type } = params;
  
  // If no filters, use cached chains
  if (!provider && !type) {
    // Return cached chains if available
    if (chainsCache !== null) {
      return chainsCache;
    }
    
    // Return existing request if in progress
    if (chainsCachePromise !== null) {
      return chainsCachePromise;
    }
    
    // Create new request
    chainsCachePromise = fetchChainsFromAPI()
      .then((chains) => {
        chainsCache = chains;
        chainsCachePromise = null;
        return chains;
      })
      .catch((error) => {
        chainsCachePromise = null;
        throw error;
      });
    
    return chainsCachePromise;
  }
  
  // If filters are applied, fetch fresh data (filtered results)
  return fetchChainsFromAPI(params);
}

/**
 * Internal function to fetch chains from API
 */
async function fetchChainsFromAPI(params: FetchChainsParams = {}): Promise<Chain[]> {
  const { provider, type } = params;
  
  // Build API URL
  const url = new URL('/api/v1/chains', window.location.origin);
  
  // Add query parameters
  if (provider) {
    url.searchParams.set('provider', provider);
  }
  if (type) {
    url.searchParams.set('type', type);
  }
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch chains: ${response.statusText}`);
    }
    
    const data: ChainsAPIResponse = await response.json();
    
    // Transform backend chains to frontend format
    return data.chains.map(transformChain);
  } catch (error) {
    console.error('[ChainAPI] Error fetching chains:', error);
    throw error;
  }
}

/**
 * Clear chains cache (useful for testing or forced refresh)
 */
export function clearChainsCache(): void {
  chainsCache = null;
  chainsCachePromise = null;
}

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Transform backend ChainDTO to frontend Chain format
 * 
 * @param backendChain - Chain from backend API
 * @returns Transformed chain for frontend use
 */
function transformChain(backendChain: ChainDTO): Chain {
  return {
    id: backendChain.id.toString(),
    name: backendChain.name,
    logo: cleanImageUrl(backendChain.logoURI),
    type: backendChain.type,
    symbol: backendChain.nativeCurrency?.symbol,
    decimals: backendChain.nativeCurrency?.decimals,
  };
}

