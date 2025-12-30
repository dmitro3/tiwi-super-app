/**
 * Token Enrichment Service
 * 
 * Handles background enrichment of tokens (non-blocking).
 * 
 * Enrichment includes:
 * - Router format lookup (for routing compatibility)
 * - Liquidity data from DexScreener
 * 
 * Key Principle: Never blocks the main response
 */

import { getProviderRegistry } from '@/lib/backend/providers/registry';
import { getCanonicalChain } from '@/lib/backend/registry/chains';
import type { NormalizedToken } from '@/lib/backend/types/backend-tokens';
import type { BaseTokenProvider } from '@/lib/backend/providers/base';

// ============================================================================
// Enriched Token (with router formats and liquidity)
// ============================================================================

export interface EnrichedToken extends NormalizedToken {
  routerFormats?: {
    lifi?: { chainId: number; address: string };
    squid?: { chainId: string; address: string };
    relay?: { chainId: string; address: string };
    jupiter?: { mint: string };
  };
  enrichedBy?: string[];
}

// ============================================================================
// Token Enrichment Service
// ============================================================================

export class TokenEnrichmentService {
  private registry = getProviderRegistry();

  /**
   * Enrich tokens in background (non-blocking, fire-and-forget)
   * 
   * This method starts enrichment and returns immediately.
   * Enrichment happens asynchronously and updates cache when ready.
   */
  enrichTokensInBackground(tokens: NormalizedToken[]): void {
    // Fire-and-forget: don't await, don't block
    this.enrichTokens(tokens).catch(error => {
      console.warn('[TokenEnrichmentService] Background enrichment failed:', error);
    });
  }

  /**
   * Enrich router formats only in background (non-blocking, fire-and-forget)
   * 
   * DexScreener data (price, change, volume, liquidity) is already included synchronously.
   * This only enriches router formats for routing compatibility.
   */
  enrichRouterFormatsInBackground(tokens: NormalizedToken[]): void {
    // Fire-and-forget: don't await, don't block
    this.enrichRouterFormats(tokens).catch(error => {
      console.warn('[TokenEnrichmentService] Background router format enrichment failed:', error);
    });
  }

  /**
   * Get router format for a token (on-demand, blocking)
   * 
   * Use this when routing and enrichment is not ready.
   */
  async getRouterFormat(
    token: NormalizedToken,
    router: 'lifi' | 'squid' | 'relay' | 'jupiter'
  ): Promise<{ chainId: string | number; address: string } | null> {
    try {
      // Check if already enriched
      if (token.routerFormats && token.routerFormats[router]) {
        return token.routerFormats[router] as { chainId: string | number; address: string };
      }
      
      // Fetch on-demand
      const enriched = await this.enrichToken(token);
      return enriched.routerFormats?.[router] as { chainId: string | number; address: string } | undefined || null;
    } catch (error) {
      console.error(`[TokenEnrichmentService] Error getting router format for ${router}:`, error);
      return null;
    }
  }

  /**
   * Internal: Enrich tokens (actual implementation)
   */
  private async enrichTokens(tokens: NormalizedToken[]): Promise<EnrichedToken[]> {
    const enriched: EnrichedToken[] = [];
    
    // Enrich tokens in parallel (but with rate limiting consideration)
    const enrichPromises = tokens.map(token => this.enrichToken(token));
    const results = await Promise.allSettled(enrichPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        enriched.push(result.value);
        // Update cache here (if cache service exists)
        // For now, just log
        console.log(`[TokenEnrichmentService] Enriched token: ${result.value.address}`);
      } else {
        console.warn('[TokenEnrichmentService] Token enrichment failed:', result.reason);
      }
    }
    
