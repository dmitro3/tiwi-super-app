/**
 * Chain Service
 * 
 * Business logic layer for chain fetching.
 * Aggregates chains from multiple providers and normalizes them.
 */

import { LiFiProvider } from '@/lib/backend/providers/lifi';
import { getCanonicalChainByProviderId, getChainBadge, getCanonicalChains } from '@/lib/backend/registry/chains';
import type { ChainDTO, ProviderChain, CanonicalChain } from '@/lib/backend/types/backend-tokens';

// ============================================================================
// Chain Service Class
// ============================================================================

export class ChainService {
  private lifiProvider: LiFiProvider;

  constructor() {
    this.lifiProvider = new LiFiProvider();
  }

  /**
   * Get all supported chains from all providers
   * Currently fetches from LiFi, structured to add more providers easily
   */
  async getAllChains(): Promise<ChainDTO[]> {
    try {
      // Fetch chains from all providers
      const providerChains = await Promise.allSettled([
        this.fetchChainsFromLiFi(),
        // Future: Add other providers here
        // this.fetchChainsFromRelay(),
        // this.fetchChainsFromDexScreener(),
      ]);

      // Collect chains from all providers
      const allChains: ChainDTO[] = [];
      const chainMap = new Map<number, ChainDTO>(); // Deduplicate by canonical ID

      for (const result of providerChains) {
        if (result.status === 'fulfilled') {
          for (const chain of result.value) {
            // Use canonical ID as key for deduplication
            const existing = chainMap.get(chain.id);
            if (existing) {
              // Merge supported providers
              const mergedProviders = [...new Set([...existing.supportedProviders, ...chain.supportedProviders])];
              existing.supportedProviders = mergedProviders;
            } else {
              chainMap.set(chain.id, chain);
            }
          }
        }
      }

      // Convert map to array
      allChains.push(...Array.from(chainMap.values()));

      // If we got chains from providers, return them
      if (allChains.length > 0) {
        return allChains;
      }

      // Fallback to registry chains
      return this.getChainsFromRegistry();
    } catch (error: any) {
      console.error('[ChainService] Error fetching chains:', error);
      // Fallback to registry chains on error
      return this.getChainsFromRegistry();
    }
  }

  /**
   * Fetch chains from LiFi provider
   */
  private async fetchChainsFromLiFi(): Promise<ChainDTO[]> {
    try {
      const providerChains = await this.lifiProvider.fetchChains();
      const chains: ChainDTO[] = [];

      for (const providerChain of providerChains) {
        // Normalize LiFi chain to canonical format
        // This now creates dynamic chains if they don't exist in registry
        const canonicalChain = this.lifiProvider.normalizeChain(providerChain);
        if (canonicalChain) {
          // Update native currency from raw chain data if available
          const nativeCurrency = providerChain.nativeCurrency || canonicalChain.nativeCurrency;
          
          chains.push({
            id: canonicalChain.id,
            name: canonicalChain.name,
            type: canonicalChain.type,
            logoURI: canonicalChain.logoURI || providerChain.logoURI,
            nativeCurrency: nativeCurrency || canonicalChain.nativeCurrency,
            supportedProviders: ['lifi'],
            // chainBadge: getChainBadge(canonicalChain),
          });
        }
      }

      return chains;
    } catch (error: any) {
      console.error('[ChainService] Error fetching chains from LiFi:', error);
      return [];
    }
  }

  /**
   * Get chains from registry (fallback)
   */
  private getChainsFromRegistry(): ChainDTO[] {
    const canonicalChains = getCanonicalChains();
    
    return canonicalChains.map(chain => {
      // Determine which providers support this chain
      const supportedProviders: string[] = [];
      if (chain.providerIds.lifi !== null && chain.providerIds.lifi !== undefined) {
        supportedProviders.push('lifi');
      }
      if (chain.providerIds.dexscreener !== null && chain.providerIds.dexscreener !== undefined) {
        supportedProviders.push('dexscreener');
      }
      if (chain.providerIds.relay !== null && chain.providerIds.relay !== undefined) {
        supportedProviders.push('relay');
      }

      return {
        id: chain.id,
        name: chain.name,
        type: chain.type,
        logoURI: chain.logoURI,
        nativeCurrency: chain.nativeCurrency,
        supportedProviders,
        chainBadge: getChainBadge(chain),
      };
    });
  }

  /**
   * Get chains filtered by provider
   * Useful for getting chains supported by a specific provider
   */
  async getChainsByProvider(provider: 'lifi' | 'dexscreener' | 'relay'): Promise<ChainDTO[]> {
    const allChains = await this.getAllChains();
    return allChains.filter(chain => chain.supportedProviders.includes(provider));
  }

  /**
   * Get chains filtered by type
   * Useful for filtering EVM, Solana, Cosmos chains, etc.
   */
  async getChainsByType(type: 'EVM' | 'Solana' | 'Cosmos' | 'CosmosAppChain' | 'Sui' | 'TON' | 'Bitcoin'): Promise<ChainDTO[]> {
    const allChains = await this.getAllChains();
    return allChains.filter(chain => chain.type === type);
  }
}

// Singleton instance
let chainServiceInstance: ChainService | null = null;

/**
 * Get singleton ChainService instance
 */
export function getChainService(): ChainService {
  if (!chainServiceInstance) {
    chainServiceInstance = new ChainService();
  }
  return chainServiceInstance;
}

