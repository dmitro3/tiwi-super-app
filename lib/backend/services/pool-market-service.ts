/**
 * Pool Market Service
 *
 * Fetches pool/pair-based market data from CoinGecko Onchain APIs
 * and returns MarketTokenPair objects with both base and quote tokens.
 *
 * Design goals:
 * - CoinGecko is the primary source for pool data, volume, liquidity, price changes.
 * - DexScreener is used for price enrichment with chainId and dexId validation.
 * - Supports both network-specific and cross-chain endpoints.
 * - Category semantics:
 *   - "hot"    → trending_pools
 *   - "new"    → new_pools
 *   - "gainers"→ trending_pools sorted by 24h change desc, > 0
 *   - "losers" → trending_pools sorted by 24h change asc, < 0
 */

import type { NormalizedToken, MarketToken, MarketTokenPair } from '@/lib/backend/types/backend-tokens';
import { getCanonicalChain } from '@/lib/backend/registry/chains';
import { getCache, CACHE_TTL } from '@/lib/backend/utils/cache';
import { getTokenHoldersCount } from '@/lib/backend/utils/chainbase-client';

import { CHAIN_ID_TO_COINGECKO_ID, COINGECKO_ID_TO_CHAIN_ID } from '@/lib/shared/constants/coingecko-networks';

// CoinGecko onchain base URL
const COINGECKO_ONCHAIN_BASE = 'https://api.coingecko.com/api/v3/onchain';

/**
 * Map canonical chain IDs to CoinGecko onchain network slugs.
 * Now derived from the shared constant for consistency.
 */
const COINGECKO_NETWORK_BY_CHAIN: Record<number, string> = CHAIN_ID_TO_COINGECKO_ID;

const CHAIN_BY_COINGECKO_NETWORK: Record<string, number> = COINGECKO_ID_TO_CHAIN_ID;


// Map CoinGecko network names to DexScreener chain slugs
const COINGECKO_TO_DEXSCREENER_CHAIN: Record<string, string> = {
  'eth': 'ethereum',
  'bsc': 'bsc',
  'polygon': 'polygon',
  'arbitrum': 'arbitrum',
  'optimism': 'optimism',
  'base': 'base',
  'avax': 'avalanche',
  'solana': 'solana',
};

type Category = 'hot' | 'new' | 'gainers' | 'losers';

// ============================================================================
// CoinGecko API Types
// ============================================================================

interface CoingeckoPoolAttributes {
  base_token_price_usd?: string;
  base_token_price_native_currency?: string;
  quote_token_price_usd?: string;
  quote_token_price_native_currency?: string;
  base_token_price_quote_token?: string;
  quote_token_price_base_token?: string;
  address: string;
  name: string;
  pool_created_at?: string;
  fdv_usd?: string;
  market_cap_usd?: string;
  price_change_percentage?: {
    m5?: string;
    m15?: string;
    m30?: string;
    h1?: string;
    h6?: string;
    h24?: string;
  };
  transactions?: {
    m5?: { buys?: number; sells?: number; buyers?: number; sellers?: number };
    m15?: { buys?: number; sells?: number; buyers?: number; sellers?: number };
    m30?: { buys?: number; sells?: number; buyers?: number; sellers?: number };
    h1?: { buys?: number; sells?: number; buyers?: number; sellers?: number };
    h6?: { buys?: number; sells?: number; buyers?: number; sellers?: number };
    h24?: { buys?: number; sells?: number; buyers?: number; sellers?: number };
  };
  volume_usd?: {
    m5?: string;
    m15?: string;
    m30?: string;
    h1?: string;
    h6?: string;
    h24?: string;
  };
  reserve_in_usd?: string;
}

interface CoingeckoRelationshipData {
  id: string;
  type: string;
}

interface CoingeckoPool {
  id: string;
  type: 'pool';
  attributes: CoingeckoPoolAttributes;
  relationships: {
    base_token?: { data?: CoingeckoRelationshipData | null };
    quote_token?: { data?: CoingeckoRelationshipData | null };
    network?: { data?: CoingeckoRelationshipData | null };
    dex?: { data?: CoingeckoRelationshipData | null };
  };
}

interface CoingeckoTokenAttributes {
  address?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  image_url?: string;
  coingecko_coin_id?: string;
}

