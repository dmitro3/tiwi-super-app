/**
 * Token Service
 * 
 * Business logic layer for token fetching.
 * Phase 1.1: Uses real LiFi provider, with fallback to mocked data.
 */

import { getCanonicalChain, getCanonicalChains, getCanonicalChainByProviderId } from '@/lib/backend/registry/chains';
import { getChainBadge } from '@/lib/backend/registry/chains';
import { LiFiProvider } from '@/lib/backend/providers/lifi';
import type { NormalizedToken, ChainDTO } from '@/lib/backend/types/backend-tokens';
import { MOCK_TOKENS } from '@/lib/backend/data/mock-tokens';

// ============================================================================
// Token Service Class
// ============================================================================

export class TokenService {
  private lifiProvider: LiFiProvider;

  constructor() {
    this.lifiProvider = new LiFiProvider();
  }

  /**
   * Get all tokens across all chains
   */
  async getAllTokens(limit: number = 30): Promise<NormalizedToken[]> {
    try {
      // Fetch tokens from all supported chains using LiFi
      const canonicalChains = getCanonicalChains();
      const canonicalChainIds = canonicalChains
        .map(chain => chain.id)
        .filter(id => {
          const chain = getCanonicalChain(id);
          return chain && this.lifiProvider.getChainId(chain);
        });

      if (canonicalChainIds.length === 0) {
        return MOCK_TOKENS.slice(0, limit);
      }

      // Use multi-chain fetch with mixing
      const providerTokens = await this.lifiProvider.fetchTokens({
        chainIds: canonicalChainIds,
        limit: limit,
      });

      // Normalize tokens
      const tokens: NormalizedToken[] = [];
      for (const providerToken of providerTokens) {
        const chainId = typeof providerToken.chainId === 'number' 
          ? providerToken.chainId 
          : parseInt(String(providerToken.chainId), 10);
        
        const canonicalChain = getCanonicalChainByProviderId('lifi', chainId);
        if (canonicalChain) {
          tokens.push(this.lifiProvider.normalizeToken(providerToken, canonicalChain));
        }
      }

      // Return real tokens if available, otherwise fallback to mock data
      return tokens.length > 0 ? tokens : MOCK_TOKENS.slice(0, limit);
    } catch (error: any) {
      console.error('[TokenService] Error fetching all tokens:', error);
      // Fallback to mock data on error
      return MOCK_TOKENS.slice(0, limit);
    }
  }

  /**
   * Get tokens for a specific chain
   */
  async getTokensByChain(chainId: number, limit: number = 30): Promise<NormalizedToken[]> {
    // Validate chain ID against registry
    const chain = getCanonicalChain(chainId);
    if (!chain) {
      throw new Error(`Chain ID ${chainId} is not supported`);
    }

    try {
      // Fetch tokens from LiFi for this chain
      const lifiChainId = this.lifiProvider.getChainId(chain);
      if (lifiChainId && typeof lifiChainId === 'number') {
        const providerTokens = await this.lifiProvider.fetchTokens({
          chainId: lifiChainId,
          limit: limit,
        });

        const tokens = providerTokens.map(token => 
          this.lifiProvider.normalizeToken(token, chain)
        );

        // Return real tokens if available, otherwise fallback to mock data
        if (tokens.length > 0) {
          return tokens;
        }
      }
    } catch (error: any) {
      console.error(`[TokenService] Error fetching tokens for chain ${chainId}:`, error);
      // Fallback to mock data on error
    }

    // Fallback to mock data
    return MOCK_TOKENS.filter(token => token.chainId === chainId).slice(0, limit);
  }

  /**
   * Get tokens for multiple chains (with mixing)
   */
  async getTokensByChains(chainIds: number[], limit: number = 30): Promise<NormalizedToken[]> {
    // Validate all chain IDs
    const validChains = chainIds
      .map(id => getCanonicalChain(id))
      .filter((chain): chain is NonNullable<typeof chain> => chain !== null);

    if (validChains.length === 0) {
      throw new Error('No valid chain IDs provided');
    }

    try {
      // Fetch tokens using multi-chain method (will mix automatically)
      const providerTokens = await this.lifiProvider.fetchTokens({
        chainIds: chainIds,
        limit: limit,
      });

      // Normalize tokens
      const tokens: NormalizedToken[] = [];
      for (const providerToken of providerTokens) {
        const chainId = typeof providerToken.chainId === 'number' 
          ? providerToken.chainId 
          : parseInt(String(providerToken.chainId), 10);
        
        const canonicalChain = getCanonicalChainByProviderId('lifi', chainId);
        if (canonicalChain) {
          tokens.push(this.lifiProvider.normalizeToken(providerToken, canonicalChain));
        }
      }

      if (tokens.length > 0) {
        return tokens;
      }
    } catch (error: any) {
      console.error(`[TokenService] Error fetching tokens for chains ${chainIds.join(',')}:`, error);
    }

    // Fallback to mock data
    return MOCK_TOKENS
      .filter(token => chainIds.includes(token.chainId))
      .slice(0, limit);
  }

