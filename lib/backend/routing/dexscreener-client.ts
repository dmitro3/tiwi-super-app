/**
 * DexScreener API Client
 * 
 * Queries DexScreener API for token pairs.
 * Used for on-demand pair discovery.
 */

import type { Address } from 'viem';
import { isDEXSupported } from './dex-registry';

/**
 * DexScreener Pair Response
 */
export interface DexScreenerPair {
  chainId: string; // e.g., "bsc", "ethereum", "polygon"
  dexId: string; // e.g., "pancakeswap", "uniswap"
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
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  volume?: {
    h24?: number;
  };
  priceChange?: {
    h24?: number;
  };
}

/**
 * DexScreener API Response
 */
interface DexScreenerResponse {
  schemaVersion?: string;
  pairs: DexScreenerPair[];
}

/**
 * Map chain ID to DexScreener chain slug
 */
function getChainSlug(chainId: number): string {
  const chainMap: Record<number, string> = {
    1: 'ethereum',
    56: 'bsc',
    137: 'polygon',
    10: 'optimism',
    42161: 'arbitrum',
    8453: 'base',
    43114: 'avalanche',
    250: 'fantom',
  };
  return chainMap[chainId] || '';
}

/**
 * Get token pairs from DexScreener
 * 
 * @param tokenAddress Token address
 * @param chainId Chain ID
 * @returns Array of pairs, filtered by chain and supported DEXes
 */
