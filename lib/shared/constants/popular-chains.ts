/**
 * Popular Chains Configuration
 * 
 * Defines popular chains that should be prefetched on app load.
 * This list is extensible for future chains (Cosmos, Sui, TON, etc.).
 * 
 * Platform-agnostic constants that can be used in both web and mobile.
 */

/**
 * Popular chain canonical IDs for prefetching
 * These chains are prefetched on app load for instant token modal experience.
 * 
 * Format: Array of canonical chain IDs (numbers)
 * 
 * To add new chains:
 * 1. Add the canonical chain ID to this array
 * 2. Ensure the chain is registered in lib/backend/registry/chains.ts
 * 3. The prefetch will automatically include it
 */
export const POPULAR_CHAIN_IDS: number[] = [
  // EVM Chains
  1,      // Ethereum
  56,     // BNB Chain (BSC)
  137,    // Polygon
  8453,   // Base
  42161,  // Arbitrum
  10,     // Optimism
  43114,  // Avalanche
  
  // Solana
  7565164, // Solana (canonical ID)
  
  // Future chains (to be added when available):
  // - Monad (chain ID TBD - add to registry first, then add ID here)
  // - Cosmos chains (chain IDs TBD - add to registry first, then add IDs here)
  // - Sui (chain ID TBD - add to registry first, then add ID here)
  // - TON (chain ID TBD - add to registry first, then add ID here)
  //
  // To add a new chain:
  // 1. Add the chain to lib/backend/registry/chains.ts with a canonical ID
  // 2. Add the canonical ID to this array
  // 3. Optionally add to priority groups in getPopularChainsByPriority()
];

/**
 * Get popular chain IDs grouped by priority for staggered prefetching
 * 
 * @returns Object with priority groups for prefetch timing
 */
export function getPopularChainsByPriority() {
  return {
    // First batch: Most popular EVM chains
    high: [1, 56, 137], // Ethereum, BSC, Polygon
    
    // Second batch: L2s and other popular chains
    medium: [8453, 42161, 10, 43114], // Base, Arbitrum, Optimism, Avalanche
    
    // Third batch: Non-EVM chains
    low: [7565164], // Solana
    
    // Future: Add Monad, Cosmos chains, Sui, TON here when available
  };
}

