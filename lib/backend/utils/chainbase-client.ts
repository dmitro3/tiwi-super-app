/**
 * Chainbase API Client
 * 
 * Modular utility for fetching token holder counts from Chainbase API.
 * Used for both market pairs and individual tokens (e.g., TWC).
 * 
 * Features:
 * - Caching to reduce API calls
 * - Chain ID mapping (only supported chains)
 * - Graceful error handling with fallback
 * - Rate limiting awareness
 */

import { getCache, CACHE_TTL } from '@/lib/backend/utils/cache';

// Chainbase API configuration
const CHAINBASE_API_BASE = 'https://api.chainbase.online/v1';
// SECURITY FIX: Remove hardcoded API key - use environment variable only
const CHAINBASE_API_KEY = process.env.CHAINBASE_API_KEY;
if (!CHAINBASE_API_KEY) {
  console.warn('[Chainbase] CHAINBASE_API_KEY environment variable is not set. Chainbase API calls will fail.');
}

// Chainbase supported chain IDs
// Note: Solana (7565164) is NOT supported by Chainbase
const CHAINBASE_SUPPORTED_CHAINS: Set<number> = new Set([
  1,      // Ethereum
  56,     // BSC
  137,    // Polygon
  42161,  // Arbitrum One
  10,     // Optimism
  8453,   // Base
  43114,  // Avalanche
  324,    // zkSync
  4200,   // Merlin
]);

// Chain ID mapping (Chainbase uses same chain IDs as our canonical IDs)
const CHAINBASE_CHAIN_MAP: Record<number, number> = {
  1: 1,
  56: 56,
  137: 137,
  42161: 42161,
  10: 10,
  8453: 8453,
  43114: 43114,
  324: 324,
  4200: 4200,
};

// Chainbase API response type
interface ChainbaseHoldersResponse {
  code: number;
  message: string;
  data?: string[]; // Array of holder addresses
  count?: number;  // Total count (if provided)
  next_page?: number;
}

/**
 * Get token holder count from Chainbase API
 * 
 * @param chainId - Canonical chain ID
 * @param tokenAddress - Token contract address
 * @returns Promise resolving to holder count, or null if unavailable
 */
export async function getTokenHoldersCount(
  chainId: number,
  tokenAddress: string
): Promise<number | null> {
  // Check if chain is supported
  if (!CHAINBASE_SUPPORTED_CHAINS.has(chainId)) {
    return null; // Chain not supported (e.g., Solana)
  }

  const chainbaseChainId = CHAINBASE_CHAIN_MAP[chainId];
  if (!chainbaseChainId) {
    return null;
  }

  // Check cache first
  const cache = getCache();
  const cacheKey = `chainbase:holders:${chainId}:${tokenAddress.toLowerCase()}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== undefined && cached !== null) {
    return cached;
  }

  try {
    // Build API URL
    const url = new URL(`${CHAINBASE_API_BASE}/token/holders`);
    url.searchParams.set('page', '0');
    url.searchParams.set('chain_id', chainbaseChainId.toString());
    url.searchParams.set('contract_address', tokenAddress);

    // SECURITY FIX: Fail gracefully if API key is not set
    if (!CHAINBASE_API_KEY) {
      console.warn('[Chainbase] API key not configured, skipping request');
      return null;
    }

    // Make API request
    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': CHAINBASE_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(
        `[Chainbase] API error for chain ${chainId}, token ${tokenAddress}: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = (await response.json()) as ChainbaseHoldersResponse;
    // Check if response is successful
    if (data.code !== 0 || !data.data) {
      console.warn(
        `[Chainbase] API returned error for chain ${chainId}, token ${tokenAddress}: ${data.message || 'Unknown error'}`
      );
      return null;
    }

    // Extract count from response
    // Chainbase returns count in the response, or we can use data.length for first page
    // But the count field is more accurate for total holders
    const holderCount = data.count ?? data.data.length;

    if (holderCount === undefined || holderCount === null) {
      return null;
    }

    // Cache the result (5 minutes TTL - holder counts don't change frequently)
    const HOLDER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    cache.set(cacheKey, holderCount, HOLDER_CACHE_TTL);

    return holderCount;
  } catch (error) {
    console.error(
      `[Chainbase] Error fetching holder count for chain ${chainId}, token ${tokenAddress}:`,
      error
    );
    return null;
  }
}

/**
 * Check if a chain is supported by Chainbase
 * 
 * @param chainId - Canonical chain ID
 * @returns true if chain is supported, false otherwise
 */
export function isChainbaseSupported(chainId: number): boolean {
  return CHAINBASE_SUPPORTED_CHAINS.has(chainId);
}

