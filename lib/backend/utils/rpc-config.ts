/**
 * RPC Configuration for all supported chains.
 * 
 * Uses Alchemy RPC URLs for reliable connections with proper timeouts.
 * Can be overridden via environment variables.
 */

/**
 * Chain ID to RPC URL mapping.
 * Supports environment variable overrides.
 * 
 * IMPORTANT: Uses NEXT_PUBLIC_ prefix for client-side access in browser.
 */
export const RPC_CONFIG: Record<number, string> = {
  // Ethereum Mainnet (1)
  1: process.env.NEXT_PUBLIC_ETH_RPC_URL ||
    'https://eth-mainnet.g.alchemy.com/v2/WLJoFMJfcDSAUbsnhlyCl',

  // Arbitrum One (42161)
  42161: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ||
    'https://arb-mainnet.g.alchemy.com/v2/WLJoFMJfcDSAUbsnhlyCl',

  // Optimism (10)
  10: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL ||
    'https://opt-mainnet.g.alchemy.com/v2/WLJoFMJfcDSAUbsnhlyCl',

  // Polygon (137)
  137: process.env.NEXT_PUBLIC_POLYGON_RPC_URL ||
    'https://polygon-mainnet.g.alchemy.com/v2/WLJoFMJfcDSAUbsnhlyCl',

  // Base (8453)
  8453: process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    'https://base-mainnet.g.alchemy.com/v2/WLJoFMJfcDSAUbsnhlyCl',

  // BSC / Binance Smart Chain (56)
  56: process.env.NEXT_PUBLIC_BSC_RPC_URL ||
    'https://bsc-dataseed.binance.org/',
};

/**
 * Get RPC URL for a specific chain ID.
 * 
 * @param chainId - Chain ID
 * @returns RPC URL or undefined if not configured
 */
export function getRpcUrl(chainId: number): string | undefined {
  return RPC_CONFIG[chainId];
}

/**
 * Check if a chain has a custom RPC configured.
 * 
 * @param chainId - Chain ID
 * @returns true if custom RPC is configured
 */
export function hasCustomRpc(chainId: number): boolean {
  return chainId in RPC_CONFIG;
}

/**
 * HTTP transport options for RPC calls.
 * Applied to all Alchemy RPCs for consistency.
 */
export const RPC_TRANSPORT_OPTIONS = {
  timeout: 25000, // 25 second timeout for deep discovery
  retryCount: 2,  // Retry up to 2 times
} as const;

