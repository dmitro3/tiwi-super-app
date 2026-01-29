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
import type { NormalizedToken, ChainDTO, FetchTokensParams, ProviderToken, MarketTokenPair } from '@/lib/backend/types/backend-tokens';
import { MOCK_TOKENS } from '@/lib/backend/data/mock-tokens';
import { getFeaturedTokens, getFeaturedTokensForChains } from '@/lib/backend/data/featured-tokens';
import { DexScreenerProvider } from '@/lib/backend/providers/dexscreener';
import { OneInchProvider } from '@/lib/backend/providers/oneinch';
import { getPoolMarketService } from '@/lib/backend/services/pool-market-service';
import { getTokenHoldersCount } from '@/lib/backend/utils/chainbase-client';

// Initialize providers (must be called before using aggregation service)
import '@/lib/backend/providers/init';

// ============================================================================
// Token Service Class
// ============================================================================

export class TokenService {
  private lifiProvider: LiFiProvider;
  private dexScreenerProvider: DexScreenerProvider;
  private aggregationService = getTokenAggregationService();
  private poolMarketService = getPoolMarketService();

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
   * Get tokens by category (Hot, New, Gainers, Losers)
   * NEW IMPLEMENTATION:
   * - Uses CoinGecko Onchain pool endpoints (via PoolMarketService)
   *   to get pool-based market data and normalize it into tokens.
   * - This replaces the old 1inch-based implementation for categories.
   */
  async getTokensByCategory(
    category: 'hot' | 'new' | 'gainers' | 'losers',
    limit: number = 30,
    chainIds?: number[]
  ): Promise<NormalizedToken[]> {
    try {
      const tokens = await this.getTokensByCategoryFromCoinGecko(category, limit, chainIds);

      if (tokens.length > 0) {
        return tokens;
      }

      // Fallback: DexScreener-only if CoinGecko fails
      return this.getTokensByCategoryFromDexScreener(category, limit);
    } catch (error: any) {
      console.error('[TokenService] Error fetching tokens by category:', error);
      return this.getTokensByCategoryFromDexScreener(category, limit);
    }
  }