  /**
   * Search tokens by query (name, symbol, or address)
   * Optionally filter by chain(s)
   */
  async searchTokens(
    query: string, 
    chainId?: number,
    chainIds?: number[],
    limit: number = 30
  ): Promise<NormalizedToken[]> {
    // Validate chain ID if provided
    if (chainId !== undefined) {
      const chain = getCanonicalChain(chainId);
      if (!chain) {
        throw new Error(`Chain ID ${chainId} is not supported`);
      }
    }

    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      if (chainIds && chainIds.length > 0) {
        return this.getTokensByChains(chainIds, limit);
      }
      return chainId ? this.getTokensByChain(chainId, limit) : this.getAllTokens(limit);
    }

    try {
      // If specific chainIds provided, use multi-chain search
      if (chainIds && chainIds.length > 0) {
        const providerTokens = await this.lifiProvider.fetchTokens({
          chainIds: chainIds,
          search: query,
          limit: limit,
        });

        // Normalize tokens
        const tokens: NormalizedToken[] = [];
        for (const providerToken of providerTokens) {
          const tokenChainId = typeof providerToken.chainId === 'number' 
            ? providerToken.chainId 
            : parseInt(String(providerToken.chainId), 10);
          
          const canonicalChain = getCanonicalChainByProviderId('lifi', tokenChainId);
          if (canonicalChain) {
            tokens.push(this.lifiProvider.normalizeToken(providerToken, canonicalChain));
          }
        }

        if (tokens.length > 0) {
          return tokens;
        }
      } else if (chainId !== undefined) {
        // Search in specific chain
        const chain = getCanonicalChain(chainId);
        if (!chain) {
          throw new Error(`Chain ID ${chainId} is not supported`);
        }

        const lifiChainId = this.lifiProvider.getChainId(chain);
        if (lifiChainId && typeof lifiChainId === 'number') {
          const providerTokens = await this.lifiProvider.fetchTokens({
            chainId: lifiChainId,
            search: query,
            limit: limit,
          });

          const tokens = providerTokens.map(token => 
            this.lifiProvider.normalizeToken(token, chain)
          );

          if (tokens.length > 0) {
            return tokens;
          }
        }
      } else {
        // Search across all chains (use multi-chain method)
        const canonicalChains = getCanonicalChains();
        const canonicalChainIds = canonicalChains
          .map(chain => chain.id)
          .filter(id => {
            const chain = getCanonicalChain(id);
            return chain && this.lifiProvider.getChainId(chain);
          });

        if (canonicalChainIds.length > 0) {
          const providerTokens = await this.lifiProvider.fetchTokens({
            chainIds: canonicalChainIds,
            search: query,
            limit: limit,
          });

          // Normalize tokens
          const tokens: NormalizedToken[] = [];
          for (const providerToken of providerTokens) {
            const tokenChainId = typeof providerToken.chainId === 'number' 
              ? providerToken.chainId 
              : parseInt(String(providerToken.chainId), 10);
            
            const canonicalChain = getCanonicalChainByProviderId('lifi', tokenChainId);
            if (canonicalChain) {
              tokens.push(this.lifiProvider.normalizeToken(providerToken, canonicalChain));
            }
          }

          if (tokens.length > 0) {
            return tokens;
          }
        }
      }
    } catch (error: any) {
      console.error(`[TokenService] Error searching tokens:`, error);
      // Fallback to mock data search
    }

    // Fallback to mock data search
    let results = MOCK_TOKENS;
    if (chainId !== undefined) {
      results = results.filter(token => token.chainId === chainId);
    } else if (chainIds && chainIds.length > 0) {
      results = results.filter(token => chainIds.includes(token.chainId));
    }
    results = results.filter(token => {
      const nameMatch = token.name.toLowerCase().includes(lowerQuery);
      const symbolMatch = token.symbol.toLowerCase().includes(lowerQuery);
      const addressMatch = token.address.toLowerCase().includes(lowerQuery);
      return nameMatch || symbolMatch || addressMatch;
    });

    return results.slice(0, limit);
  }

  /**
   * Get all supported chains
   */
  async getSupportedChains(): Promise<ChainDTO[]> {
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
}

// Singleton instance
let tokenServiceInstance: TokenService | null = null;

/**
 * Get singleton TokenService instance
 */
export function getTokenService(): TokenService {
  if (!tokenServiceInstance) {
    tokenServiceInstance = new TokenService();
  }
  return tokenServiceInstance;
}

