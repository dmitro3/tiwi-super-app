/**
 * Token Service
 * 
 * Business logic layer for token fetching.
 * Phase 1.2: Uses TokenAggregationService for multi-provider support.
 */

import { getCanonicalChain, getCanonicalChains, getCanonicalChainByProviderId } from '@/lib/backend/registry/chains';
import { resolveChain, isChainSupported } from '@/lib/backend/registry/chain-resolver';

import { getChainBadge } from '@/lib/backend/registry/chains';
import { getTokenAggregationService } from './token-aggregation-service';
import { LiFiProvider } from '@/lib/backend/providers/lifi';
import type { NormalizedToken, ChainDTO, FetchTokensParams } from '@/lib/backend/types/backend-tokens';
import { MOCK_TOKENS } from '@/lib/backend/data/mock-tokens';
import { getFeaturedTokens, getFeaturedTokensForChains } from '@/lib/backend/data/featured-tokens';
import { DexScreenerProvider } from '@/lib/backend/providers/dexscreener';

// Initialize providers (must be called before using aggregation service)
import '@/lib/backend/providers/init';

// ============================================================================
// Token Service Class
// ============================================================================

export class TokenService {
  private lifiProvider: LiFiProvider;
  private dexScreenerProvider: DexScreenerProvider;
  private aggregationService = getTokenAggregationService();

  constructor() {
    this.lifiProvider = new LiFiProvider();
    this.dexScreenerProvider = new DexScreenerProvider();
  }