export async function getTokenPairs(
  tokenAddress: Address,
  chainId: number
): Promise<DexScreenerPair[]> {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    console.log(`[DexScreener] 🔍 Fetching pairs for token ${tokenAddress} on chain ${chainId}`);
    console.log(`[DexScreener] 📡 API URL: ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    const fetchTime = Date.now() - startTime;
    
    if (!response.ok) {
      console.warn(`[DexScreener] ❌ API error: ${response.status} ${response.statusText} (took ${fetchTime}ms)`);
      return [];
    }
    
    const data: DexScreenerResponse = await response.json();
    
    if (!data.pairs || !Array.isArray(data.pairs)) {
      console.warn(`[DexScreener] ❌ Invalid response format (took ${fetchTime}ms)`);
      return [];
    }
    
    console.log(`[DexScreener] 📦 Raw response: ${data.pairs.length} total pairs (took ${fetchTime}ms)`);
    
    // Filter by chain
    const chainSlug = getChainSlug(chainId);
    const chainPairs = data.pairs.filter(p => p.chainId === chainSlug);
    console.log(`[DexScreener] 🔗 Filtered by chain "${chainSlug}": ${chainPairs.length} pairs`);
    
    // Filter by supported DEXes
    const supportedPairs = chainPairs.filter(p => isDEXSupported(chainId, p.dexId));
    console.log(`[DexScreener] ✅ Filtered by supported DEXes: ${supportedPairs.length} pairs`);
    
    // Log each pair found
    if (supportedPairs.length > 0) {
      console.log(`[DexScreener] 📋 Pairs found:`);
      supportedPairs.slice(0, 5).forEach((pair, idx) => {
        console.log(`[DexScreener]   ${idx + 1}. ${pair.baseToken.symbol}/${pair.quoteToken.symbol} on ${pair.dexId}`);
        console.log(`[DexScreener]      Base: ${pair.baseToken.address} (${pair.baseToken.symbol})`);
        console.log(`[DexScreener]      Quote: ${pair.quoteToken.address} (${pair.quoteToken.symbol})`);
        console.log(`[DexScreener]      Liquidity: $${(pair.liquidity?.usd || 0).toLocaleString()}`);
        console.log(`[DexScreener]      Volume 24h: $${(pair.volume?.h24 || 0).toLocaleString()}`);
      });
      if (supportedPairs.length > 5) {
        console.log(`[DexScreener]   ... and ${supportedPairs.length - 5} more pairs`);
      }
    }
    
    // Sort by liquidity (highest first)
    supportedPairs.sort((a, b) => {
      const liquidityA = a.liquidity?.usd || 0;
      const liquidityB = b.liquidity?.usd || 0;
      return liquidityB - liquidityA;
    });
    
    console.log(`[DexScreener] ✅ Final result: ${supportedPairs.length} supported pairs (out of ${chainPairs.length} total on chain ${chainId})`);
    
    return supportedPairs;
  } catch (error) {
    console.error(`[DexScreener] ❌ Error fetching pairs:`, error);
    return [];
  }
}

/**
 * Find pair between two tokens
 * 
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param chainId Chain ID
 * @returns Pair if found, null otherwise
 */
export async function findPair(
  tokenA: Address,
  tokenB: Address,
  chainId: number
): Promise<DexScreenerPair | null> {
  // Query pairs for tokenA
  const pairsA = await getTokenPairs(tokenA, chainId);
  
  // Find pair with tokenB
  const pair = pairsA.find(p =>
    p.baseToken.address.toLowerCase() === tokenB.toLowerCase() ||
    p.quoteToken.address.toLowerCase() === tokenB.toLowerCase()
  );
  
  return pair || null;
}

/**
 * Search pairs by symbol (e.g., "wbnb/eth", "twc/wbnb")
 * 
 * Uses DexScreener search endpoint which is more flexible than token address queries.
 * 
 * @param symbol1 First token symbol (e.g., "WBNB", "TWC")
 * @param symbol2 Second token symbol (e.g., "ETH", "WBNB")
 * @param chainId Chain ID
 * @returns Array of pairs, sorted by liquidity (highest first)
 */
export async function searchPairsBySymbol(
  symbol1: string,
  symbol2: string,
  chainId: number
): Promise<DexScreenerPair[]> {
  try {
    // Try both orderings: "symbol1/symbol2" and "symbol2/symbol1"
    const queries = [
      `${symbol1}/${symbol2}`,
      `${symbol2}/${symbol1}`,
    ];
    
    console.log(`[DexScreener] 🔍 Searching pairs by symbols: "${symbol1}" and "${symbol2}" on chain ${chainId}`);
    console.log(`[DexScreener] 📝 Query variations: ${queries.join(', ')}`);
    
    const allPairs: DexScreenerPair[] = [];
    const seenPairs = new Set<string>(); // Track by pairAddress to avoid duplicates
    
    for (const query of queries) {
      const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
      console.log(`[DexScreener] 📡 Searching: ${query} → ${url}`);
      
      const startTime = Date.now();
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
      const fetchTime = Date.now() - startTime;
      
      if (!response.ok) {
        console.warn(`[DexScreener] ❌ Search API error for "${query}": ${response.status} (took ${fetchTime}ms)`);
        continue;
      }
      
      const data: DexScreenerResponse = await response.json();
      
      if (!data.pairs || !Array.isArray(data.pairs)) {
        console.warn(`[DexScreener] ⚠️ Invalid response for "${query}" (took ${fetchTime}ms)`);
        continue;
      }
      
      console.log(`[DexScreener] 📦 Raw response for "${query}": ${data.pairs.length} pairs (took ${fetchTime}ms)`);
      
      // Filter by chain
      const chainSlug = getChainSlug(chainId);
      const chainPairs = data.pairs.filter(p => p.chainId === chainSlug);
      console.log(`[DexScreener] 🔗 Filtered by chain "${chainSlug}": ${chainPairs.length} pairs`);
      
      // Filter by supported DEXes
      const supportedPairs = chainPairs.filter(p => isDEXSupported(chainId, p.dexId));
      console.log(`[DexScreener] ✅ Filtered by supported DEXes: ${supportedPairs.length} pairs`);
      
      // Log each pair found
      if (supportedPairs.length > 0) {
        console.log(`[DexScreener] 📋 Pairs found for "${query}":`);
        supportedPairs.forEach((pair, idx) => {
          console.log(`[DexScreener]   ${idx + 1}. ${pair.baseToken.symbol}/${pair.quoteToken.symbol} on ${pair.dexId}`);
          console.log(`[DexScreener]      Addresses: ${pair.baseToken.address} / ${pair.quoteToken.address}`);
          console.log(`[DexScreener]      Liquidity: $${(pair.liquidity?.usd || 0).toLocaleString()}`);
        });
      }
      
      // Add to results (avoid duplicates)
      for (const pair of supportedPairs) {
        const key = pair.pairAddress.toLowerCase();
        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          allPairs.push(pair);
        } else {
          console.log(`[DexScreener] 🔄 Skipping duplicate pair: ${pair.pairAddress}`);
        }
      }
    }
    
    // Sort by liquidity (highest first)
    allPairs.sort((a, b) => {
      const liquidityA = a.liquidity?.usd || 0;
      const liquidityB = b.liquidity?.usd || 0;
      return liquidityB - liquidityA;
    });
    
    console.log(`[DexScreener] ✅ Final result: ${allPairs.length} unique pairs for ${symbol1}/${symbol2} on chain ${chainId}`);
    if (allPairs.length > 0) {
      console.log(`[DexScreener] 🏆 Best pair: ${allPairs[0].baseToken.symbol}/${allPairs[0].quoteToken.symbol} on ${allPairs[0].dexId} ($${(allPairs[0].liquidity?.usd || 0).toLocaleString()} liquidity)`);
    }
    
    return allPairs;
  } catch (error) {
    console.error(`[DexScreener] ❌ Error searching pairs by symbol:`, error);
    return [];
  }
}

/**
 * Search all pairs for a token symbol
 * 
 * @param tokenSymbol Token symbol (e.g., "TWC", "WBNB")
 * @param chainId Chain ID
 * @returns Array of pairs, sorted by liquidity
 */
export async function searchAllPairsForToken(
  tokenSymbol: string,
  chainId: number
): Promise<DexScreenerPair[]> {
  try {
    const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(tokenSymbol)}`;
    console.log(`[DexScreener] 🔍 Searching ALL pairs for token: "${tokenSymbol}" on chain ${chainId}`);
    console.log(`[DexScreener] 📡 API URL: ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    const fetchTime = Date.now() - startTime;
    
    if (!response.ok) {
      console.warn(`[DexScreener] ❌ Search API error: ${response.status} (took ${fetchTime}ms)`);
      return [];
    }
    
    const data: DexScreenerResponse = await response.json();
    
    if (!data.pairs || !Array.isArray(data.pairs)) {
      console.warn(`[DexScreener] ⚠️ Invalid response format (took ${fetchTime}ms)`);
      return [];
    }
    
    console.log(`[DexScreener] 📦 Raw response: ${data.pairs.length} total pairs (took ${fetchTime}ms)`);
    
    // Filter by chain
    const chainSlug = getChainSlug(chainId);
    const chainPairs = data.pairs.filter(p => p.chainId === chainSlug);
    console.log(`[DexScreener] 🔗 Filtered by chain "${chainSlug}": ${chainPairs.length} pairs`);
    
    // Filter by supported DEXes
    const supportedPairs = chainPairs.filter(p => isDEXSupported(chainId, p.dexId));
    console.log(`[DexScreener] ✅ Filtered by supported DEXes: ${supportedPairs.length} pairs`);
    
    // Group by paired token for analysis
    const pairMap = new Map<string, DexScreenerPair[]>();
    for (const pair of supportedPairs) {
      const otherToken = pair.baseToken.symbol.toLowerCase() === tokenSymbol.toLowerCase()
        ? pair.quoteToken.symbol
        : pair.baseToken.symbol;
      if (!pairMap.has(otherToken)) {
        pairMap.set(otherToken, []);
      }
      pairMap.get(otherToken)!.push(pair);
    }
    
    console.log(`[DexScreener] 📊 Token "${tokenSymbol}" pairs with ${pairMap.size} different tokens:`);
    Array.from(pairMap.entries())
      .sort((a, b) => {
        const liquidityA = a[1].reduce((sum, p) => sum + (p.liquidity?.usd || 0), 0);
        const liquidityB = b[1].reduce((sum, p) => sum + (p.liquidity?.usd || 0), 0);
        return liquidityB - liquidityA;
      })
      .slice(0, 10)
      .forEach(([otherToken, pairs]) => {
        const totalLiquidity = pairs.reduce((sum, p) => sum + (p.liquidity?.usd || 0), 0);
        console.log(`[DexScreener]   • ${tokenSymbol}/${otherToken}: ${pairs.length} pair(s), $${totalLiquidity.toLocaleString()} total liquidity`);
      });
    
    // Sort by liquidity (highest first)
    supportedPairs.sort((a, b) => {
      const liquidityA = a.liquidity?.usd || 0;
      const liquidityB = b.liquidity?.usd || 0;
      return liquidityB - liquidityA;
    });
    
    console.log(`[DexScreener] ✅ Final result: ${supportedPairs.length} pairs for "${tokenSymbol}" on chain ${chainId}`);
    
    return supportedPairs;
  } catch (error) {
    console.error(`[DexScreener] ❌ Error searching all pairs:`, error);
    return [];
  }
}

/**
 * Find best pair between two tokens
 * 
 * Uses both address query and symbol search, returns the best pair by liquidity.
 * 
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param tokenASymbol First token symbol (optional, for better search)
 * @param tokenBSymbol Second token symbol (optional, for better search)
 * @param chainId Chain ID
 * @param minLiquidityUSD Minimum liquidity in USD (default: 0)
 * @returns Best pair if found, null otherwise
 */
export async function findBestPair(
  tokenA: Address,
  tokenB: Address,
  chainId: number,
  tokenASymbol?: string,
  tokenBSymbol?: string,
  minLiquidityUSD: number = 0
): Promise<DexScreenerPair | null> {
  const candidates: DexScreenerPair[] = [];
  
  // Method 1: Query by token address
  const pairByAddress = await findPair(tokenA, tokenB, chainId);
  if (pairByAddress) {
    candidates.push(pairByAddress);
  }
  
  // Method 2: Search by symbols (if provided)
  if (tokenASymbol && tokenBSymbol) {
    const pairsBySymbol = await searchPairsBySymbol(tokenASymbol, tokenBSymbol, chainId);
    candidates.push(...pairsBySymbol);
  }
  
  if (candidates.length === 0) {
    return null;
  }
  
  // Remove duplicates and filter by liquidity
  const uniquePairs = new Map<string, DexScreenerPair>();
  for (const pair of candidates) {
    const key = pair.pairAddress.toLowerCase();
    const existing = uniquePairs.get(key);
    
    // Keep pair with higher liquidity if duplicate
    if (!existing || (pair.liquidity?.usd || 0) > (existing.liquidity?.usd || 0)) {
      uniquePairs.set(key, pair);
    }
  }
  
  // Filter by minimum liquidity
  const filteredPairs = Array.from(uniquePairs.values()).filter(p => 
    (p.liquidity?.usd || 0) >= minLiquidityUSD
  );
  
  if (filteredPairs.length === 0) {
    return null;
  }
  
  // Sort by liquidity (highest first) and return best
  filteredPairs.sort((a, b) => {
    const liquidityA = a.liquidity?.usd || 0;
    const liquidityB = b.liquidity?.usd || 0;
    return liquidityB - liquidityA;
  });
  
  return filteredPairs[0];
}

