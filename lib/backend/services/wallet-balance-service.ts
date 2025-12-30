/**
 * Wallet Balance Service
 * 
 * Orchestrates wallet balance fetching across multiple chains.
 * Handles caching, price fetching, and aggregation.
 */

import { getWalletTokens, SOLANA_CHAIN_ID } from '@/lib/backend/providers/moralis';
import { getTokenPrices } from '@/lib/backend/providers/price-provider';
import { getCache, CACHE_TTL } from '@/lib/backend/utils/cache';
import type { WalletToken, WalletBalanceResponse } from '@/lib/backend/types/wallet';

// ============================================================================
// Wallet Balance Service Class
// ============================================================================

export class WalletBalanceService {
  private cache = getCache();

  /**
   * Get wallet balances across multiple chains
   * 
   * @param address - Wallet address
   * @param chainIds - Array of chain IDs to fetch (defaults to major chains)
   * @returns Wallet balance response with USD values
   */
  async getWalletBalances(
    address: string,
    chainIds?: number[]
  ): Promise<WalletBalanceResponse> {
    // Default to major chains if not specified
    const chainsToFetch = chainIds || [
      1,      // Ethereum
      56,     // BSC
      137,    // Polygon
      42161,  // Arbitrum
      43114,  // Avalanche
      8453,   // Base
      SOLANA_CHAIN_ID, // Solana
    ];

    // Check cache
    const cacheKey = `wallet:${address.toLowerCase()}:${chainsToFetch.sort().join(',')}`;
    const cached = this.cache.get<WalletBalanceResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch tokens from all chains in parallel with error handling
    let tokens: WalletToken[] = [];
    try {
      tokens = await getWalletTokens(address, chainsToFetch);
    } catch (error) {
      console.error('[WalletBalanceService] Error fetching tokens:', error);
      // Return empty response on error (graceful degradation)
      return {
        address,
        balances: [],
        totalUSD: '0.00',
        chains: chainsToFetch,
        timestamp: Date.now(),
      };
    }

    // Fetch prices for all tokens in parallel with error handling
    let priceMap = new Map<string, any>();
    try {
      priceMap = await getTokenPrices(
        tokens.map(t => ({
          address: t.address,
          chainId: t.chainId,
          symbol: t.symbol,
        }))
      );
    } catch (error) {
      console.error('[WalletBalanceService] Error fetching prices:', error);
      // Continue without prices (graceful degradation)
    }

    // Enrich tokens with prices and USD values
    const enrichedTokens: WalletToken[] = tokens.map(token => {
      const priceKey = `${token.chainId}:${token.address.toLowerCase()}`;
      const price = priceMap.get(priceKey);

      let usdValue: string | undefined;
      let priceUSD: string | undefined;

      if (price) {
        priceUSD = price.priceUSD;
        // Calculate USD value: balanceFormatted * priceUSD
        try {
          const balanceNum = parseFloat(token.balanceFormatted);
          const priceNum = parseFloat(price.priceUSD);
          if (!isNaN(balanceNum) && !isNaN(priceNum)) {
            usdValue = (balanceNum * priceNum).toFixed(2);
          }
        } catch (error) {
          console.warn(`[WalletBalanceService] Error calculating USD value for ${token.symbol}:`, error);
        }
      }

      return {
        ...token,
        priceUSD,
        usdValue,
      };
    });

    // Calculate total USD value (only include tokens with valid USD values)
    const totalUSD = enrichedTokens.reduce((sum, token) => {
      if (token.usdValue) {
        const usdValue = parseFloat(token.usdValue);
        if (!isNaN(usdValue) && usdValue > 0) {
          return sum + usdValue;
        }
      }
      return sum;
    }, 0).toFixed(2);

    // Build response
    const response: WalletBalanceResponse = {
      address,
      balances: enrichedTokens,
      totalUSD,
      chains: chainsToFetch,
      timestamp: Date.now(),
    };

    // Cache response
    this.cache.set(cacheKey, response, CACHE_TTL.BALANCE);

    return response;
  }

  /**
   * Get wallet balance for a single chain
   */
  async getWalletBalanceForChain(
    address: string,
    chainId: number
  ): Promise<WalletToken[]> {
    const fullResponse = await this.getWalletBalances(address, [chainId]);
    return fullResponse.balances;
  }

  /**
   * Clear cache for a specific address
   */
  clearCache(address: string): void {
    // Clear all cache entries for this address
    // Note: This is a simple implementation - in production, you might want to track keys
    const cache = getCache();
    // For now, we'll rely on TTL expiration
    // A more sophisticated implementation would track keys per address
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let walletBalanceServiceInstance: WalletBalanceService | null = null;

/**
 * Get singleton WalletBalanceService instance
 */
export function getWalletBalanceService(): WalletBalanceService {
  if (!walletBalanceServiceInstance) {
    walletBalanceServiceInstance = new WalletBalanceService();
  }
  return walletBalanceServiceInstance;
}