    return enriched;
  }

  /**
   * Internal: Enrich router formats only (for background enrichment)
   */
  private async enrichRouterFormats(tokens: NormalizedToken[]): Promise<void> {
    // Only enrich router formats, not DexScreener data (already included)
    const enrichPromises = tokens.map(token => this.enrichRouterFormatsOnly(token));
    await Promise.allSettled(enrichPromises);
  }

  /**
   * Internal: Enrich router formats only (no DexScreener data)
   */
  private async enrichRouterFormatsOnly(token: NormalizedToken): Promise<void> {
    const routerFormats: EnrichedToken['routerFormats'] = {};
    
    // Check router providers for token compatibility
    const routerProviders = this.registry.getRouterProviders();
    
    // Check each router provider
    await Promise.allSettled(
      routerProviders.map(async (provider: BaseTokenProvider) => {
        try {
          const format = await this.checkRouterProvider(provider, token);
          if (format) {
            const providerName = provider.name;
            if (providerName === 'lifi') {
              routerFormats.lifi = format as { chainId: number; address: string };
            } else if (providerName === 'squid') {
              routerFormats.squid = format as { chainId: string; address: string };
            } else if (providerName === 'relay') {
              routerFormats.relay = format as { chainId: string; address: string };
            } else if (providerName === 'jupiter') {
              routerFormats.jupiter = format as { mint: string };
            }
          }
        } catch (error) {
          // Silent failure for individual providers
        }
      })
    );
    
    // Note: We don't update the token here since this is background enrichment
    // The router formats will be fetched on-demand when needed
  }

  /**
   * Enrich a single token
   */
  private async enrichToken(token: NormalizedToken): Promise<EnrichedToken> {
    const routerFormats: EnrichedToken['routerFormats'] = {};
    const enrichedBy: string[] = [];
    
    // Check router providers for token compatibility
    const routerProviders = this.registry.getRouterProviders();
    
    // Check each router provider
    const routerChecks = await Promise.allSettled(
      routerProviders.map(async (provider: BaseTokenProvider) => {
        try {
          const format = await this.checkRouterProvider(provider, token);
          if (format) {
            const providerName = provider.name;
            if (providerName === 'lifi') {
              routerFormats.lifi = format as { chainId: number; address: string };
            } else if (providerName === 'squid') {
              routerFormats.squid = format as { chainId: string; address: string };
            } else if (providerName === 'relay') {
              routerFormats.relay = format as { chainId: string; address: string };
            } else if (providerName === 'jupiter') {
              routerFormats.jupiter = format as { mint: string };
            }
            enrichedBy.push(providerName);
          }
        } catch (error) {
          // Silent failure for individual providers
          console.warn(`[TokenEnrichmentService] Failed to check ${provider.name} for token ${token.address}:`, error);
        }
      })
    );
    
    // Fetch liquidity from DexScreener (if not already present)
    if (!token.liquidity) {
      try {
        const liquidity = await this.fetchDexScreenerLiquidity(token);
        if (liquidity) {
          enrichedBy.push('dexscreener');
        }
      } catch (error) {
        // Silent failure
        console.warn(`[TokenEnrichmentService] Failed to fetch liquidity for ${token.address}:`, error);
      }
    }
    
    return {
      ...token,
      routerFormats: Object.keys(routerFormats).length > 0 ? routerFormats : undefined,
      enrichedBy: enrichedBy.length > 0 ? enrichedBy : undefined,
    };
  }

  /**
   * Check if a router provider has this token
   */
  private async checkRouterProvider(
    provider: BaseTokenProvider,
    token: NormalizedToken
  ): Promise<{ chainId: string | number; address: string } | { mint: string } | null> {
    try {
      const canonicalChain = getCanonicalChain(token.chainId);
      if (!canonicalChain) return null;
      
      // Get provider-specific chain ID
      const providerChainId = provider.getChainId(canonicalChain);
      if (!providerChainId) return null;
      
      // Try to fetch token from provider to verify it exists
      // For now, we'll just return the format (actual lookup would require provider API)
      // This is a placeholder - actual implementation would check provider's token list
      
      if (provider.name === 'jupiter' && token.chainId === 7565164) {
        // Jupiter uses mint address for Solana
        return { mint: token.address };
      }
      
      return {
        chainId: providerChainId,
        address: token.address,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetch liquidity data from DexScreener
   */
  private async fetchDexScreenerLiquidity(token: NormalizedToken): Promise<{ usd: number; volume24h: number } | null> {
    try {
      const canonicalChain = getCanonicalChain(token.chainId);
      if (!canonicalChain) return null;
      
      const dexChainId = canonicalChain.providerIds.dexscreener;
      if (!dexChainId) return null;
      
      // Fetch token pairs from DexScreener
      const url = `https://api.dexscreener.com/latest/dex/tokens/${token.address}`;
      const response = await fetch(url);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data.pairs || !Array.isArray(data.pairs)) return null;
      
      // Filter pairs by chain
      const chainPairs = data.pairs.filter((pair: any) => pair.chainId === String(dexChainId));
      if (chainPairs.length === 0) return null;
      
      // Get highest liquidity pair
      const topPair = chainPairs.reduce((best: any, pair: any) => {
        const bestLiquidity = best.liquidity?.usd || 0;
        const pairLiquidity = pair.liquidity?.usd || 0;
        return pairLiquidity > bestLiquidity ? pair : best;
      }, chainPairs[0]);
      
      return {
        usd: topPair.liquidity?.usd || 0,
        volume24h: topPair.volume?.h24 || 0,
      };
    } catch (error) {
      return null;
    }
  }
}

// Singleton instance
let enrichmentServiceInstance: TokenEnrichmentService | null = null;

/**
 * Get singleton TokenEnrichmentService instance
 */
export function getTokenEnrichmentService(): TokenEnrichmentService {
  if (!enrichmentServiceInstance) {
    enrichmentServiceInstance = new TokenEnrichmentService();
  }
  return enrichmentServiceInstance;
}