interface CoingeckoDexAttributes {
  name?: string;
}

interface CoingeckoNetworkAttributes {
  name?: string;
  coingecko_asset_platform_id?: string;
}

interface CoingeckoIncludedItem {
  id: string;
  type: 'token' | 'dex' | 'network';
  attributes: CoingeckoTokenAttributes | CoingeckoDexAttributes | CoingeckoNetworkAttributes;
}

interface CoingeckoPoolsResponse {
  data: CoingeckoPool[];
  included?: CoingeckoIncludedItem[];
}

// ============================================================================
// DexScreener API Types
// ============================================================================

interface DexScreenerPair {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  priceUsd?: string;
  baseToken?: {
    address?: string;
    symbol?: string;
  };
  quoteToken?: {
    address?: string;
    symbol?: string;
  };
  info?: {
    imageUrl?: string;
  };
}

interface DexScreenerResponse {
  pairs?: DexScreenerPair[];
}

// ============================================================================
// Pool Market Service
// ============================================================================

export class PoolMarketService {
  private cache = getCache();
  private static readonly CACHE_TTL_MS = CACHE_TTL.PRICES; // 60s

  /**
   * Get market pairs by category (returns MarketTokenPair[])
   * This is the new method that returns full pair data with both tokens.
   */
  async getMarketPairsByCategory(
    category: Category,
    limit: number = 30,
    network?: string, // If provided, fetch for specific network; otherwise cross-chain
    page: number = 1
  ): Promise<MarketTokenPair[]> {
    let allPairs: MarketTokenPair[] = [];

    if (network) {
      // Network-specific endpoint
      const pairs = await this.fetchMarketPairsForNetwork(network, category, page);
      allPairs = pairs;
    } else {
      // Cross-chain endpoint
      const pairs = await this.fetchMarketPairsCrossChain(category, page);
      allPairs = pairs;
    }

    // Derive gainers/losers from trending pools by sorting
    const sortedPairs =
      category === 'gainers'
        ? allPairs
            .filter((p) => (p.priceChange24h || 0) > 0)
            .sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0))
        : category === 'losers'
        ? allPairs
            .filter((p) => (p.priceChange24h || 0) < 0)
            .sort((a, b) => (a.priceChange24h || 0) - (b.priceChange24h || 0))
        : category === 'hot'
        ? allPairs.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
        : category === 'new'
        ? allPairs.sort((a, b) => {
            const aTime = a.poolCreatedAt ? new Date(a.poolCreatedAt).getTime() : 0;
            const bTime = b.poolCreatedAt ? new Date(b.poolCreatedAt).getTime() : 0;
            return bTime - aTime;
          })
        : allPairs;

    // Limit results
    return sortedPairs.slice(0, limit);
  }

  /**
   * Legacy method: get category-based "token rows" for the market table.
   * Returns NormalizedToken[] representing base tokens only.
   * Kept for backward compatibility.
   */
  async getTokensByCategory(
    category: Category,
    limit: number = 30
  ): Promise<NormalizedToken[]> {
    // For now, we aggregate across the core networks we mapped above.
    const networkSlugs = Object.values(COINGECKO_NETWORK_BY_CHAIN);

    const allTokens: NormalizedToken[] = [];

    for (const network of networkSlugs) {
      const chainId = CHAIN_BY_COINGECKO_NETWORK[network];
      if (!chainId) continue;

      const poolsResponse = await this.fetchPoolsForNetworkWithIncluded(network, category);
      const pools = poolsResponse.pools;
      const included = poolsResponse.included;

      // Derive gainers/losers from trending pools by sorting
      const sortedPools =
        category === 'gainers'
          ? pools
              .filter((p) => this.getPriceChange24h(p) > 0)
              .sort(
                (a, b) => this.getPriceChange24h(b) - this.getPriceChange24h(a)
              )
          : category === 'losers'
          ? pools
              .filter((p) => this.getPriceChange24h(p) < 0)
              .sort(
                (a, b) => this.getPriceChange24h(a) - this.getPriceChange24h(b)
              )
          : pools;

      const limitedPools = sortedPools.slice(0, limit);
      const tokensForNetwork = this.normalizePoolsToTokens(
        limitedPools,
        chainId,
        network,
        included
      );

      allTokens.push(...tokensForNetwork);
    }

    // Sort "hot" by volume across networks, "new" by pool_created_at (desc)
    if (category === 'hot') {
      allTokens.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
    } else if (category === 'new') {
      allTokens.sort((a, b) => {
        const aTime = (a as any).poolCreatedAt
          ? new Date((a as any).poolCreatedAt).getTime()
          : 0;
        const bTime = (b as any).poolCreatedAt
          ? new Date((b as any).poolCreatedAt).getTime()
          : 0;
        return bTime - aTime;
      });
    }

    // Deduplicate by chainId+address and cap final list
    const seen = new Set<string>();
    const deduped: NormalizedToken[] = [];
    for (const token of allTokens) {
      const key = `${token.chainId}:${token.address.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(token);
      if (deduped.length >= limit) break;
    }

    // Enrich with logos from DexScreener (best-effort, rate-limited via cache + cap)
    const enriched = await this.enrichLogosWithDexScreener(deduped);

    return enriched;
  }

  // ============================================================================
  // Private helpers for MarketTokenPair
  // ============================================================================

  /**
   * Fetch market pairs for a specific network (network-specific endpoint)
   */
  private async fetchMarketPairsForNetwork(
    network: string,
    category: Category,
    page: number = 1
  ): Promise<MarketTokenPair[]> {
    const cacheKey = `cg:pairs:${network}:${category}:page:${page}`;
    const cached = this.cache.get<MarketTokenPair[]>(cacheKey);
    if (cached) return cached;

    const apiKey =
      process.env.COINGECKO_API_KEY ||
      process.env.COINGECKO_DEMO_API_KEY ||
      process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const baseEndpoint =
      category === 'new'
        ? `${COINGECKO_ONCHAIN_BASE}/networks/${network}/new_pools`
        : `${COINGECKO_ONCHAIN_BASE}/networks/${network}/trending_pools`;

    const endpoint = `${baseEndpoint}?include=base_token,quote_token,dex,network&page=${page}`;

    try {
      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        console.warn(
          `[PoolMarketService] CoinGecko ${category} pools failed for ${network}:`,
          res.status,
          res.statusText
        );
        return [];
      }

      const json = (await res.json()) as CoingeckoPoolsResponse;
      const pairs = await this.parsePoolsToMarketPairs(json, network);

      this.cache.set(cacheKey, pairs, PoolMarketService.CACHE_TTL_MS);
      return pairs;
    } catch (error) {
      console.error(
        `[PoolMarketService] Error fetching CoinGecko pools for ${network} (${category}):`,
        error
      );
      return [];
    }
  }

  /**
   * Fetch market pairs across all chains (cross-chain endpoint)
   */
  private async fetchMarketPairsCrossChain(
    category: Category,
    page: number = 1
  ): Promise<MarketTokenPair[]> {
    const cacheKey = `cg:pairs:crosschain:${category}:page:${page}`;
    const cached = this.cache.get<MarketTokenPair[]>(cacheKey);
    if (cached) return cached;

    const apiKey =
      process.env.COINGECKO_API_KEY ||
      process.env.COINGECKO_DEMO_API_KEY ||
      process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const endpoint = `${COINGECKO_ONCHAIN_BASE}/networks/trending_pools?include=base_token,quote_token,dex,network&page=${page}`;
    try {
      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        console.warn(
          `[PoolMarketService] CoinGecko cross-chain ${category} pools failed:`,
          res.status,
          res.statusText
        );
        return [];
      }

      const json = (await res.json()) as CoingeckoPoolsResponse;
      const pairs = await this.parsePoolsToMarketPairs(json);

      this.cache.set(cacheKey, pairs, PoolMarketService.CACHE_TTL_MS);
      return pairs;
    } catch (error) {
      console.error(
        `[PoolMarketService] Error fetching CoinGecko cross-chain pools (${category}):`,
        error
      );
      return [];
    }
  }

  /**
   * Parse CoinGecko pools response to MarketTokenPair[]
   * Handles the included array to match tokens, dex, and network to pools
   */
  private async parsePoolsToMarketPairs(
    response: CoingeckoPoolsResponse,
    defaultNetworkId?: string
  ): Promise<MarketTokenPair[]> {
    const { data: pools, included = [] } = response;

    // Build lookup maps from included array
    const tokensMap = new Map<string, CoingeckoTokenAttributes>();
    const dexMap = new Map<string, CoingeckoDexAttributes>();
    const networkMap = new Map<string, CoingeckoNetworkAttributes>();

    for (const item of included) {
      if (item.type === 'token') {
        tokensMap.set(item.id, item.attributes as CoingeckoTokenAttributes);
      } else if (item.type === 'dex') {
        dexMap.set(item.id, item.attributes as CoingeckoDexAttributes);
      } else if (item.type === 'network') {
        networkMap.set(item.id, item.attributes as CoingeckoNetworkAttributes);
      }
    }

    const pairs: MarketTokenPair[] = [];

    for (const pool of pools) {
      const baseTokenId = pool.relationships.base_token?.data?.id;
      const quoteTokenId = pool.relationships.quote_token?.data?.id;
      const dexId = pool.relationships.dex?.data?.id;

      // Fallback for networkId: 
      // 1. Explicit relationship
      // 2. Prefix from pool ID (e.g. "polygon_pos_0x..." -> "polygon_pos")
      // 3. The default network for the current request context
      let networkId = pool.relationships.network?.data?.id;
      if (!networkId && pool.id.includes('_0x')) {
        // Find the split between network and address (e.g. polygon_pos_0x...)
        networkId = pool.id.substring(0, pool.id.lastIndexOf('_'));
      }
      if (!networkId) {
        networkId = defaultNetworkId;
      }

      if (!baseTokenId || !quoteTokenId || !networkId) {
        console.warn(
          `[PoolMarketService] Missing required relationships for pool ${pool.id}. baseTokenId: ${baseTokenId}, quoteTokenId: ${quoteTokenId}, networkId: ${networkId}`
        );
        continue;
      }


      const baseTokenAttrs = tokensMap.get(baseTokenId);
      const quoteTokenAttrs = tokensMap.get(quoteTokenId);
      const dexAttrs = dexMap.get(dexId || '');

      if (!baseTokenAttrs || !quoteTokenAttrs) {
        console.warn(
          `[PoolMarketService] Missing token data for pool ${pool.id}. base: ${!!baseTokenAttrs}, quote: ${!!quoteTokenAttrs}`
        );
        continue;
      }

      // Map network name to canonical chain ID
      let chainId = CHAIN_BY_COINGECKO_NETWORK[networkId];
      let chainName = networkId.charAt(0).toUpperCase() + networkId.slice(1);
      let chainLogo = '';

      const canonicalChain = chainId ? getCanonicalChain(chainId) : null;
      if (canonicalChain) {
        chainName = canonicalChain.name;
        chainLogo = canonicalChain.logoURI || '';
      } else {
        // For unknown chains, assign a temporary negative ID based on network string hash
        // This ensures they still show up and are filterable without crashing the app
        if (!chainId) {
          chainId = this.hashStringToInt(networkId);
          console.info(`[PoolMarketService] Dynamic chain resolved: ${networkId} -> ${chainId}`);
        }
      }

      // Clean pool name (remove percentages)
      const cleanedPoolName = this.cleanPoolName(pool.attributes.name);

      // Extract prices from CoinGecko pool data
      const baseTokenPriceUSD = pool.attributes.base_token_price_usd || '0';
      const quoteTokenPriceUSD = pool.attributes.quote_token_price_usd || '0';
      const pairPrice = pool.attributes.base_token_price_quote_token || '0';

      const chainBadge = chainName.toLowerCase().replace(/\s+/g, '-');

      // Create base and quote tokens with CoinGecko prices
      const baseToken: MarketToken = {
        chainId,
        address: baseTokenAttrs.address || '',
        symbol: baseTokenAttrs.symbol || '',
        name: baseTokenAttrs.name || '',
        decimals: baseTokenAttrs.decimals ?? 18,
        logoURI: baseTokenAttrs.image_url || '',
        priceUSD: baseTokenPriceUSD, // From CoinGecko pool data
        verified: false,
        chainBadge,
        chainName,
      };

      const quoteToken: MarketToken = {
        chainId,
        address: quoteTokenAttrs.address || '',
        symbol: quoteTokenAttrs.symbol || '',
        name: quoteTokenAttrs.name || '',
        decimals: quoteTokenAttrs.decimals ?? 18,
        logoURI: quoteTokenAttrs.image_url || '',
        priceUSD: quoteTokenPriceUSD, // From CoinGecko pool data
        verified: false,
        chainBadge,
        chainName,
      };

      // Extract pool metrics
      const volume24h = Number(pool.attributes.volume_usd?.h24 ?? '0');
      const liquidity = Number(pool.attributes.reserve_in_usd ?? '0');
      const priceChange24h = this.getPriceChange24h(pool);
      const marketCap = pool.attributes.market_cap_usd
        ? Number(pool.attributes.market_cap_usd)
        : pool.attributes.fdv_usd
        ? Number(pool.attributes.fdv_usd)
        : undefined;

      const tx = pool.attributes.transactions?.h24;
      const transactionCount = (tx?.buys ?? 0) + (tx?.sells ?? 0);

      // Format pair price display (e.g., "0.0227 USDC")
      const pairPriceDisplay = pairPrice && quoteToken.symbol
        ? `${Number(pairPrice).toFixed(6)} ${quoteToken.symbol}`
        : undefined;

      const pair: MarketTokenPair = {
        poolAddress: pool.attributes.address,
        poolName: cleanedPoolName,
        poolCreatedAt: pool.attributes.pool_created_at,
        baseToken,
        quoteToken,
        volume24h: volume24h || undefined,
        liquidity: liquidity || undefined,
        priceChange24h: priceChange24h || undefined,
        marketCap,
        holders: undefined, // Will be enriched from Chainbase
        transactionCount: transactionCount || undefined,
        chainId,
        chainName,
        chainBadge: chainName.toLowerCase().replace(/\s+/g, '-'),
        chainLogoURI: chainLogo || canonicalChain?.logoURI,
        dexId: dexId || undefined,
        pairPrice: pairPrice || undefined,
        pairPriceDisplay,
      };

      pairs.push(pair);
    }

    // Use transaction count as holder proxy (skip Chainbase API calls for speed)
    for (const pair of pairs) {
      if (!pair.holders && pair.transactionCount) {
        pair.holders = pair.transactionCount;
      }
    }

    return pairs;
  }

  /**
   * Simple hash function to generate a stable, unique number from a string.
   * Used for generating virtual chain IDs for networks not in our registry.
   */
  private hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Enrich holder counts from Chainbase API

   * Falls back to transaction count if Chainbase is unavailable or chain is unsupported
   * 
   * For each pair:
   * 1. Try to get holder count from Chainbase for baseToken
   * 2. If Chainbase fails or chain is unsupported, use transaction count as fallback
   */
  private async enrichHolderCountsFromChainbase(
    pairs: MarketTokenPair[]
  ): Promise<void> {
    const MAX_ENRICH_PER_CALL = 50; // Limit to avoid rate limits

    // Process pairs in batches to avoid rate limits
    const pairsToProcess = pairs.slice(0, MAX_ENRICH_PER_CALL);

    // Enrich holder counts for each pair
    await Promise.all(
      pairsToProcess.map(async (pair) => {
        // Try to get holder count from Chainbase for baseToken
        const holderCount = await getTokenHoldersCount(
          pair.chainId,
          pair.baseToken.address
        );

        if (holderCount !== null && holderCount > 0) {
          pair.holders = holderCount;
        } else {
          // Fallback to transaction count (buys + sells)
          // This is not actual holders, but active traders in 24h
          pair.holders = pair.transactionCount || undefined;
        }
      })
    );
  }

  /**
   * Clean pool name: remove percentages and trim spacing
   * Example: "ETH / USDC 0.05%" → "ETH / USDC"
   */
  private cleanPoolName(name: string): string {
    if (!name) return '';
    // Remove percentage patterns like "0.05%", " 0.05%", etc.
    return name.replace(/\s*\d+\.?\d*%\s*$/, '').trim();
  }

  // ============================================================================
  // Legacy helpers (for getTokensByCategory backward compatibility)
  // ============================================================================

  private async fetchPoolsForNetworkWithIncluded(
    network: string,
    category: Category
  ): Promise<{ pools: CoingeckoPool[]; included?: CoingeckoIncludedItem[] }> {
    const cacheKey = `cg:pools:${network}:${category}`;
    const cached = this.cache.get<{ pools: CoingeckoPool[]; included?: CoingeckoIncludedItem[] }>(cacheKey);
    if (cached) return cached;

    const apiKey =
      process.env.COINGECKO_API_KEY ||
      process.env.COINGECKO_DEMO_API_KEY ||
      process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const endpoint =
      category === 'new'
        ? `${COINGECKO_ONCHAIN_BASE}/networks/${network}/new_pools?include=base_token`
        : `${COINGECKO_ONCHAIN_BASE}/networks/${network}/trending_pools?include=base_token`;

    try {
      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        console.warn(
          `[PoolMarketService] CoinGecko ${category} pools failed for ${network}:`,
          res.status,
          res.statusText
        );
        return { pools: [] };
      }

      const json = (await res.json()) as CoingeckoPoolsResponse;
      const pools = Array.isArray(json.data) ? json.data : [];
      const included = json.included;

      const result = { pools, included };
      this.cache.set(cacheKey, result, PoolMarketService.CACHE_TTL_MS);
      return result;
    } catch (error) {
      console.error(
        `[PoolMarketService] Error fetching CoinGecko pools for ${network} (${category}):`,
        error
      );
      return { pools: [] };
    }
  }

  private async fetchPoolsForNetwork(
    network: string,
    category: Category
  ): Promise<CoingeckoPool[]> {
    const cacheKey = `cg:pools:${network}:${category}`;
    const cached = this.cache.get<CoingeckoPool[]>(cacheKey);
    if (cached) return cached;

    const apiKey =
      process.env.COINGECKO_API_KEY ||
      process.env.COINGECKO_DEMO_API_KEY ||
      process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const endpoint =
      category === 'new'
        ? `${COINGECKO_ONCHAIN_BASE}/networks/${network}/new_pools?include=base_token`
        : `${COINGECKO_ONCHAIN_BASE}/networks/${network}/trending_pools?include=base_token`;

    try {
      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        console.warn(
          `[PoolMarketService] CoinGecko ${category} pools failed for ${network}:`,
          res.status,
          res.statusText
        );
        return [];
      }

      const json = (await res.json()) as CoingeckoPoolsResponse;
      const pools = Array.isArray(json.data) ? json.data : [];

      this.cache.set(cacheKey, pools, PoolMarketService.CACHE_TTL_MS);
      return pools;
    } catch (error) {
      console.error(
        `[PoolMarketService] Error fetching CoinGecko pools for ${network} (${category}):`,
        error
      );
      return [];
    }
  }

  private getPriceChange24h(pool: CoingeckoPool): number {
    const raw = pool.attributes.price_change_percentage?.h24;
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  private normalizePoolsToTokens(
    pools: CoingeckoPool[],
    chainId: number,
    network: string,
    included?: CoingeckoIncludedItem[]
  ): NormalizedToken[] {
    const tokens: NormalizedToken[] = [];

    const canonicalChain = getCanonicalChain(chainId);
    if (!canonicalChain) return tokens;

    // Build token attributes map from included array
    const tokensMap = new Map<string, CoingeckoTokenAttributes>();
    if (included) {
      for (const item of included) {
        if (item.type === 'token') {
          tokensMap.set(item.id, item.attributes as CoingeckoTokenAttributes);
        }
      }
    }

    for (const pool of pools) {
      const attrs = pool.attributes;
      const priceUSD = Number(attrs.base_token_price_usd ?? '0');
      const volume24h = Number(attrs.volume_usd?.h24 ?? '0');
      const liquidity = Number(attrs.reserve_in_usd ?? '0');
      const priceChange24h = this.getPriceChange24h(pool);

      const tx = attrs.transactions?.h24;
      const buys = tx?.buys ?? 0;
      const sells = tx?.sells ?? 0;
      const buyers = tx?.buyers ?? 0;
      const transactionCount = buys + sells;

      const baseRel = pool.relationships.base_token?.data;
      const baseId = baseRel?.id || '';

      // Get base token attributes from included array
      const baseTokenAttrs = tokensMap.get(baseId);

      // Fallback: derive address from id like "eth_0x..." or "solana_<mint>"
      const [, derivedAddress] = baseId.split('_');
      const address = baseTokenAttrs?.address || derivedAddress || attrs.address;

      if (!address) continue;

      // Use base token symbol/name from included array, NOT pool name
      // Pool name is like "PENGUIN / SOL", but we want just "SOL" (or "PENGUIN" if it's the base)
      const tokenSymbol = baseTokenAttrs?.symbol || this.deriveSymbolFromPoolName(attrs.name);
      const tokenName = baseTokenAttrs?.name || tokenSymbol;
      const tokenLogoURI = baseTokenAttrs?.image_url || '';

      const token: NormalizedToken = {
        chainId,
        address,
        symbol: tokenSymbol, // Use actual token symbol, not pool name
        name: tokenName, // Use actual token name, not pool name
        decimals: baseTokenAttrs?.decimals, // Use decimals from token attributes if available
        logoURI: tokenLogoURI, // Use token logo from included array
        priceUSD: priceUSD.toString(),
        providers: ['coingecko'],
        verified: false,
        vmType: canonicalChain.type === 'EVM' ? 'evm' : undefined,
        chainBadge: canonicalChain.name.toLowerCase(),
        chainName: canonicalChain.name,
        volume24h: volume24h || undefined,
        liquidity: liquidity || undefined,
        marketCap: attrs.market_cap_usd
          ? Number(attrs.market_cap_usd)
          : attrs.fdv_usd
          ? Number(attrs.fdv_usd)
          : undefined,
        priceChange24h,
        holders: buyers || undefined, // approximate "holders" as 24h unique buyers
        transactionCount: transactionCount || undefined,
      };

      // Attach poolCreatedAt as non-typed metadata for "new" sorting
      (token as any).poolCreatedAt = attrs.pool_created_at;

      tokens.push(token);
    }

    return tokens;
  }

  /**
   * Best-effort logo enrichment:
   * - For tokens without logoURI, search DexScreener by token name.
   * - Take the first pair's info.imageUrl as the logo.
   * - Cache results by (chainId, name) to avoid repeated lookups.
   * - Hard-cap the number of logo lookups per call to avoid rate limits.
   */
  private async enrichLogosWithDexScreener(
    tokens: NormalizedToken[]
  ): Promise<NormalizedToken[]> {
    const MAX_ENRICH_PER_CALL = 30;
    const LOGO_TTL = 5 * 60 * 1000; // 5 minutes

    const result = [...tokens];
    const toEnrich = result
      .filter((t) => !t.logoURI)
      .slice(0, MAX_ENRICH_PER_CALL);

    await Promise.all(
      toEnrich.map(async (token) => {
        const lookupName = token.name || token.symbol;
        if (!lookupName) return;

        const cacheKey = `dexlogo:${token.chainId}:${lookupName.toLowerCase()}`;
        const cached = this.cache.get<string>(cacheKey);
        if (cached) {
          token.logoURI = cached;
          return;
        }

        try {
          const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(
            lookupName
          )}`;
          const res = await fetch(url);
          if (!res.ok) return;

          const data = (await res.json()) as DexScreenerResponse;
          // Find the first pair that has info.imageUrl (not just the first pair)
          const pairWithImage = Array.isArray(data.pairs)
            ? data.pairs.find((pair: DexScreenerPair) => pair.info?.imageUrl)
            : undefined;
          const imageUrl = pairWithImage?.info?.imageUrl;
          if (!imageUrl) return;

          token.logoURI = imageUrl;
          this.cache.set(cacheKey, imageUrl, LOGO_TTL);
        } catch (error) {
          console.warn(
            `[PoolMarketService] DexScreener logo lookup failed for ${lookupName} on chain ${token.chainId}:`,
            error
          );
        }
      })
    );

    return result;
  }

  /**
   * Very small helper to guess a symbol from pool name like "WETH / SOL" or "BlackBull / SOL".
   * We take the first segment before " / ".
   */
  private deriveSymbolFromPoolName(name?: string): string {
    if (!name) return '';
    const [first] = name.split('/').map((s) => s.trim());
    // If it already looks like a ticker (<= 12 chars, uppercase-ish), use as is.
    if (first && first.length <= 12) {
      return first.replace(/\s+/g, '');
    }
    return first;
  }
}

// Singleton
let poolMarketServiceInstance: PoolMarketService | null = null;

export function getPoolMarketService(): PoolMarketService {
  if (!poolMarketServiceInstance) {
    poolMarketServiceInstance = new PoolMarketService();
  }
  return poolMarketServiceInstance;
}
