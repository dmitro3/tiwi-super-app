/**
 * DexScreener Token Provider
 * 
 * Fetches tokens from DexScreener API.
 * DexScreener returns pairs, so we extract tokens from pairs.
 * Used as search fallback and for liquidity enrichment.
 */

import { BaseTokenProvider } from './base';
import { getCanonicalChainByProviderId, getCanonicalChain } from '@/lib/backend/registry/chains';
import type {
  CanonicalChain,
  ProviderToken,
  ProviderChain,
  NormalizedToken,
  FetchTokensParams,
} from '@/lib/backend/types/backend-tokens';

// ============================================================================
// DexScreener API Types
// ============================================================================

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  priceChange?: {
    h24?: number;  // 24h price change percentage
    m5?: number;
    h1?: number;
    h6?: number;
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  volume?: {
    h24?: number;
  };
  fdv?: number;
  info?: {
    imageUrl?: string;
    openGraph?: string;
  };
}

interface DexScreenerSearchResponse {
  pairs: DexScreenerPair[];
}

// ============================================================================
// DexScreener Provider
// ============================================================================

export class DexScreenerProvider extends BaseTokenProvider {
  name = 'dexscreener';

  getChainId(canonicalChain: CanonicalChain): string | number | null {
    return canonicalChain.providerIds.dexscreener ?? null;
  }

  async fetchTokens(params: FetchTokensParams): Promise<ProviderToken[]> {
    try {
      const { chainIds, search: query, limit = 30 } = params;
      
      // DexScreener works with chain slugs (strings), not numeric IDs
      // We need to map canonical chain IDs to DexScreener slugs
      const tokens: ProviderToken[] = [];
      const seenTokens = new Set<string>(); // Deduplicate by chainId:address
      
      // If query provided, search across all requested chains
      if (query && query.trim()) {
        const searchResults = await this.searchTokens(query.trim(), chainIds, limit);
        for (const token of searchResults) {
          const key = `${token.chainId}:${token.address.toLowerCase()}`;
          if (!seenTokens.has(key)) {
            seenTokens.add(key);
            tokens.push(token);
          }
        }
      } else {
        // No query: fetch popular tokens for each chain
        const chainsToFetch = chainIds || [];
        for (const chainId of chainsToFetch) {
          const chainTokens = await this.fetchPopularTokens(chainId, limit);
          for (const token of chainTokens) {
            const key = `${token.chainId}:${token.address.toLowerCase()}`;
            if (!seenTokens.has(key)) {
              seenTokens.add(key);
              tokens.push(token);
            }
          }
        }
      }
      
      return tokens.slice(0, limit);
    } catch (error) {
      console.error('[DexScreenerProvider] Error fetching tokens:', error);
      return [];
    }
  }

  async fetchChains(): Promise<ProviderChain[]> {
    // DexScreener doesn't have a chains endpoint
    // We'll return chains from our registry that have DexScreener support
    return [];
  }

  normalizeToken(token: ProviderToken, canonicalChain: CanonicalChain): NormalizedToken {
    return {
      chainId: canonicalChain.id,
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals, // DexScreener doesn't provide decimals, leave as undefined for enrichment
      logoURI: token.logoURI || '',
      priceUSD: token.priceUSD || '0',
      providers: ['dexscreener'],
      verified: false,
      vmType: canonicalChain.type === 'EVM' ? 'evm' : undefined,
      chainBadge: canonicalChain.name.toLowerCase(),
      chainName: canonicalChain.name,
      // Include enriched data from DexScreener
      volume24h: token.volume24h,
      liquidity: token.liquidity,
      marketCap: token.marketCap,
      priceChange24h: token.priceChange24h,
      holders: token.holders,
    };
  }

  normalizeChain(chain: ProviderChain): CanonicalChain | null {
    // DexScreener doesn't provide chain data
    return null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Search tokens by query with progressive prefix fallback
   * 
   * If full query returns no results, tries progressively shorter prefixes:
   * "tiwicat" → "tiwic" → "tiwi" → "tiw" → "ti" (minimum 2 chars)
   */
  private async searchTokens(
    query: string,
    chainIds?: number[],
    limit: number = 30
  ): Promise<ProviderToken[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];
    
    // Generate query variations: full query, then progressively shorter prefixes
    // Minimum length: 2 characters (best practice)
    const queryVariations: string[] = [];
    for (let i = trimmedQuery.length; i >= 2; i--) {
      queryVariations.push(trimmedQuery.substring(0, i));
    }
    
    // Try each variation until we get results
    for (const searchQuery of queryVariations) {
      const tokens = await this.searchTokensWithQuery(searchQuery, chainIds, limit);
      if (tokens.length > 0) {
        return tokens;
      }
    }
    
    // No results found with any variation
    return [];
  }

