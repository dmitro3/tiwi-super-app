/**
 * 1inch Token Provider
 * 
 * Fetches trending tokens from 1inch API.
 * Categories: MOST_VIEWED, GAINERS, TRENDING, LISTING_NEW
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
// 1inch API Types
// ============================================================================

interface OneInchToken {
  chainId: number;
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  eip2612?: boolean;
  isFoT?: boolean;
  logoURI: string;
  providers?: string[];
  tags?: Array<{ value: string; provider: string }>;
  rating?: number;
  blacklisted?: boolean;
  riskLevel?: string;
  volume24h?: number;
}

// interface OneInchTrendingResponse {
//   tokens: OneInchToken[];
// }

// ============================================================================
// 1inch Provider
// ============================================================================

export class OneInchProvider extends BaseTokenProvider {
  name = '1inch';
  
  private readonly API_BASE = 'https://api.1inch.com/token/v1.2';
  private readonly API_KEY = process.env.ONEINCH_API_KEY || 'hAJRuIVFRN3zmTAQQXaLl49ZHFVRfX00';

  getChainId(canonicalChain: CanonicalChain): string | number | null {
    // 1inch uses numeric chain IDs
    return canonicalChain.id;
  }

  async fetchTokens(params: FetchTokensParams): Promise<ProviderToken[]> {
    try {
      const { limit = 30 } = params;
      
      // 1inch doesn't support search, only trending categories
      // For search, return empty (will fallback to other providers)
      if (params.search) {
        return [];
      }

      // Default to TRENDING if no category specified
      const category = (params as any).category || 'TRENDING';
      return await this.fetchTrendingTokens(category, limit);
    } catch (error) {
      console.error('[OneInchProvider] Error fetching tokens:', error);
      return [];
    }
  }

  async fetchChains(): Promise<ProviderChain[]> {
    // 1inch doesn't have a chains endpoint
    return [];
  }

  normalizeToken(token: ProviderToken, canonicalChain: CanonicalChain): NormalizedToken {
    return {
      chainId: canonicalChain.id,
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI || '',
      priceUSD: token.priceUSD || '0',
      providers: ['1inch'],
      verified: token.rating === 1, // Rating 1 = verified
      vmType: canonicalChain.type === 'EVM' ? 'evm' : undefined,
      chainBadge: canonicalChain.name.toLowerCase(),
      chainName: canonicalChain.name,
      volume24h: token.volume24h,
      liquidity: token.liquidity,
      marketCap: token.marketCap,
      priceChange24h: token.priceChange24h,
      holders: token.holders,
    };
  }

  normalizeChain(chain: ProviderChain): CanonicalChain | null {
    return null;
  }

  /**
   * Fetch trending tokens by category
   */
  async fetchTrendingTokens(
    category: 'MOST_VIEWED' | 'GAINERS' | 'TRENDING' | 'LISTING_NEW',
    limit: number = 30
  ): Promise<ProviderToken[]> {
    try {
      const url = `${this.API_BASE}/multi-chain/trending-tokens?category=${category}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'accept': 'application/json',
          'content-type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`1inch API error: ${response.statusText}`);
      }

      const data: OneInchToken[] = await response.json();
      const tokens: ProviderToken[] = [];

      if (data && Array.isArray(data)) {
        for (const token of data.slice(0, limit)) {
          // Map 1inch chainId to canonical chain
          const canonicalChain = getCanonicalChain(token.chainId);
          if (!canonicalChain) {
            console.warn(`[OneInchProvider] Chain ${token.chainId} not found in canonical chains`);
            continue;
          }

          tokens.push({
            chainId: canonicalChain.id,
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            logoURI: token.logoURI || '',
            priceUSD: '0', // 1inch doesn't provide price, will be enriched
            volume24h: token.volume24h,
            // Additional metadata
            rating: token.rating,
            riskLevel: token.riskLevel,
            tags: token.tags,
          } as ProviderToken);
        }
      }

      return tokens;
    } catch (error) {
      console.error('[OneInchProvider] Error fetching trending tokens:', error);
      return [];
    }
  }
}