  /**
   * Get all tokens across all chains
   * 
   * Fetches tokens from major supported chains with balanced distribution.
   * Prioritizes BNB Chain tokens and ensures even distribution across chains.
   */
  async getAllTokens(limit: number = 30): Promise<NormalizedToken[]> {
    try {
      // Define major chains to include (prioritize BNB Chain)
      // Order: BNB Chain first, then Ethereum, then others
      const majorChainIds = [
        56,    // BNB Chain (priority)
        1,     // Ethereum
        137,   // Polygon
        42161, // Arbitrum
        10,    // Optimism
        8453,  // Base
        43114, // Avalanche
        7565164, // Solana
      ];

      // Filter to only chains that LiFi supports
      // But also include chains that might be supported by other providers (DexScreener)
      const supportedChainIds = majorChainIds.filter(id => {
        const chain = getCanonicalChain(id);
        if (!chain) {
          console.warn(`[TokenService] Chain ${id} not found in canonical chains`);
          return false;
        }
        // Check if LiFi supports it, OR if it's an EVM chain (DexScreener can handle it)
        const lifiChainId = this.lifiProvider.getChainId(chain);
        const isEVM = chain.type === 'EVM';
        const isSupported = lifiChainId !== null || isEVM;
        
        if (!isSupported) {
          console.warn(`[TokenService] Chain ${id} (${chain.name}) not supported by LiFi and not EVM`);
        }
        
        return isSupported;
      });

      console.log(`[TokenService] getAllTokens - supportedChainIds:`, supportedChainIds);

      if (supportedChainIds.length === 0) {
        console.warn('[TokenService] No chains supported, returning mock tokens');
        return MOCK_TOKENS.slice(0, limit);
      }

      const featuredTokens = getFeaturedTokensForChains(supportedChainIds);
      console.log(`[TokenService] getAllTokens - featuredTokens count:`, featuredTokens.length);
      
      // Enrich featured tokens with real prices from DexScreener
      const enrichedFeaturedTokens = await this.enrichFeaturedTokens(featuredTokens);
      const featuredAddresses = new Set(enrichedFeaturedTokens.map(t => `${t.chainId}:${t.address.toLowerCase()}`));

      // Fetch tokens from aggregation service
      // This will trigger balanced mixing (BNB prioritized, max 3 per chain, 6 for BNB)
      console.log(`[TokenService] getAllTokens - calling aggregationService.searchTokens with chainIds:`, supportedChainIds);
      const tokens = await this.aggregationService.searchTokens({
        chainIds: supportedChainIds,
        limit: limit,
      });
      console.log(`[TokenService] getAllTokens - aggregationService returned ${tokens.length} tokens`);
      
      // Remove featured tokens from regular results (to avoid duplicates)
      const regularTokens = tokens.filter(t => 
        !featuredAddresses.has(`${t.chainId}:${t.address.toLowerCase()}`)
      );
      console.log(`[TokenService] getAllTokens - regularTokens count (after removing featured):`, regularTokens.length);
      
      // Combine: featured tokens first, then regular tokens
      // Featured tokens (like TWC) will appear at the top
      const allTokens = [...enrichedFeaturedTokens, ...regularTokens].slice(0, limit);
      console.log(`[TokenService] getAllTokens - final allTokens count:`, allTokens.length);

      // Return real tokens if available, otherwise fallback to mock data
      if (allTokens.length === 0) {
        console.warn('[TokenService] No tokens found from aggregation service, returning mock tokens');
        return MOCK_TOKENS.slice(0, limit);
      }
      
      return allTokens;
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
    // Validate chain ID (supports both static and dynamic chains)
    
    // Check if chain is supported first (fast check)
    if (!isChainSupported(chainId)) {
      throw new Error(`Chain ID ${chainId} is not supported`);
    }
    
    // Resolve chain (handles both static and dynamic resolution)
    const chain = await resolveChain(chainId);
    if (!chain) {
      throw new Error(`Chain ID ${chainId} is not supported`);
    }

    try {
      // Get featured tokens for this chain (will appear first)
      const featuredTokens = getFeaturedTokens(chainId);
      const featuredAddresses = new Set(featuredTokens.map(t => t.address.toLowerCase()));
      
      // Fetch tokens from aggregation service
      const tokens = await this.aggregationService.searchTokens({
        chainIds: [chainId],
        limit: limit,
      });
      
      // Remove featured tokens from regular results (to avoid duplicates)
      const regularTokens = tokens.filter(t => !featuredAddresses.has(t.address.toLowerCase()));
      
      // Combine: featured tokens first, then regular tokens
      const allTokens = [...featuredTokens, ...regularTokens].slice(0, limit);

      // Return real tokens if available, otherwise fallback to mock data
      if (allTokens.length > 0) {
        return allTokens;
      }
    } catch (error: any) {
      console.error(`[TokenService] Error fetching tokens for chain ${chainId}:`, error);
      // Fallback to mock data on error
    }

    // Fallback: return featured tokens if available, otherwise mock data
    const featuredTokens = getFeaturedTokens(chainId);
    if (featuredTokens.length > 0) {
      return featuredTokens;
    }
    return MOCK_TOKENS.filter(token => token.chainId === chainId).slice(0, limit);
  }

  /**
   * Get tokens for multiple chains (with mixing)
   */
  async getTokensByChains(chainIds: number[], limit: number = 30): Promise<NormalizedToken[]> {
    // Validate and resolve all chain IDs (supports both static and dynamic chains)
    const { resolveChains, isChainSupported } = await import('@/lib/backend/registry/chain-resolver');
    
    // Filter to only supported chains
    const supportedChainIds = chainIds.filter(id => isChainSupported(id));
    
    if (supportedChainIds.length === 0) {
      throw new Error('No valid chain IDs provided');
    }
    
    // Resolve all chains in parallel
    const resolvedChains = await resolveChains(supportedChainIds);
    const validChains = Array.from(resolvedChains.values());

    if (validChains.length === 0) {
      throw new Error('No valid chain IDs provided');
    }

    try {
      // Get featured tokens for these chains
      const featuredTokens = getFeaturedTokensForChains(chainIds);
      const featuredAddresses = new Set(featuredTokens.map(t => `${t.chainId}:${t.address.toLowerCase()}`));

      // Fetch tokens from aggregation service
      const tokens = await this.aggregationService.searchTokens({
        chainIds: chainIds,
        limit: limit,
      });
      
      // Remove featured tokens from regular results (to avoid duplicates)
      const regularTokens = tokens.filter(t => 
        !featuredAddresses.has(`${t.chainId}:${t.address.toLowerCase()}`)
      );
      
      // Combine: featured tokens first, then regular tokens
      const allTokens = [...featuredTokens, ...regularTokens].slice(0, limit);

      if (allTokens.length > 0) {
        return allTokens;
      }
    } catch (error: any) {
      console.error(`[TokenService] Error fetching tokens for chains ${chainIds.join(',')}:`, error);
    }

    // Fallback: return featured tokens if available, otherwise mock data
    const featuredTokens = getFeaturedTokensForChains(chainIds);
    if (featuredTokens.length > 0) {
      return featuredTokens;
    }
    return MOCK_TOKENS
      .filter(token => chainIds.includes(token.chainId))
      .slice(0, limit);
  }

  /**
   * Search tokens by query (name, symbol, or address)
   * Optionally filter by chain(s)
   * 
   * Now uses TokenAggregationService for multi-provider support.
   */
  async searchTokens(
    query: string, 
    chainId?: number,
    chainIds?: number[],
    limit: number = 30
  ): Promise<NormalizedToken[]> {
    // Validate chain ID if provided (supports both static and dynamic chains)
    if (chainId !== undefined) {
      const { resolveChain, isChainSupported } = await import('@/lib/backend/registry/chain-resolver');
      
      if (!isChainSupported(chainId)) {
        throw new Error(`Chain ID ${chainId} is not supported`);
      }
      
      const chain = await resolveChain(chainId);
      if (!chain) {
        throw new Error(`Chain ID ${chainId} is not supported`);
      }
    }

    const lowerQuery = query.toLowerCase().trim();
    
    // If no query, return tokens by chain(s)
    if (!lowerQuery) {
      if (chainIds && chainIds.length > 0) {
        return this.getTokensByChains(chainIds, limit);
      }
      return chainId ? this.getTokensByChain(chainId, limit) : this.getAllTokens(limit);
    }

    try {
      // Determine which chains to search
      const chainsToSearch: number[] = [];
      if (chainIds && chainIds.length > 0) {
        // Filter to only supported chains
        const { isChainSupported } = await import('@/lib/backend/registry/chain-resolver');
        chainsToSearch.push(...chainIds.filter(id => isChainSupported(id)));
      } else if (chainId !== undefined) {
        chainsToSearch.push(chainId);
      } else {
        // Search all supported chains (static registry + priority chains)
        const { PRIORITY_EVM_CHAINS } = await import('@/lib/backend/registry/chain-resolver');
        const canonicalChains = getCanonicalChains();
        const staticChainIds = canonicalChains.map(chain => chain.id);
        const priorityChainIds = Array.from(PRIORITY_EVM_CHAINS);
        // Combine and deduplicate
        chainsToSearch.push(...new Set([...staticChainIds, ...priorityChainIds]));
      }

      // Use aggregation service for multi-provider search
      const params: FetchTokensParams = {
        chainIds: chainsToSearch,
        search: lowerQuery,
        limit,
      };

      const tokens = await this.aggregationService.searchTokens(params);
      
      if (tokens.length > 0) {
        return tokens;
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

  /**
   * Enrich featured tokens with live data from DexScreener
   * 
   * Strategy:
   * 1. Check cache first (5 min TTL)
   * 2. Try synchronous fetch with 500ms timeout
   * 3. If timeout/fails, return with existing data and enrich in background
   * 4. Cache results for next request
   * 
   * This ensures fast API responses while keeping prices fresh.
   */
  private async enrichFeaturedTokens(tokens: NormalizedToken[]): Promise<NormalizedToken[]> {
    if (tokens.length === 0) return tokens;
    
    const { getCache } = await import('@/lib/backend/utils/cache');
    const cache = getCache();
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const SYNC_TIMEOUT = 500; // 500ms timeout for synchronous fetch
    
    const dexProvider = new DexScreenerProvider();
    
    // Enrich each featured token
    const enriched = await Promise.all(
      tokens.map(async (token) => {
        const cacheKey = `featured-token:${token.chainId}:${token.address.toLowerCase()}`;
        
        // 1. Check cache first
        const cached = cache.get<NormalizedToken>(cacheKey);
        if (cached) {
          // Merge cached data with token (prefer cached live data)
          return {
            ...token,
            priceUSD: cached.priceUSD || token.priceUSD,
            logoURI: cached.logoURI || token.logoURI,
            liquidity: cached.liquidity || token.liquidity,
            volume24h: cached.volume24h || token.volume24h,
            priceChange24h: cached.priceChange24h || token.priceChange24h,
            marketCap: cached.marketCap || token.marketCap,
            decimals: token.decimals, // Keep original decimals
          };
        }
        
        // 2. Try synchronous fetch with timeout
        try {
          const fetchPromise = this.fetchTokenFromDexScreener(dexProvider, token);
          const timeoutPromise = new Promise<null>((resolve) => 
            setTimeout(() => resolve(null), SYNC_TIMEOUT)
          );
          
          const dexToken = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (dexToken) {
            // Successfully fetched - merge and cache
            const enrichedToken = {
              ...token,
              priceUSD: dexToken.priceUSD || token.priceUSD,
              logoURI: dexToken.logoURI || token.logoURI,
              liquidity: dexToken.liquidity || token.liquidity,
              volume24h: dexToken.volume24h || token.volume24h,
              priceChange24h: dexToken.priceChange24h || token.priceChange24h,
              marketCap: dexToken.marketCap || token.marketCap,
              decimals: token.decimals,
            };
            
            // Cache the enriched data
            cache.set(cacheKey, enrichedToken, CACHE_TTL);
            return enrichedToken;
          }
        } catch (error) {
          // Silently fail - will enrich in background
        }
        
        // 3. Timeout or error - return with existing data and enrich in background
        this.enrichTokenInBackground(dexProvider, token, cacheKey, CACHE_TTL);
        
        // Return original token (with hardcoded data if available)
        return token;
      })
    );
    
    return enriched;
  }
  
  /**
   * Fetch token data from DexScreener (helper method)
   */
  private async fetchTokenFromDexScreener(
    dexProvider: DexScreenerProvider,
    token: NormalizedToken
  ): Promise<NormalizedToken | null> {
    const canonicalChain = getCanonicalChain(token.chainId);
    if (!canonicalChain) return null;
    
    // Fetch token data from DexScreener by address
    const providerTokens = await dexProvider.fetchTokens({
      chainIds: [token.chainId],
      search: token.address,
      limit: 10,
    });
    
    // Find matching token
    for (const providerToken of providerTokens) {
      const normalized = dexProvider.normalizeToken(providerToken, canonicalChain);
      if (normalized.address.toLowerCase() === token.address.toLowerCase()) {
        return normalized;
      }
    }
    
    return null;
  }
  
  /**
   * Enrich token in background (non-blocking)
   */
  private enrichTokenInBackground(
    dexProvider: DexScreenerProvider,
    token: NormalizedToken,
    cacheKey: string,
    cacheTtl: number
  ): void {
    // Fire and forget - don't await
    this.fetchTokenFromDexScreener(dexProvider, token)
      .then(async (dexToken) => {
        if (dexToken) {
          const { getCache } = await import('@/lib/backend/utils/cache');
          const cache = getCache();
          
          // Cache enriched data for next request
          const enrichedToken = {
            ...token,
            priceUSD: dexToken.priceUSD || token.priceUSD,
            logoURI: dexToken.logoURI || token.logoURI,
            liquidity: dexToken.liquidity || token.liquidity,
            volume24h: dexToken.volume24h || token.volume24h,
            priceChange24h: dexToken.priceChange24h || token.priceChange24h,
            marketCap: dexToken.marketCap || token.marketCap,
            decimals: token.decimals,
          };
          
          cache.set(cacheKey, enrichedToken, cacheTtl);
        }
      })
      .catch((error) => {
          // Silently fail - will retry on next request
    });
  }

  /**
   * Get market data tokens from DexScreener
   * Prioritizes tokens with high trading volume and liquidity for market display
   * 
   * @param chainIds - Optional chain IDs to filter by
   * @param limit - Maximum number of tokens to return
   * @returns Array of normalized tokens with market data from DexScreener
   */
  async getMarketDataTokens(
    chainIds?: number[],
    limit: number = 100
  ): Promise<NormalizedToken[]> {
    try {
      // Fetch trending tokens from DexScreener (sorted by volume)
      const providerTokens = await this.dexScreenerProvider.fetchTrendingTokens(chainIds, limit);
      
      if (providerTokens.length === 0) {
        console.warn('[TokenService] No market data tokens from DexScreener, falling back to getAllTokens');
        // Fallback to regular token fetching
        return this.getAllTokens(limit);
      }

      // Normalize provider tokens to NormalizedToken format
      const normalizedTokens: NormalizedToken[] = [];
      const seenTokens = new Set<string>();

      for (const providerToken of providerTokens) {
        const chain = getCanonicalChain(providerToken.chainId);
        if (!chain) {
          console.warn(`[TokenService] Chain ${providerToken.chainId} not found for token ${providerToken.symbol}`);
          continue;
        }

        const key = `${providerToken.chainId}:${providerToken.address.toLowerCase()}`;
        if (seenTokens.has(key)) continue;
        seenTokens.add(key);

        const normalized = this.dexScreenerProvider.normalizeToken(providerToken, chain);
        normalizedTokens.push(normalized);
      }

      console.log(`[TokenService] getMarketDataTokens returned ${normalizedTokens.length} tokens from DexScreener`);
      return normalizedTokens.slice(0, limit);
    } catch (error: any) {
      console.error('[TokenService] Error fetching market data tokens:', error);
      // Fallback to regular token fetching
      return this.getAllTokens(limit);
    }
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