  /**
   * Enrich CoinGecko tokens with DexScreener liquidity and holders
   * Keeps CoinGecko market data (price, market cap, volume) but adds accurate DEX pool liquidity
   */
  private async enrichTokensWithDexScreenerLiquidity(
    tokens: NormalizedToken[]
  ): Promise<NormalizedToken[]> {
    console.log(`[TokenService] Enriching ${tokens.length} tokens with DexScreener liquidity/holders`);
    
    const enrichedPromises = tokens.map(async (token) => {
      // Skip if no address or address is coin ID (native coins)
      if (!token.address || token.address === token.symbol.toLowerCase()) {
        return token;
      }

      try {
        const chain = getCanonicalChain(token.chainId);
        if (!chain) return token;

        const dexChainId = chain.providerIds.dexscreener;
        if (!dexChainId) {
          console.log(`[DEBUG] ⏭️ No DexScreener support for ${chain.name}, skipping enrichment`);
          return token;
        }

        // Fetch DexScreener data for this token
        const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${token.address}`;
        const dexResponse = await fetch(dexUrl, { 
          signal: AbortSignal.timeout(10000)
        });

        if (!dexResponse.ok) {
          return token; // Return original token if DexScreener fails
        }

        const dexData = await dexResponse.json() as {
          pairs?: Array<{
            chainId?: string;
            baseToken?: { address?: string; symbol?: string };
            quoteToken?: { address?: string; symbol?: string };
            liquidity?: { usd?: number };
          }>;
        };

        if (!dexData.pairs || dexData.pairs.length === 0) {
          return token; // No pairs found, return original
        }

        // CRITICAL: Token → Pairs → Pool Reserves → USD value
        // Sum liquidity from ALL pairs where token appears (base OR quote)
        // FIX: DexScreener uses string chain slugs ("ethereum", "bsc"), not numeric IDs
        const addressLower = token.address.toLowerCase();
        const dexChainSlug = String(dexChainId).toLowerCase(); // Already a string like "ethereum"
        
        // Debug: Log what we're comparing
        console.log(`[DEBUG] 🔍 ${token.symbol}: Comparing chain "${dexChainSlug}" with pairs:`, 
          dexData.pairs.slice(0, 3).map(p => p.chainId));
        
        const relevantPairs = dexData.pairs.filter(pair => {
          // DexScreener chainId is already a string slug like "ethereum", "bsc", "polygon"
          const pairChainSlug = pair.chainId?.toLowerCase();
          const chainMatch = pairChainSlug === dexChainSlug;
          
          // Token must be in baseToken OR quoteToken position
          const isBaseToken = pair.baseToken?.address?.toLowerCase() === addressLower;
          const isQuoteToken = pair.quoteToken?.address?.toLowerCase() === addressLower;
          
          if (chainMatch && (isBaseToken || isQuoteToken)) {
            console.log(`[DEBUG] ✅ Match: ${token.symbol} pair ${pair.baseToken?.symbol}/${pair.quoteToken?.symbol} on ${pairChainSlug}, liquidity: $${pair.liquidity?.usd || 0}`);
          }
          
          return chainMatch && (isBaseToken || isQuoteToken);
        });
        
        console.log(`[DEBUG] Found ${relevantPairs.length} relevant pairs for ${token.symbol} on chain ${dexChainSlug}`);

        // Sum liquidity from all valid pairs (filter dead pools)
        const validPairs = relevantPairs.filter(pair => 
          pair.liquidity?.usd && pair.liquidity.usd > 0
        );

        let totalLiquidity = validPairs.reduce((sum, pair) => 
          sum + (pair.liquidity?.usd || 0), 0
        );
        
        // FALLBACK: If no pairs matched (chain filter too strict), try without chain filter
        // DexScreener already scopes by token address, so this is safe
        if (totalLiquidity === 0 && relevantPairs.length === 0 && dexData.pairs.length > 0) {
          console.log(`[DEBUG] ⚠️ No pairs matched with chain filter, trying without chain filter for ${token.symbol}`);
          const allRelevantPairs = dexData.pairs.filter(pair => {
            const isBaseToken = pair.baseToken?.address?.toLowerCase() === addressLower;
            const isQuoteToken = pair.quoteToken?.address?.toLowerCase() === addressLower;
            return isBaseToken || isQuoteToken;
          });
          
          const allValidPairs = allRelevantPairs.filter(pair => 
            pair.liquidity?.usd && pair.liquidity.usd > 0
          );
          
          totalLiquidity = allValidPairs.reduce((sum, pair) => 
            sum + (pair.liquidity?.usd || 0), 0
          );
          
          if (totalLiquidity > 0) {
            console.log(`[DEBUG] ✅ Found ${allValidPairs.length} pairs without chain filter, liquidity: $${totalLiquidity.toLocaleString()}`);
          }
        }

        // Get holders from ChainBase (if we have chainId and address)
        // FIX: Better error handling - log why holders fail
        let holders = token.holders;
        if (token.chainId && token.address) {
          try {
            const { getTokenHoldersCount } = await import('@/lib/backend/utils/chainbase-client');
            const chain = getCanonicalChain(token.chainId);
            
            // ChainBase only supports EVM chains
            if (chain && chain.type === 'EVM') {
              console.log(`[DEBUG] 👥 Fetching holders for ${token.symbol} on ${chain.name} (chainId: ${token.chainId}, address: ${token.address})`);
              const holderCount = await getTokenHoldersCount(token.chainId, token.address);
              
              if (holderCount !== null && holderCount > 0) {
                holders = holderCount;
                console.log(`[DEBUG] ✅ Got ${holders} holders for ${token.symbol}`);
              } else {
                console.warn(`[DEBUG] ⚠️ ChainBase returned ${holderCount} for ${token.symbol} (chainId: ${token.chainId})`);
              }
            } else {
              console.log(`[DEBUG] ⏭️ Skipping ChainBase for ${token.symbol} - ${chain?.type || 'unknown'} chain not supported (ChainBase is EVM-only)`);
            }
          } catch (error: any) {
            console.error(`[DEBUG] ❌ ChainBase error for ${token.symbol}:`, error.message || error);
            // Keep existing holders on error
          }
        } else {
          console.log(`[DEBUG] ⏭️ Skipping ChainBase for ${token.symbol} - missing chainId or address`);
        }

        // Return enriched token (keep CoinGecko data, add DexScreener liquidity/holders)
        return {
          ...token,
          liquidity: totalLiquidity > 0 ? totalLiquidity : token.liquidity, // Use DexScreener if available
          holders: holders || token.holders, // Use ChainBase if available
        };
      } catch (error) {
        console.error(`[TokenService] Error enriching ${token.symbol} with DexScreener:`, error);
        return token; // Return original on error
      }
    });

    return Promise.all(enrichedPromises);
  }

  /**
   * Get individual tokens by category from CoinGecko coins markets API
   * This returns actual tokens with accurate market data
   * NOTE: Liquidity will be enriched with DexScreener in getTokensByCategory
   */
  private async getTokensByCategoryFromCoinGecko(
    category: 'hot' | 'new' | 'gainers' | 'losers',
    limit: number = 30,
    chainIds?: number[]
  ): Promise<NormalizedToken[]> {
    try {
      const apiKey =
        process.env.COINGECKO_API_KEY ||
        process.env.COINGECKO_DEMO_API_KEY ||
        process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['x-cg-demo-api-key'] = apiKey;
      }

      // Determine order parameter based on category
      let order: string;
      switch (category) {
        case 'hot':
          order = 'volume_desc';
          break;
        case 'gainers':
          order = 'price_change_percentage_24h_desc';
          break;
        case 'losers':
          order = 'price_change_percentage_24h_asc';
          break;
        case 'new':
          order = 'id_asc';
          break;
        default:
          order = 'market_cap_desc';
      }

      // Single CoinGecko API call - no enrichment needed for fast loading
      const coinsUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=${order}&per_page=${limit * 2}&page=1&sparkline=false&price_change_percentage=24h&locale=en`;
      const coinsResponse = await fetch(coinsUrl, { headers });

      if (!coinsResponse.ok) {
        console.warn('[TokenService] CoinGecko markets API failed:', coinsResponse.status);
        return [];
      }

      const coinsData = await coinsResponse.json() as Array<{
        id: string;
        symbol: string;
        name: string;
        image: string;
        current_price: number;
        market_cap: number;
        market_cap_rank: number | null;
        fully_diluted_valuation?: number;
        total_volume: number;
        price_change_percentage_24h?: number;
        circulating_supply?: number | null;
        total_supply?: number | null;
      }>;
      console.log("🚀 ~ TokenService ~ getTokensByCategoryFromCoinGecko ~ coinsData:", coinsData)

      // Filter gainers/losers if needed
      let filteredCoins = coinsData;
      if (category === 'gainers') {
        filteredCoins = coinsData.filter(c => (c.price_change_percentage_24h || 0) > 0);
      } else if (category === 'losers') {
        filteredCoins = coinsData.filter(c => (c.price_change_percentage_24h || 0) < 0);
      }

      // Limit results
      const limitedCoins = filteredCoins.slice(0, limit);

      // Map directly to NormalizedToken - skip DexScreener/Chainbase enrichment for speed
      // CoinGecko markets API already provides price, volume, market cap, price change
      const tokens: NormalizedToken[] = limitedCoins.map((coin) => {
        // Default to Ethereum chain ID 1 for display (CoinGecko markets API doesn't return platform info)
        const chainId = 1;
        const chain = getCanonicalChain(chainId);

        return {
          chainId,
          address: coin.id, // Use CoinGecko ID as address for market listings
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          decimals: undefined,
          logoURI: coin.image || '',
          priceUSD: coin.current_price?.toString() || '0',
          providers: ['coingecko'],
          verified: true,
          vmType: chain?.type === 'EVM' ? 'evm' : chain?.type?.toLowerCase(),
          chainBadge: chain?.name?.toLowerCase() || 'ethereum',
          chainName: chain?.name || 'Ethereum',
          volume24h: coin.total_volume || 0,
          marketCap: coin.market_cap || 0,
          priceChange24h: coin.price_change_percentage_24h || 0,
          marketCapRank: (coin.market_cap_rank != null && coin.market_cap_rank > 0) ? coin.market_cap_rank : undefined,
          circulatingSupply: (coin.circulating_supply != null && coin.circulating_supply > 0) ? coin.circulating_supply : undefined,
        };
      });

      // Filter by chain IDs if specified
      let filteredTokens = tokens;
      if (chainIds && chainIds.length > 0) {
        filteredTokens = tokens.filter(token => chainIds.includes(token.chainId));
      }

      // Ensure TWC token for "hot" category
      const TWC_ADDRESS = '0xDA1060158F7D593667cCE0a15DB346BB3FfB3596';
      const TWC_CHAIN_ID = 56;

      if (category === 'hot' && (!chainIds || chainIds.length === 0 || chainIds.includes(TWC_CHAIN_ID))) {
        const hasTWC = filteredTokens.some(t =>
          t.address.toLowerCase() === TWC_ADDRESS.toLowerCase() && t.chainId === TWC_CHAIN_ID
        );

        if (!hasTWC || !filteredTokens.find(t =>
          t.address.toLowerCase() === TWC_ADDRESS.toLowerCase() && t.chainId === TWC_CHAIN_ID
        )?.marketCapRank) {
          try {
            const twcContractUrl = `https://api.coingecko.com/api/v3/coins/binance-smart-chain/contract/${TWC_ADDRESS}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
            const twcResponse = await fetch(twcContractUrl, { headers });

            if (twcResponse.ok) {
              const twcData = await twcResponse.json() as {
                id: string;
                symbol: string;
                name: string;
                image?: { large?: string; small?: string; thumb?: string };
                market_data?: {
                  current_price?: { usd?: number };
                  market_cap?: { usd?: number };
                  market_cap_rank?: number | null;
                  total_volume?: { usd?: number };
                  price_change_percentage_24h?: number;
                  circulating_supply?: number | null;
                };
              };

              if (twcData?.market_data) {
                const chain = getCanonicalChain(TWC_CHAIN_ID);
                if (chain) {
                  const twcToken: NormalizedToken = {
                    chainId: TWC_CHAIN_ID,
                    address: TWC_ADDRESS,
                    symbol: twcData.symbol.toUpperCase(),
                    name: twcData.name,
                    decimals: undefined,
                    logoURI: twcData.image?.large || twcData.image?.small || twcData.image?.thumb || '',
                    priceUSD: twcData.market_data.current_price?.usd?.toString() || '0',
                    providers: ['coingecko'],
                    verified: true,
                    vmType: 'evm',
                    chainBadge: chain.name.toLowerCase(),
                    chainName: chain.name,
                    volume24h: twcData.market_data.total_volume?.usd || 0,
                    marketCap: twcData.market_data.market_cap?.usd || 0,
                    priceChange24h: twcData.market_data.price_change_percentage_24h || 0,
                    marketCapRank: (twcData.market_data.market_cap_rank != null && twcData.market_data.market_cap_rank > 0)
                      ? twcData.market_data.market_cap_rank : undefined,
                    circulatingSupply: (twcData.market_data.circulating_supply != null && twcData.market_data.circulating_supply > 0)
                      ? twcData.market_data.circulating_supply : undefined,
                  };

                  const existingTWCIndex = filteredTokens.findIndex(t =>
                    t.address.toLowerCase() === TWC_ADDRESS.toLowerCase() && t.chainId === TWC_CHAIN_ID
                  );
                  if (existingTWCIndex >= 0) {
                    filteredTokens[existingTWCIndex] = twcToken;
                  } else {
                    filteredTokens.push(twcToken);
                  }
                }
              }
            }
          } catch (error) {
            console.warn('[TokenService] Error fetching TWC token:', error);
          }
        }
      }
      
      // Final sort based on category (in case API ordering wasn't perfect)
      // CRITICAL: TWC token should always be first in "hot" category
      let sortedTokens = [...filteredTokens];
      switch (category) {
        case 'hot':
          // Sort by volume, but ensure TWC is always first
          sortedTokens.sort((a, b) => {
            // TWC always goes first
            const aIsTWC = a.address.toLowerCase() === TWC_ADDRESS.toLowerCase() && a.chainId === TWC_CHAIN_ID;
            const bIsTWC = b.address.toLowerCase() === TWC_ADDRESS.toLowerCase() && b.chainId === TWC_CHAIN_ID;
            
            if (aIsTWC && !bIsTWC) return -1; // TWC first
            if (!aIsTWC && bIsTWC) return 1;  // TWC first
            if (aIsTWC && bIsTWC) return 0;   // Both TWC, keep order
            
            // Otherwise sort by volume
            return (b.volume24h || 0) - (a.volume24h || 0);
          });
          
          // Ensure TWC is at the front (in case it wasn't sorted correctly)
          const twcIndex = sortedTokens.findIndex(t => 
            t.address.toLowerCase() === TWC_ADDRESS.toLowerCase() && t.chainId === TWC_CHAIN_ID
          );
          if (twcIndex > 0) {
            const [twcToken] = sortedTokens.splice(twcIndex, 1);
            sortedTokens.unshift(twcToken);
          }
          break;
        case 'gainers':
          sortedTokens = sortedTokens.filter(t => (t.priceChange24h || 0) > 0);
          sortedTokens.sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0));
          break;
        case 'losers':
          sortedTokens = sortedTokens.filter(t => (t.priceChange24h || 0) < 0);
          sortedTokens.sort((a, b) => (a.priceChange24h || 0) - (b.priceChange24h || 0));
          break;
        case 'new':
          // Sort by market cap rank (lower rank = newer/higher)
          sortedTokens.sort((a, b) => {
            // Use volume as proxy for newness if we don't have creation date
            return (b.volume24h || 0) - (a.volume24h || 0);
          });
          break;
      }

      return sortedTokens.slice(0, limit);
    } catch (error: any) {
      console.error('[TokenService] Error fetching tokens from CoinGecko:', error);
      return [];
    }
  }

  /**
   * Get market pairs by category (Hot, New, Gainers, Losers)
   * 
   * Returns full MarketTokenPair[] with both base and quote tokens.
   * This is the preferred method for market table data as it provides
   * complete pair information including both tokens.
   * 
   * @param category - Market category: 'hot', 'new', 'gainers', or 'losers'
   * @param limit - Maximum number of pairs to return (default: 30)
   * @param network - Optional network slug (e.g., 'solana', 'eth') for network-specific requests
   * @returns Array of MarketTokenPair objects
   */
  async getMarketPairsByCategory(
    category: 'hot' | 'new' | 'gainers' | 'losers',
    limit: number = 30,
    network?: string,
    page: number = 1
  ): Promise<MarketTokenPair[]> {
    try {
      // Use PoolMarketService to fetch market pairs
      const pairs = await this.poolMarketService.getMarketPairsByCategory(
        category,
        limit,
        network,
        page
      );
      
      return pairs;
    } catch (error: any) {
      console.error('[TokenService] Error fetching market pairs by category:', error);
      // Return empty array on error (graceful degradation)
      return [];
    }
  }

  /**
   * Fallback: Get tokens by category from DexScreener
   */
  private async getTokensByCategoryFromDexScreener(
    category: 'hot' | 'new' | 'gainers' | 'losers',
    limit: number = 30
  ): Promise<NormalizedToken[]> {
    try {
      const dexscreenerProvider = new DexScreenerProvider();
      
      // Get major supported chains
      const majorChainIds = [
        56,    // BNB Chain
        1,     // Ethereum
        137,   // Polygon
        42161, // Arbitrum
        10,    // Optimism
        8453,  // Base
        43114, // Avalanche
      ];

      // Fetch pairs from DexScreener for all chains
      const allPairs: Array<{
        pair: any;
        chainId: number;
      }> = [];

      for (const chainId of majorChainIds) {
        try {
          const chain = getCanonicalChain(chainId);
          if (!chain) continue;
          
          const dexChainId = dexscreenerProvider.getChainId(chain);
          if (!dexChainId) continue;

          // Fetch pairs for this chain
          const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(String(dexChainId))}`;
          const response = await fetch(url);
          
          if (!response.ok) continue;
          
          const data = await response.json();
          if (data.pairs && Array.isArray(data.pairs)) {
            const chainPairs = data.pairs
              .filter((p: any) => p.chainId === String(dexChainId))
              .map((pair: any) => ({ pair, chainId }));
            allPairs.push(...chainPairs);
          }
        } catch (error) {
          console.warn(`[TokenService] Error fetching pairs for chain ${chainId}:`, error);
          continue;
        }
      }

      // Sort pairs based on category
      let sortedPairs = [...allPairs];
      
      switch (category) {
        case 'hot':
          // Sort by 24h volume (highest first)
          sortedPairs.sort((a, b) => {
            const volA = a.pair.volume?.h24 || 0;
            const volB = b.pair.volume?.h24 || 0;
            return volB - volA;
          });
          break;
        case 'gainers':
          // Sort by 24h price change (highest positive first)
          sortedPairs.sort((a, b) => {
            const changeA = a.pair.priceChange?.h24 || 0;
            const changeB = b.pair.priceChange?.h24 || 0;
            return changeB - changeA; // Descending (highest first)
          });
          // Filter to only positive changes
          sortedPairs = sortedPairs.filter(p => (p.pair.priceChange?.h24 || 0) > 0);
          break;
        case 'losers':
          // Sort by 24h price change (lowest/negative first)
          sortedPairs.sort((a, b) => {
            const changeA = a.pair.priceChange?.h24 || 0;
            const changeB = b.pair.priceChange?.h24 || 0;
            return changeA - changeB; // Ascending (lowest first)
          });
          // Filter to only negative changes
          sortedPairs = sortedPairs.filter(p => (p.pair.priceChange?.h24 || 0) < 0);
          break;
        case 'new':
          // Sort by pair creation time (most recent first)
          sortedPairs.sort((a, b) => {
            const timeA = a.pair.pairCreatedAt || 0;
            const timeB = b.pair.pairCreatedAt || 0;
            return timeB - timeA; // Descending (newest first)
          });
          break;
      }

      // CRITICAL: Token → Pairs → Pool Reserves → USD value
      // Aggregate tokens from pairs, summing liquidity from ALL pairs per token
      const tokenMap = new Map<string, {
        chainId: number;
        address: string;
        symbol: string;
        name: string;
        logoURI: string;
        priceUSD: string;
        liquidity: number;
        volume24h: number;
        priceChange24h: number;
        marketCap: number;
        holders: number;
        pairCount: number;
      }>();

      // Process pairs and aggregate by token
      for (const { pair, chainId } of sortedPairs.slice(0, limit * 3)) {
        // Process base token
        const baseKey = `${chainId}:${pair.baseToken.address.toLowerCase()}`;
        const baseLiquidity = pair.liquidity?.usd || 0;
        const baseVolume = pair.volume?.h24 || 0;
        const basePriceChange = pair.priceChange?.h24 || 0;
        const traders = pair.txns?.h24 ? (pair.txns.h24.buys + pair.txns.h24.sells) : 0;
        
        if (baseLiquidity > 0 && pair.baseToken.address && pair.baseToken.symbol) {
          const existing = tokenMap.get(baseKey);
          if (existing) {
            // Aggregate: Sum liquidity from ALL pairs (Token → Pairs → Pool Reserves → USD value)
            existing.liquidity += baseLiquidity;
            existing.volume24h += baseVolume;
            existing.holders = Math.max(existing.holders, traders); // Use max traders as proxy for holders
            existing.pairCount += 1;
            // Use most recent price change
            if (Math.abs(basePriceChange) > Math.abs(existing.priceChange24h)) {
              existing.priceChange24h = basePriceChange;
            }
          } else {
            tokenMap.set(baseKey, {
              chainId,
              address: pair.baseToken.address,
              symbol: pair.baseToken.symbol,
              name: pair.baseToken.name,
              logoURI: pair.info?.imageUrl || '',
              priceUSD: pair.priceUsd || '0',
              liquidity: baseLiquidity,
              volume24h: baseVolume,
              priceChange24h: basePriceChange,
              marketCap: pair.fdv || 0,
              holders: traders,
              pairCount: 1,
            });
          }
        }
      }

      // Convert to NormalizedToken array
      const tokens: NormalizedToken[] = [];
      const sortedTokens = Array.from(tokenMap.values())
        .sort((a, b) => {
          // Sort by category criteria
          switch (category) {
            case 'hot':
              return b.volume24h - a.volume24h;
            case 'gainers':
              return b.priceChange24h - a.priceChange24h;
            case 'losers':
              return a.priceChange24h - b.priceChange24h;
            case 'new':
              return b.pairCount - a.pairCount; // More pairs = newer/more active
            default:
              return b.liquidity - a.liquidity;
          }
        });

      for (const tokenData of sortedTokens.slice(0, limit)) {
        const chain = getCanonicalChain(tokenData.chainId);
        if (!chain) continue;

        const normalized = dexscreenerProvider.normalizeToken({
          chainId: tokenData.chainId,
          address: tokenData.address,
          symbol: tokenData.symbol,
          name: tokenData.name,
          decimals: undefined,
          logoURI: tokenData.logoURI,
        } as any, chain);

        // Add aggregated fields
        normalized.priceUSD = tokenData.priceUSD;
        normalized.liquidity = tokenData.liquidity;
        normalized.volume24h = tokenData.volume24h;
        normalized.priceChange24h = tokenData.priceChange24h;
        normalized.marketCap = tokenData.marketCap;
        normalized.holders = tokenData.holders;
        normalized.logoURI = tokenData.logoURI || normalized.logoURI || '';

        console.log(`[DEBUG] Token ${tokenData.symbol}: liquidity=$${tokenData.liquidity.toLocaleString()}, pairs=${tokenData.pairCount}, volume=$${tokenData.volume24h.toLocaleString()}`);

        tokens.push(normalized);
      }

      return tokens;
    } catch (error: any) {
      console.error('[TokenService] Error fetching tokens by category from DexScreener:', error);
      return [];
    }
  }

  /**
   * Enrich 1inch tokens with DexScreener data (price, liquidity, volume, holders/traders)
   */
  private async enrichTokensWithDexScreener(
    tokens: ProviderToken[]
  ): Promise<ProviderToken[]> {
    const dexscreenerProvider = new DexScreenerProvider();
    const enrichedTokens: ProviderToken[] = [];

    // Enrich tokens in parallel (with rate limiting)
    const enrichPromises = tokens.map(async (token) => {
      try {
        const chain = typeof token.chainId === 'number' ? getCanonicalChain(token.chainId) : null;
        if (!chain) return token;

        const dexChainId = dexscreenerProvider.getChainId(chain);
        if (!dexChainId) return token;

        // Fetch token pairs from DexScreener token-pairs endpoint using mapped chain id
        // Example: https://api.dexscreener.com/token-pairs/v1/ethereum/0x...
        const url = `https://api.dexscreener.com/token-pairs/v1/${dexChainId}/${token.address}`;
        const response = await fetch(url);
        
        if (!response.ok) return token;
        
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          return token;
        }

        // Take the first pair result as the primary source for enrichment
        const topPair = data[0];

        // Enrich token with DexScreener data
        const enriched: ProviderToken = {
          ...token,
          priceUSD: topPair.priceUsd || token.priceUSD || '0',
          volume24h: topPair.volume?.h24 || token.volume24h,
          liquidity: topPair.liquidity?.usd || token.liquidity,
          priceChange24h: topPair.priceChange?.h24 || token.priceChange24h,
          // Holders will be enriched from Chainbase (fallback to transaction count if unavailable)
          holders: token.holders, // Will be enriched separately
          // Use DexScreener image URL only as a fallback – primary logo comes from 1inch
          logoURI: token.logoURI || topPair.info?.imageUrl || token.logoURI || '',
          marketCap: topPair.marketCap || topPair.fdv || token.marketCap,
          // Store transaction count for fallback
          transactionCount: topPair.txns?.h24 ? (topPair.txns.h24.buys + topPair.txns.h24.sells) : token.transactionCount,
        };

        // Enrich holder count from Chainbase (with fallback to transaction count)
        if (typeof enriched.chainId === 'number' && enriched.address) {
          const holderCount = await getTokenHoldersCount(
            enriched.chainId,
            enriched.address
          );
          if (holderCount !== null && holderCount > 0) {
            enriched.holders = holderCount;
          } else {
            // Fallback to transaction count
            enriched.holders = enriched.transactionCount;
          }
        }

        return enriched;
      } catch (error) {
        console.warn(`[TokenService] Error enriching token ${token.symbol}:`, error);
        return token;
      }
    });

    const results = await Promise.all(enrichPromises);
    enrichedTokens.push(...results);

    return enrichedTokens;
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
              transactionCount: dexToken.transactionCount || token.transactionCount,
            };

            // Enrich holder count from Chainbase (with fallback to transaction count)
            const holderCount = await getTokenHoldersCount(
              token.chainId,
              token.address
            );
            if (holderCount !== null && holderCount > 0) {
              enrichedToken.holders = holderCount;
            } else {
              // Fallback to transaction count
              enrichedToken.holders = enrichedToken.transactionCount;
            }
            
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
          const { getTokenHoldersCount } = await import('@/lib/backend/utils/chainbase-client');
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

          // Enrich holder count from Chainbase (with fallback to transaction count)
          const holderCount = await getTokenHoldersCount(
            token.chainId,
            token.address
          );
          if (holderCount !== null && holderCount > 0) {
            enrichedToken.holders = holderCount;
          } else {
            // Fallback to transaction count
            enrichedToken.holders = enrichedToken.transactionCount;
          }
          
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
        // Ensure chainId is a number
        const chainId = typeof providerToken.chainId === 'number' 
          ? providerToken.chainId 
          : typeof providerToken.chainId === 'string'
          ? parseInt(providerToken.chainId, 10)
          : undefined;
        
        if (!chainId || isNaN(chainId)) {
          console.warn(`[TokenService] Invalid chainId for token ${providerToken.symbol}: ${providerToken.chainId}`);
          continue;
        }
        
        const chain = getCanonicalChain(chainId);
        if (!chain) {
          console.warn(`[TokenService] Chain ${chainId} not found for token ${providerToken.symbol}`);
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