  /**
   * Search tokens with a specific query (internal helper)
   */
  private async searchTokensWithQuery(
    query: string,
    chainIds?: number[],
    limit: number = 30
  ): Promise<ProviderToken[]> {
    try {
      // DexScreener search endpoint
      const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.statusText}`);
      }
      
      const data: DexScreenerSearchResponse = await response.json();
      const tokens: ProviderToken[] = [];
      const seenTokens = new Set<string>();
      
      if (data.pairs && Array.isArray(data.pairs)) {
        // Sort pairs by volume (highest first) to prioritize tokens with more market activity
        const sortedPairs = [...data.pairs].sort((a, b) => {
          const volumeA = a.volume?.h24 || 0;
          const volumeB = b.volume?.h24 || 0;
          if (volumeA === volumeB) {
            const liquidityA = a.liquidity?.usd || 0;
            const liquidityB = b.liquidity?.usd || 0;
            return liquidityB - liquidityA;
          }
          return volumeB - volumeA;
        });
        
        for (const pair of sortedPairs) {
          // Extract logo from pair info
          const logoURI = pair.info?.imageUrl || '';
          
          // Extract tokens from pair (baseToken and quoteToken)
          const tokensToAdd = [
            { token: pair.baseToken, price: pair.priceUsd, liquidity: pair.liquidity, volume: pair.volume, priceChange: pair.priceChange, fdv: pair.fdv, logo: logoURI },
            { token: pair.quoteToken, price: pair.priceUsd, liquidity: pair.liquidity, volume: pair.volume, priceChange: pair.priceChange, fdv: pair.fdv, logo: logoURI },
          ];
          
          for (const { token, price, liquidity, volume, priceChange, fdv, logo } of tokensToAdd) {
            // Map DexScreener chain slug to canonical chain ID
            const canonicalChain = getCanonicalChainByProviderId('dexscreener', pair.chainId);
            if (!canonicalChain) continue;
            
            // Filter by requested chains if specified
            if (chainIds && !chainIds.includes(canonicalChain.id)) continue;
            
            const key = `${canonicalChain.id}:${token.address.toLowerCase()}`;
            if (seenTokens.has(key)) continue;
            seenTokens.add(key);
            
            tokens.push({
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              decimals: undefined, // DexScreener doesn't provide decimals, will be enriched from blockchain
              logoURI: logo, // Extract from pair info
              priceUSD: price || '0',
              chainId: canonicalChain.id, // Store for normalization
              volume24h: volume?.h24,
              liquidity: liquidity?.usd,
              marketCap: fdv,
              priceChange24h: priceChange?.h24,
            } as ProviderToken);
          }
        }
      }
      
      return tokens.slice(0, limit);
    } catch (error) {
      console.error('[DexScreenerProvider] Error searching tokens:', error);
      return [];
    }
  }

  /**
   * Fetch trending market data tokens sorted by volume
   * This method prioritizes tokens with high trading volume and liquidity
   */
  async fetchTrendingTokens(
    chainIds?: number[],
    limit: number = 100
  ): Promise<ProviderToken[]> {
    try {
      const tokens: ProviderToken[] = [];
      const seenTokens = new Set<string>();
      
      // If specific chains provided, fetch for those chains
      if (chainIds && chainIds.length > 0) {
        for (const chainId of chainIds) {
          const chainTokens = await this.fetchPopularTokens(chainId, limit);
          for (const token of chainTokens) {
            const key = `${token.chainId}:${token.address.toLowerCase()}`;
            if (!seenTokens.has(key)) {
              seenTokens.add(key);
              tokens.push(token);
            }
          }
        }
      } else {
        // Fetch from all major chains
        const majorChains = [1, 56, 137, 8453, 42161, 10, 43114, 7565164]; // Ethereum, BSC, Polygon, Base, Arbitrum, Optimism, Avalanche, Solana
        for (const chainId of majorChains) {
          const chainTokens = await this.fetchPopularTokens(chainId, Math.ceil(limit / majorChains.length));
          for (const token of chainTokens) {
            const key = `${token.chainId}:${token.address.toLowerCase()}`;
            if (!seenTokens.has(key)) {
              seenTokens.add(key);
              tokens.push(token);
            }
          }
        }
      }
      
      // Sort all tokens by volume (highest first) for market data display
      tokens.sort((a, b) => {
        const volumeA = a.volume24h || 0;
        const volumeB = b.volume24h || 0;
        if (volumeA === volumeB) {
          const liquidityA = a.liquidity || 0;
          const liquidityB = b.liquidity || 0;
          return liquidityB - liquidityA;
        }
        return volumeB - volumeA;
      });
      
      return tokens.slice(0, limit);
    } catch (error) {
      console.error('[DexScreenerProvider] Error fetching trending tokens:', error);
      return [];
    }
  }

  /**
   * Fetch popular tokens for a chain using DexScreener's search endpoint
   * Searches for popular tokens by querying common token symbols and sorting by volume
   */
  private async fetchPopularTokens(
    chainId: number,
    limit: number = 30
  ): Promise<ProviderToken[]> {
    try {
      const canonicalChain = getCanonicalChain(chainId);
      if (!canonicalChain) return [];
      
      const dexChainId = this.getChainId(canonicalChain);
      if (!dexChainId) return [];
      
      // Use search endpoint with chain-specific query to get popular pairs
      // DexScreener search returns pairs sorted by relevance/volume
      const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(String(dexChainId))}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.statusText}`);
      }
      
      const data: DexScreenerSearchResponse = await response.json();
      const tokens: ProviderToken[] = [];
      const seenTokens = new Set<string>();
      
      if (data.pairs && Array.isArray(data.pairs)) {
        // Sort pairs by volume (highest first) for better market data
        const sortedPairs = [...data.pairs].sort((a, b) => {
          const volumeA = a.volume?.h24 || 0;
          const volumeB = b.volume?.h24 || 0;
          // Secondary sort by liquidity if volumes are equal
          if (volumeA === volumeB) {
            const liquidityA = a.liquidity?.usd || 0;
            const liquidityB = b.liquidity?.usd || 0;
            return liquidityB - liquidityA;
          }
          return volumeB - volumeA;
        });
        
        for (const pair of sortedPairs.slice(0, limit * 2)) { // Get more pairs to extract more tokens
          const logoURI = pair.info?.imageUrl || '';
          
          // Extract tokens from pair (baseToken and quoteToken)
          // For base token, use pair price; for quote token, calculate inverse or use pair price
          const tokensToAdd = [
            { 
              token: pair.baseToken, 
              price: pair.priceUsd, 
              liquidity: pair.liquidity, 
              volume: pair.volume, 
              priceChange: pair.priceChange, 
              fdv: pair.fdv,
              logo: logoURI,
            },
            { 
              token: pair.quoteToken, 
              price: pair.priceUsd, // Quote token price is typically 1 for stablecoins or calculated
              liquidity: pair.liquidity, 
              volume: pair.volume, 
              priceChange: pair.priceChange, 
              fdv: pair.fdv,
              logo: logoURI,
            },
          ];
          
          for (const { token, price, liquidity, volume, priceChange, fdv, logo } of tokensToAdd) {
            const key = `${chainId}:${token.address.toLowerCase()}`;
            if (seenTokens.has(key)) continue;
            seenTokens.add(key);
            
            tokens.push({
              chainId,
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              decimals: undefined, // DexScreener doesn't provide decimals, will be enriched from blockchain
              logoURI: logo,
              priceUSD: price || '0',
              liquidity: liquidity?.usd,
              volume24h: volume?.h24,
              priceChange24h: priceChange?.h24, // 24h price change percentage
              marketCap: fdv, // Use FDV as market cap approximation
            });
            
            if (tokens.length >= limit) break;
          }
          
          if (tokens.length >= limit) break;
        }
      }
      
      return tokens.slice(0, limit);
    } catch (error) {
      console.error('[DexScreenerProvider] Error fetching popular tokens:', error);
      return [];
    }
  }
}
