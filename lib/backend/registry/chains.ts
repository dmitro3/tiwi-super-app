/**
 * Chain Registry
 * 
 * Single source of truth for chain identity and provider mappings.
 * This registry maps our canonical chain IDs to provider-specific identifiers.
 */

import type { CanonicalChain } from '@/lib/backend/types/backend-tokens';

// ============================================================================
// Chain Registry (Minimal - Phase 1.0)
// ============================================================================

export const CHAIN_REGISTRY: CanonicalChain[] = [
  {
    id: 1,
    name: 'Ethereum',
    type: 'EVM',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    providerIds: {
      lifi: 1,
      dexscreener: 'ethereum',
      relay: 1,
    },
  },
  {
    id: 56,
    name: 'BNB Chain',
    type: 'EVM',
    nativeCurrency: { symbol: 'BNB', decimals: 18 },
    providerIds: {
      lifi: 56,
      dexscreener: 'bsc',
      relay: 56,
    },
  },
  {
    id: 137,
    name: 'Polygon',
    type: 'EVM',
    nativeCurrency: { symbol: 'MATIC', decimals: 18 },
    providerIds: {
      lifi: 137,
      dexscreener: 'polygon',
      relay: 137,
    },
  },
  {
    id: 42161,
    name: 'Arbitrum',
    type: 'EVM',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    providerIds: {
      lifi: 42161,
      dexscreener: 'arbitrum',
      relay: 42161,
    },
  },
  {
    id: 10,
    name: 'Optimism',
    type: 'EVM',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    providerIds: {
      lifi: 10,
      dexscreener: 'optimism',
      relay: 10,
    },
  },
  {
    id: 8453,
    name: 'Base',
    type: 'EVM',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    providerIds: {
      lifi: 8453,
      dexscreener: 'base',
      relay: 8453,
    },
  },
  {
    id: 43114,
    name: 'Avalanche',
    type: 'EVM',
    nativeCurrency: { symbol: 'AVAX', decimals: 18 },
    providerIds: {
      lifi: 43114,
      dexscreener: 'avalanche',
      relay: 43114,
    },
  },
  {
    id: 7565164,
    name: 'Solana',
    type: 'Solana',
    nativeCurrency: { symbol: 'SOL', decimals: 9 },
    providerIds: {
      lifi: 1151111081099710,  // LiFi's special Solana ID
      dexscreener: 'solana',
      relay: 792703809,         // Relay's Solana ID
    },
  },
];

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Get canonical chain by our internal chain ID
 */
export function getCanonicalChain(chainId: number): CanonicalChain | null {
  return CHAIN_REGISTRY.find(chain => chain.id === chainId) || null;
}

/**
 * Get canonical chain by provider-specific chain ID
 */
export function getCanonicalChainByProviderId(
  provider: 'lifi' | 'dexscreener' | 'relay' | 'squid',
  providerChainId: string | number
): CanonicalChain | null {
  return CHAIN_REGISTRY.find(chain => {
    const providerId = chain.providerIds[provider];
    if (providerId === null || providerId === undefined) return false;
    return String(providerId) === String(providerChainId);
  }) || null;
}

/**
 * Get all canonical chains
 */
export function getCanonicalChains(): CanonicalChain[] {
  return CHAIN_REGISTRY;
}

/**
 * Get chain badge identifier for UI display
 * Format: "{type}-{name}" (e.g., "evm-ethereum", "solana-mainnet")
 */
export function getChainBadge(chain: CanonicalChain): string {
  const typePrefix = chain.type.toLowerCase();
  const nameSlug = chain.name.toLowerCase().replace(/\s+/g, '-');
  return `${typePrefix}-${nameSlug}`;
}

