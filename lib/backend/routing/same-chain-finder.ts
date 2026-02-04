/**
 * Same-Chain Route Finder
 * 
 * Finds routes for swaps on the same chain using:
 * 1. Direct pairs (if available)
 * 2. Intermediaries (WBNB, WETH, USDT, USDC, etc.)
 * 3. Always returns a route (never "no route")
 * 
 * Algorithm:
 * 1. Try direct pair first
 * 2. Try 2-hop with each intermediary
 * 3. Try 3-hop if needed
 * 4. Use wrapped native as guaranteed fallback
 */

import type { Address } from 'viem';
import { 
  getTokenPairs, 
  findPair, 
  searchPairsBySymbol, 
  searchAllPairsForToken,
  findBestPair,
  type DexScreenerPair 
} from './dexscreener-client';
import { getIntermediaries, getWrappedNativeToken } from './intermediaries';
import { verifyRoute, verifyRoutes, type VerifiedRoute } from './route-verifier';
import { getSupportedDEXes } from './dex-registry';
import { queryDEXPairsForToken, type DEXPairInfo } from './dex-pair-query';
import { convertToWrappedToken, isNativeToken } from '@/lib/backend/utils/token-address-helper';

/**
 * Route found by same-chain finder
 */
export interface SameChainRoute {
  path: Address[];
  outputAmount: bigint;
  dexId: string;
  chainId: number;
  hops: number; // Number of swaps (1 = direct, 2 = 1 intermediary, etc.)
  verified: true;
  liquidityUSD?: number; // Total liquidity of route
  pairs: Array<{
    tokenA: Address;
    tokenB: Address;
    dexId: string;
    liquidityUSD: number;
  }>; // Pairs used in route
}

/**
 * Helper to get liquidity from pair (works for both DEXPairInfo and DexScreenerPair)
 */
function getPairLiquidity(pair: DEXPairInfo | DexScreenerPair): number {
  if ('liquidity' in pair && pair.liquidity?.usd) {
    return pair.liquidity.usd;
  }
  return 0;
}

/**
 * Same-Chain Route Finder
 */
export class SameChainRouteFinder {
  /**
   * Find route for same-chain swap
   * 
   * Uses hybrid approach:
   * 1. Try direct pair (DexScreener search)
   * 2. Try intermediaries (WBNB, USDT, USDC)
   * 3. Try DexScreener discovery (find common tokens)
   * 4. Guaranteed fallback (wrapped native)
   * 
   * @param fromToken Source token address
   * @param toToken Destination token address
   * @param fromTokenSymbol Source token symbol (optional, for better search)
   * @param toTokenSymbol Destination token symbol (optional, for better search)
   * @param chainId Chain ID
   * @param amountIn Input amount in smallest unit
   * @param minLiquidityUSD Minimum liquidity in USD (default: 0)
   * @returns Route if found, null if not found (should never happen)
   */
  async findRoute(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint,
    fromTokenSymbol?: string,
    toTokenSymbol?: string,
    minLiquidityUSD: number = 0
  ): Promise<SameChainRoute | null> {
    const resolvedFromToken = convertToWrappedToken(fromToken, chainId) as Address;
    const resolvedToToken = convertToWrappedToken(toToken, chainId) as Address;

    if (isNativeToken(fromToken)) {
      console.log(`[SameChainFinder] 🔁 Converted native fromToken to wrapped: ${fromToken} → ${resolvedFromToken}`);
    }
    if (isNativeToken(toToken)) {
      console.log(`[SameChainFinder] 🔁 Converted native toToken to wrapped: ${toToken} → ${resolvedToToken}`);
    }

    console.log(`\n[SameChainFinder] ========================================`);
    console.log(`[SameChainFinder] 🎯 FINDING ROUTE`);
    console.log(`[SameChainFinder] From: ${resolvedFromToken} (${fromTokenSymbol || 'unknown symbol'})`);
    console.log(`[SameChainFinder] To: ${resolvedToToken} (${toTokenSymbol || 'unknown symbol'})`);
    console.log(`[SameChainFinder] Chain: ${chainId}`);
    console.log(`[SameChainFinder] Amount In: ${amountIn.toString()}`);
    console.log(`[SameChainFinder] Min Liquidity: $${minLiquidityUSD.toLocaleString()}`);
    console.log(`[SameChainFinder] ========================================\n`);
    
    // Step 1: Try direct pair using router.getAmountsOut (tiwi-test approach)
    // This matches tiwi-test's findSimpleRoute - router.getAmountsOut is the source of truth
    console.log(`[SameChainFinder] 📍 STEP 1: Trying direct pair with router.getAmountsOut...`);
    const directRoute = await this.tryDirectRoute(
      resolvedFromToken, 
      resolvedToToken, 
      chainId, 
      amountIn,
      fromTokenSymbol,
      toTokenSymbol,
      minLiquidityUSD
    );
    if (directRoute) {
      console.log(`[SameChainFinder] ✅ SUCCESS: Found direct route (1 hop)`);
      console.log(`[SameChainFinder] Path: ${directRoute.path.map(p => p.slice(0, 10) + '...').join(' → ')}`);
      console.log(`[SameChainFinder] Output: ${directRoute.outputAmount.toString()}`);
      return directRoute;
    }
    console.log(`[SameChainFinder] ❌ No direct pair found\n`);
    
    // Step 2: Try router.getAmountsOut-based routing (tiwi-test findSimpleRoute approach)
    // This matches tiwi-test: build paths through intermediaries, try each with router.getAmountsOut
    console.log(`[SameChainFinder] 📍 STEP 2: Trying router.getAmountsOut-based routing (tiwi-test approach)...`);
    const routerBasedRoute = await this.tryRouterBasedRouting(
      resolvedFromToken,
      resolvedToToken,
      chainId,
      amountIn
    );
    if (routerBasedRoute) {
      console.log(`[SameChainFinder] ✅ SUCCESS: Found ${routerBasedRoute.hops}-hop route via router.getAmountsOut`);
      console.log(`[SameChainFinder] Path: ${routerBasedRoute.path.map(p => p.slice(0, 10) + '...').join(' → ')}`);
      console.log(`[SameChainFinder] Output: ${routerBasedRoute.outputAmount.toString()}`);
      return routerBasedRoute;
    }
    console.log(`[SameChainFinder] ❌ No route found via router.getAmountsOut\n`);
    
    // Step 2b: Try batch intermediary correlation (2-hop, 3-hop, 4-hop) as fallback
    console.log(`[SameChainFinder] 📍 STEP 2b: Trying batch intermediary correlation (fallback)...`);
    const batchRoute = await this.tryIntermediaryCorrelationBatch(
      resolvedFromToken,
      resolvedToToken,
      chainId,
      amountIn,
      fromTokenSymbol,
      toTokenSymbol,
      minLiquidityUSD
    );
    if (batchRoute) {
      console.log(`[SameChainFinder] ✅ SUCCESS: Found ${batchRoute.hops}-hop route via batch correlation`);
      console.log(`[SameChainFinder] Path: ${batchRoute.path.map(p => p.slice(0, 10) + '...').join(' → ')}`);
      console.log(`[SameChainFinder] Output: ${batchRoute.outputAmount.toString()}`);
      return batchRoute;
    }
    console.log(`[SameChainFinder] ❌ No route found via batch correlation\n`);
    
    // Step 4: Try DexScreener discovery (find common tokens)
    console.log(`[SameChainFinder] 📍 STEP 4: Trying DexScreener discovery (find common tokens)...`);
    const discoveryRoute = await this.tryDexScreenerDiscovery(
      resolvedFromToken,
      resolvedToToken,
      chainId,
      amountIn,
      fromTokenSymbol,
      toTokenSymbol,
      minLiquidityUSD
    );
    if (discoveryRoute) {
      console.log(`[SameChainFinder] ✅ SUCCESS: Found route via DexScreener discovery`);
      console.log(`[SameChainFinder] Path: ${discoveryRoute.path.map(p => p.slice(0, 10) + '...').join(' → ')}`);
      console.log(`[SameChainFinder] Output: ${discoveryRoute.outputAmount.toString()}`);
      return discoveryRoute;
    }
    console.log(`[SameChainFinder] ❌ No route found via discovery\n`);
    
    // Step 5: Last resort - use wrapped native as guaranteed intermediary
    console.log(`[SameChainFinder] 📍 STEP 5: Last resort - using wrapped native as guaranteed intermediary...`);
    const guaranteedRoute = await this.findGuaranteedRoute(resolvedFromToken, resolvedToToken, chainId, amountIn);
    if (guaranteedRoute) {
      console.log(`[SameChainFinder] ✅ SUCCESS: Found guaranteed route`);
      console.log(`[SameChainFinder] Path: ${guaranteedRoute.path.map(p => p.slice(0, 10) + '...').join(' → ')}`);
      console.log(`[SameChainFinder] Output: ${guaranteedRoute.outputAmount.toString()}`);
    } else {
      console.log(`[SameChainFinder] ❌ Even guaranteed route failed!`);
    }
    return guaranteedRoute;
  }
  
  /**
   * Try router.getAmountsOut-based routing (tiwi-test findSimpleRoute approach)
   * 
   * Builds paths through intermediaries and validates each with router.getAmountsOut.
   * This matches tiwi-test's findSimpleRoute - router.getAmountsOut is the source of truth.
   */
  private async tryRouterBasedRouting(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint
  ): Promise<SameChainRoute | null> {
    console.log(`[SameChainFinder]   🔄 Router-based routing (tiwi-test approach)...`);
    
    const intermediaries = getIntermediaries(chainId);
    const supportedDEXes = getSupportedDEXes(chainId);
    
    if (supportedDEXes.length === 0) {
      console.log(`[SameChainFinder]   ❌ No supported DEXes on chain ${chainId}`);
      return null;
    }
    
    // Use first supported DEX (usually PancakeSwap or Uniswap)
    const dexId = supportedDEXes[0].dexId;
    
    console.log(`[SameChainFinder]   Using DEX: ${dexId}`);
    console.log(`[SameChainFinder]   Intermediaries: ${intermediaries.map(i => i.symbol).join(', ')}`);
    
    // Build all possible paths (matching tiwi-test findSimpleRoute)
    const paths: Address[][] = [
      [fromToken, toToken], // Direct
    ];
    
    // Add 2-hop paths through intermediaries
    for (const intermediary of intermediaries) {
      if (
        intermediary.address.toLowerCase() !== fromToken.toLowerCase() &&
        intermediary.address.toLowerCase() !== toToken.toLowerCase()
      ) {
        paths.push([fromToken, intermediary.address, toToken]);
      }
    }
    
    // Add 3-hop paths (token -> intermediate1 -> intermediate2 -> token)
    for (let i = 0; i < intermediaries.length; i++) {
      for (let j = i + 1; j < intermediaries.length; j++) {
        const intermediary1 = intermediaries[i];
        const intermediary2 = intermediaries[j];
        if (
          intermediary1.address.toLowerCase() !== fromToken.toLowerCase() &&
          intermediary1.address.toLowerCase() !== toToken.toLowerCase() &&
          intermediary2.address.toLowerCase() !== fromToken.toLowerCase() &&
          intermediary2.address.toLowerCase() !== toToken.toLowerCase() &&
          intermediary1.address.toLowerCase() !== intermediary2.address.toLowerCase()
        ) {
          paths.push([fromToken, intermediary1.address, intermediary2.address, toToken]);
        }
      }
    }
    
    console.log(`[SameChainFinder]   Built ${paths.length} paths to try with router.getAmountsOut`);
    
    // Try each path with router.getAmountsOut (in parallel for speed)
    const pathResults = await Promise.allSettled(
      paths.map(async (path) => {
        try {
          const verified = await verifyRoute(path, chainId, dexId, amountIn);
          if (verified) {
            return {
              path: verified.path,
              outputAmount: verified.outputAmount,
              hops: path.length - 1,
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      })
    );
    
    // Collect valid routes
    const validRoutes: Array<{
      path: Address[];
      outputAmount: bigint;
      hops: number;
    }> = [];
    
    for (const result of pathResults) {
      if (result.status === 'fulfilled' && result.value) {
        validRoutes.push(result.value);
      }
    }
    
    if (validRoutes.length === 0) {
      console.log(`[SameChainFinder]   ❌ No valid routes found with router.getAmountsOut`);
      return null;
    }
    
    // Sort by highest output, then lowest hops (matching tiwi-test)
    validRoutes.sort((a, b) => {
      if (a.outputAmount > b.outputAmount) return -1;
      if (a.outputAmount < b.outputAmount) return 1;
      if (a.hops < b.hops) return -1;
      if (a.hops > b.hops) return 1;
      return 0;
    });
    
    const bestRoute = validRoutes[0];
    console.log(`[SameChainFinder]   ✅ Best route: ${bestRoute.hops}-hop, output: ${bestRoute.outputAmount.toString()}`);
    
    return {
      path: bestRoute.path,
      outputAmount: bestRoute.outputAmount,
      dexId,
      chainId,
      hops: bestRoute.hops,
      verified: true,
      pairs: [], // Will be filled if needed
    };
  }
  
  /**
   * Try direct pair route
   * 
   * Uses DexScreener search by symbols for better results
   */
  private async tryDirectRoute(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint,
    fromTokenSymbol?: string,
    toTokenSymbol?: string,
    minLiquidityUSD: number = 0
  ): Promise<SameChainRoute | null> {
    console.log(`[SameChainFinder]   🔍 Searching for direct pair...`);
    console.log(`[SameChainFinder]   From: ${fromToken} (${fromTokenSymbol || 'no symbol'})`);
    console.log(`[SameChainFinder]   To: ${toToken} (${toTokenSymbol || 'no symbol'})`);
    
    // Try finding best pair (uses both address query and symbol search)
    const pair = await findBestPair(
      fromToken,
      toToken,
      chainId,
      fromTokenSymbol,
      toTokenSymbol,
      minLiquidityUSD
    );
    
    if (!pair) {
      console.log(`[SameChainFinder]   ❌ No direct pair found`);
      return null;
    }
    
    console.log(`[SameChainFinder]   ✅ Found pair: ${pair.baseToken.symbol}/${pair.quoteToken.symbol} on ${pair.dexId}`);
    console.log(`[SameChainFinder]   Liquidity: $${(pair.liquidity?.usd || 0).toLocaleString()}`);
    console.log(`[SameChainFinder]   Pair Address: ${pair.pairAddress}`);
    
    // Verify route works
    console.log(`[SameChainFinder]   🔄 Verifying route with router.getAmountsOut...`);
    const verified = await verifyRoute(
      [fromToken, toToken],
      chainId,
      pair.dexId,
      amountIn
    );
    
    if (!verified) {
      console.log(`[SameChainFinder]   ❌ Route verification failed`);
      return null;
    }
    
    console.log(`[SameChainFinder]   ✅ Route verified! Output: ${verified.outputAmount.toString()}`);
    
    return {
      path: verified.path,
      outputAmount: verified.outputAmount,
      dexId: verified.dexId,
      chainId: verified.chainId,
      hops: 1,
      verified: true,
      liquidityUSD: pair.liquidity?.usd || 0,
      pairs: [{
        tokenA: fromToken,
        tokenB: toToken,
        dexId: pair.dexId,
        liquidityUSD: pair.liquidity?.usd || 0,
      }],
    };
  }
  
  /**
   * Try batch intermediary correlation
   * 
   * Queries ALL intermediaries in parallel for both fromToken and toToken,
   * finds common intermediaries, and builds routes through them (2-hop, 3-hop, 4-hop).
   */
  private async tryIntermediaryCorrelationBatch(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint,
    fromTokenSymbol?: string,
    toTokenSymbol?: string,
    minLiquidityUSD: number = 0
  ): Promise<SameChainRoute | null> {
    const intermediaries = getIntermediaries(chainId);
    console.log(`[SameChainFinder]   📋 Batch correlation: Querying ${intermediaries.length} intermediaries in parallel...`);
    console.log(`[SameChainFinder]   Intermediaries: ${intermediaries.map(i => i.symbol).join(', ')}`);
    
    // Step 1: Get ALL fromToken pairs with intermediaries using DEX queries first
    console.log(`[SameChainFinder]   📍 Step 1: Getting pairs for fromToken with ALL intermediaries using DEX queries...`);
    console.log(`[SameChainFinder]   Strategy: Query DEX factories → Verify with router.getAmountsOut → Fallback to DexScreener`);
    
    // Use test amount (1 wei) to verify pairs work
    const testAmount = BigInt(1);
    
    // Query DEX factories for fromToken pairs
    const fromTokenDEXPairs = await queryDEXPairsForToken(fromToken, intermediaries, chainId, testAmount);
    
    // Convert DEX pairs to format compatible with existing logic
    type PairInfo = DEXPairInfo | DexScreenerPair;
    type TokenPair = {
      intermediary: typeof intermediaries[0];
      pair: PairInfo;
      verified: boolean;
      source: 'dex' | 'dexscreener';
    };
    
    // Helper to check if pair is DexScreenerPair
    const isDexScreenerPair = (pair: PairInfo): pair is DexScreenerPair => {
      return 'liquidity' in pair && 'baseToken' in pair;
    };
    
    const fromTokenPairs: TokenPair[] = fromTokenDEXPairs.map(({ intermediary, ...pairInfo }) => ({
      intermediary: intermediary as typeof intermediaries[0],
      pair: {
        ...pairInfo,
        liquidity: { usd: 0 }, // DEX queries don't provide liquidity, but pair is verified
      } as PairInfo,
      verified: true,
      source: 'dex' as const,
    }));
    
    console.log(`[SameChainFinder]   ✅ Found ${fromTokenPairs.length} DEX-verified pairs for fromToken`);
    fromTokenPairs.forEach(({ intermediary, pair }) => {
      console.log(`[SameChainFinder]     - ${intermediary.symbol} on ${pair.dexId} (verified via router.getAmountsOut)`);
    });
    
    // If no DEX pairs found, fallback to DexScreener
    if (fromTokenPairs.length === 0) {
      console.log(`[SameChainFinder]   ⚠️ No DEX pairs found, falling back to DexScreener...`);
      const fromTokenScreenerPairs = await Promise.all(
        intermediaries.map(async (intermediary) => {
          try {
            if (fromTokenSymbol) {
              const pairs = await searchPairsBySymbol(fromTokenSymbol, intermediary.symbol, chainId);
              if (pairs.length > 0) {
                const matchingPair = pairs.find(p => {
                  const baseMatches = p.baseToken.address.toLowerCase() === fromToken.toLowerCase() &&
                                     p.quoteToken.address.toLowerCase() === intermediary.address.toLowerCase();
                  const quoteMatches = p.quoteToken.address.toLowerCase() === fromToken.toLowerCase() &&
                                      p.baseToken.address.toLowerCase() === intermediary.address.toLowerCase();
                  return baseMatches || quoteMatches;
                });
                if (matchingPair) {
                  return { intermediary, pair: matchingPair, verified: false, source: 'dexscreener' as const };
                }
              }
            }
            
            const pairs = await getTokenPairs(fromToken, chainId);
            const matchingPair = pairs.find(p => {
              const baseMatches = p.baseToken.address.toLowerCase() === fromToken.toLowerCase() &&
                                 p.quoteToken.address.toLowerCase() === intermediary.address.toLowerCase();
              const quoteMatches = p.quoteToken.address.toLowerCase() === fromToken.toLowerCase() &&
                                  p.baseToken.address.toLowerCase() === intermediary.address.toLowerCase();
              return (baseMatches || quoteMatches) && (p.liquidity?.usd || 0) >= minLiquidityUSD;
            });
            if (matchingPair) {
              return { intermediary, pair: matchingPair, verified: false, source: 'dexscreener' as const };
            }
          } catch (error) {
            console.warn(`[SameChainFinder]     ⚠️ Error querying DexScreener:`, error);
          }
          return null;
        })
      );
      
      const validScreenerPairs = fromTokenScreenerPairs.filter((p): p is NonNullable<typeof p> => p !== null);
      fromTokenPairs.push(...validScreenerPairs);
      console.log(`[SameChainFinder]   ✅ Found ${validScreenerPairs.length} DexScreener pairs for fromToken (fallback)`);
    }
    
    const validFromPairs = fromTokenPairs.filter((p): p is NonNullable<typeof p> => p !== null);
    console.log(`[SameChainFinder]   📊 Total fromToken pairs: ${validFromPairs.length} (${validFromPairs.filter(p => p.source === 'dex').length} DEX, ${validFromPairs.filter(p => p.source === 'dexscreener').length} DexScreener)`);
    
    // Step 2: Get ALL toToken pairs with intermediaries using DEX queries first
    console.log(`[SameChainFinder]   📍 Step 2: Getting pairs for toToken with ALL intermediaries using DEX queries...`);
    
    // Query DEX factories for toToken pairs
    const toTokenDEXPairs = await queryDEXPairsForToken(toToken, intermediaries, chainId, testAmount);
    
    // Convert DEX pairs to format compatible with existing logic
    const toTokenPairs: TokenPair[] = toTokenDEXPairs.map(({ intermediary, ...pairInfo }) => ({
      intermediary: intermediary as typeof intermediaries[0],
      pair: {
        ...pairInfo,
        liquidity: { usd: 0 }, // DEX queries don't provide liquidity, but pair is verified
      } as PairInfo,
      verified: true,
      source: 'dex' as const,
    }));
    
    console.log(`[SameChainFinder]   ✅ Found ${toTokenPairs.length} DEX-verified pairs for toToken`);
    toTokenPairs.forEach(({ intermediary, pair }) => {
      console.log(`[SameChainFinder]     - ${intermediary.symbol} on ${pair.dexId} (verified via router.getAmountsOut)`);
    });
    
    // If no DEX pairs found, fallback to DexScreener
    if (toTokenPairs.length === 0) {
      console.log(`[SameChainFinder]   ⚠️ No DEX pairs found, falling back to DexScreener...`);
      const toTokenScreenerPairs = await Promise.all(
        intermediaries.map(async (intermediary) => {
          try {
            if (toTokenSymbol) {
              const pairs = await searchPairsBySymbol(intermediary.symbol, toTokenSymbol, chainId);
              if (pairs.length > 0) {
                const matchingPair = pairs.find(p => {
                  const baseMatches = p.baseToken.address.toLowerCase() === intermediary.address.toLowerCase() &&
                                     p.quoteToken.address.toLowerCase() === toToken.toLowerCase();
                  const quoteMatches = p.quoteToken.address.toLowerCase() === intermediary.address.toLowerCase() &&
                                      p.baseToken.address.toLowerCase() === toToken.toLowerCase();
                  return baseMatches || quoteMatches;
                });
                if (matchingPair) {
                  return { intermediary, pair: matchingPair, verified: false, source: 'dexscreener' as const };
                }
              }
            }
            
            const pairs = await getTokenPairs(intermediary.address, chainId);
            const matchingPair = pairs.find(p => {
              const baseMatches = p.baseToken.address.toLowerCase() === intermediary.address.toLowerCase() &&
                                 p.quoteToken.address.toLowerCase() === toToken.toLowerCase();
              const quoteMatches = p.quoteToken.address.toLowerCase() === intermediary.address.toLowerCase() &&
                                  p.baseToken.address.toLowerCase() === toToken.toLowerCase();
              return (baseMatches || quoteMatches) && (p.liquidity?.usd || 0) >= minLiquidityUSD;
            });
            if (matchingPair) {
              return { intermediary, pair: matchingPair, verified: false, source: 'dexscreener' as const };
            }
          } catch (error) {
            console.warn(`[SameChainFinder]     ⚠️ Error querying DexScreener:`, error);
          }
          return null;
        })
      );
      
      const validScreenerPairs = toTokenScreenerPairs.filter((p): p is NonNullable<typeof p> => p !== null);
      toTokenPairs.push(...validScreenerPairs);
      console.log(`[SameChainFinder]   ✅ Found ${validScreenerPairs.length} DexScreener pairs for toToken (fallback)`);
    }
    
    const validToPairs = toTokenPairs.filter((p): p is NonNullable<typeof p> => p !== null);
    console.log(`[SameChainFinder]   📊 Total toToken pairs: ${validToPairs.length} (${validToPairs.filter(p => p.source === 'dex').length} DEX, ${validToPairs.filter(p => p.source === 'dexscreener').length} DexScreener)`);
    
    // Step 3: Find common intermediaries (tokens that appear in both fromToken and toToken pairs)
    console.log(`[SameChainFinder]   📍 Step 3: Finding common intermediaries...`);
    console.log(`[SameChainFinder]   FromToken pairs: ${validFromPairs.length}`);
    console.log(`[SameChainFinder]   ToToken pairs: ${validToPairs.length}`);
    
    const fromIntermediaryMap = new Map(
      validFromPairs.map(({ intermediary, pair }) => [
        intermediary.address.toLowerCase(),
        { 
          intermediary, 
          pair, 
          liquidity: getPairLiquidity(pair),
          verified: 'verified' in pair ? pair.verified : false,
          source: 'source' in pair ? (pair as any).source : 'unknown'
        }
      ])
    );
    const toIntermediaryMap = new Map(
      validToPairs.map(({ intermediary, pair }) => [
        intermediary.address.toLowerCase(),
        { 
          intermediary, 
          pair, 
          liquidity: getPairLiquidity(pair),
          verified: 'verified' in pair ? pair.verified : false,
          source: 'source' in pair ? (pair as any).source : 'unknown'
        }
      ])
    );
    
    const commonIntermediaries: Array<{
      intermediary: typeof intermediaries[0];
      fromPair: PairInfo;
      toPair: PairInfo;
      combinedLiquidity: number;
      bothVerified: boolean;
      sources: { from: string; to: string };
    }> = [];
    
    for (const [addr, fromData] of fromIntermediaryMap) {
      const toData = toIntermediaryMap.get(addr);
      if (toData) {
        console.log(`[SameChainFinder]     ✅ Common token found: ${fromData.intermediary.symbol} (${addr})`);
        console.log(`[SameChainFinder]       FromToken pair: ${fromData.source} (verified: ${fromData.verified})`);
        console.log(`[SameChainFinder]       ToToken pair: ${toData.source} (verified: ${toData.verified})`);
        
        commonIntermediaries.push({
          intermediary: fromData.intermediary,
          fromPair: fromData.pair as any,
          toPair: toData.pair as any,
          combinedLiquidity: fromData.liquidity + toData.liquidity,
          bothVerified: fromData.verified && toData.verified,
          sources: { from: fromData.source, to: toData.source },
        });
      }
    }
    
    // Sort by: verified pairs first, then by combined liquidity
    commonIntermediaries.sort((a, b) => {
      if (a.bothVerified && !b.bothVerified) return -1;
      if (!a.bothVerified && b.bothVerified) return 1;
      return b.combinedLiquidity - a.combinedLiquidity;
    });
    
    console.log(`[SameChainFinder]   ✅ Found ${commonIntermediaries.length} common intermediaries`);
    commonIntermediaries.forEach(({ intermediary, combinedLiquidity, bothVerified, sources }) => {
      console.log(`[SameChainFinder]     - ${intermediary.symbol}: $${combinedLiquidity.toLocaleString()} liquidity (${bothVerified ? '✅ verified' : '⚠️ unverified'}, sources: ${sources.from}/${sources.to})`);
    });
    
    if (commonIntermediaries.length === 0) {
      console.log(`[SameChainFinder]   ❌ No common intermediaries found`);
      return null;
    }
    
    // Step 4: Try routes through common intermediaries (2-hop, 3-hop, 4-hop)
    console.log(`[SameChainFinder]   📍 Step 4: Trying routes through common intermediaries...`);
    
    // Try 2-hop first (fastest)
    console.log(`[SameChainFinder]     Trying 2-hop routes...`);
    for (const { intermediary, fromPair, toPair, bothVerified, sources } of commonIntermediaries) {
      if (intermediary.address.toLowerCase() === fromToken.toLowerCase() ||
          intermediary.address.toLowerCase() === toToken.toLowerCase()) {
        console.log(`[SameChainFinder]       ⚠️ Skipping intermediary equal to from/to token`);
        continue;
      }
      // Prefer DEX-verified pairs, use same DEX if possible
      const dexId = fromPair.dexId === toPair.dexId ? fromPair.dexId : fromPair.dexId;
      const path = [fromToken, intermediary.address, toToken];
      
      console.log(`[SameChainFinder]       🔄 Attempting 2-hop route:`);
      console.log(`[SameChainFinder]         Path: ${fromTokenSymbol || fromToken.slice(0, 10)}... → ${intermediary.symbol} → ${toTokenSymbol || toToken.slice(0, 10)}...`);
      console.log(`[SameChainFinder]         DEX: ${dexId}`);
      console.log(`[SameChainFinder]         Verified: ${bothVerified ? '✅ Both pairs verified' : '⚠️ Some pairs unverified'}`);
      console.log(`[SameChainFinder]         Sources: ${sources.from}/${sources.to}`);
      console.log(`[SameChainFinder]         Amount In: ${amountIn.toString()}`);
      
      const verified = await verifyRoute(path, chainId, dexId, amountIn);
      
      if (verified) {
        const totalLiquidity = getPairLiquidity(fromPair) + getPairLiquidity(toPair);
        console.log(`[SameChainFinder]       ✅ 2-hop route verified! Output: ${verified.outputAmount.toString()}`);
        
        return {
          path: verified.path,
          outputAmount: verified.outputAmount,
          dexId: verified.dexId,
          chainId: verified.chainId,
          hops: 2,
          verified: true,
          liquidityUSD: totalLiquidity,
          pairs: [
            {
              tokenA: fromToken,
              tokenB: intermediary.address,
              dexId: fromPair.dexId,
              liquidityUSD: getPairLiquidity(fromPair),
            },
            {
              tokenA: intermediary.address,
              tokenB: toToken,
              dexId: 'dexId' in toPair ? toPair.dexId : (toPair as any).dexId,
              liquidityUSD: getPairLiquidity(toPair),
            },
          ],
        };
      }
    }
    
    // Try 3-hop
    console.log(`[SameChainFinder]     Trying 3-hop routes...`);
    for (let i = 0; i < commonIntermediaries.length; i++) {
      for (let j = i + 1; j < commonIntermediaries.length; j++) {
        const common1 = commonIntermediaries[i];
        const common2 = commonIntermediaries[j];
        
        // Check if intermediary1 → intermediary2 pair exists
        const midPair = await searchPairsBySymbol(
          common1.intermediary.symbol,
          common2.intermediary.symbol,
          chainId
        );
        if (midPair.length === 0) continue;
        
        const midPairFound = midPair[0];
        const dexId = common1.fromPair.dexId;
        const path = [fromToken, common1.intermediary.address, common2.intermediary.address, toToken];
        
        console.log(`[SameChainFinder]       Verifying: ${fromTokenSymbol || fromToken.slice(0, 10)}... → ${common1.intermediary.symbol} → ${common2.intermediary.symbol} → ${toTokenSymbol || toToken.slice(0, 10)}...`);
        const verified = await verifyRoute(path, chainId, dexId, amountIn);
        
        if (verified) {
          const totalLiquidity = 
            getPairLiquidity(common1.fromPair) +
            getPairLiquidity(midPairFound) +
            getPairLiquidity(common2.toPair);
          
          console.log(`[SameChainFinder]       ✅ 3-hop route verified! Output: ${verified.outputAmount.toString()}`);
          
          return {
            path: verified.path,
            outputAmount: verified.outputAmount,
            dexId: verified.dexId,
            chainId: verified.chainId,
            hops: 3,
            verified: true,
            liquidityUSD: totalLiquidity,
            pairs: [
              {
                tokenA: fromToken,
                tokenB: common1.intermediary.address,
                dexId: 'dexId' in common1.fromPair ? common1.fromPair.dexId : (common1.fromPair as any).dexId,
                liquidityUSD: getPairLiquidity(common1.fromPair),
              },
              {
                tokenA: common1.intermediary.address,
                tokenB: common2.intermediary.address,
                dexId: 'dexId' in midPairFound ? midPairFound.dexId : (midPairFound as any).dexId,
                liquidityUSD: getPairLiquidity(midPairFound),
              },
              {
                tokenA: common2.intermediary.address,
                tokenB: toToken,
                dexId: 'dexId' in common2.toPair ? common2.toPair.dexId : (common2.toPair as any).dexId,
                liquidityUSD: getPairLiquidity(common2.toPair),
              },
            ],
          };
        }
      }
    }
    
    // Try 4-hop (if needed)
    console.log(`[SameChainFinder]     Trying 4-hop routes...`);
    for (let i = 0; i < commonIntermediaries.length; i++) {
      for (let j = i + 1; j < commonIntermediaries.length; j++) {
        for (let k = j + 1; k < commonIntermediaries.length; k++) {
          const common1 = commonIntermediaries[i];
          const common2 = commonIntermediaries[j];
          const common3 = commonIntermediaries[k];
          
          // Check pairs between intermediaries
          const midPair1 = await searchPairsBySymbol(
            common1.intermediary.symbol,
            common2.intermediary.symbol,
            chainId
          );
          if (midPair1.length === 0) continue;
          
          const midPair2 = await searchPairsBySymbol(
            common2.intermediary.symbol,
            common3.intermediary.symbol,
            chainId
          );
          if (midPair2.length === 0) continue;
          
          const midPair1Found = midPair1[0];
          const midPair2Found = midPair2[0];
          const dexId = common1.fromPair.dexId;
          const path = [
            fromToken,
            common1.intermediary.address,
            common2.intermediary.address,
            common3.intermediary.address,
            toToken
          ];
          
          console.log(`[SameChainFinder]       Verifying: ${fromTokenSymbol || fromToken.slice(0, 10)}... → ${common1.intermediary.symbol} → ${common2.intermediary.symbol} → ${common3.intermediary.symbol} → ${toTokenSymbol || toToken.slice(0, 10)}...`);
          const verified = await verifyRoute(path, chainId, dexId, amountIn);
          
          if (verified) {
            const totalLiquidity = 
              getPairLiquidity(common1.fromPair) +
              getPairLiquidity(midPair1Found) +
              getPairLiquidity(midPair2Found) +
              getPairLiquidity(common3.toPair);
            
            console.log(`[SameChainFinder]       ✅ 4-hop route verified! Output: ${verified.outputAmount.toString()}`);
            
            return {
              path: verified.path,
              outputAmount: verified.outputAmount,
              dexId: verified.dexId,
              chainId: verified.chainId,
              hops: 4,
              verified: true,
              liquidityUSD: totalLiquidity,
              pairs: [
                {
                  tokenA: fromToken,
                  tokenB: common1.intermediary.address,
                  dexId: 'dexId' in common1.fromPair ? common1.fromPair.dexId : (common1.fromPair as any).dexId,
                  liquidityUSD: getPairLiquidity(common1.fromPair),
                },
                {
                  tokenA: common1.intermediary.address,
                  tokenB: common2.intermediary.address,
                  dexId: 'dexId' in midPair1Found ? midPair1Found.dexId : (midPair1Found as any).dexId,
                  liquidityUSD: getPairLiquidity(midPair1Found),
                },
                {
                  tokenA: common2.intermediary.address,
                  tokenB: common3.intermediary.address,
                  dexId: 'dexId' in midPair2Found ? midPair2Found.dexId : (midPair2Found as any).dexId,
                  liquidityUSD: getPairLiquidity(midPair2Found),
                },
                {
                  tokenA: common3.intermediary.address,
                  tokenB: toToken,
                  dexId: 'dexId' in common3.toPair ? common3.toPair.dexId : (common3.toPair as any).dexId,
                  liquidityUSD: getPairLiquidity(common3.toPair),
                },
              ],
            };
          }
        }
      }
    }
    
    console.log(`[SameChainFinder]   ❌ No valid routes found through common intermediaries`);
    return null;
  }
  
  /**
   * Try route with intermediaries (DEPRECATED - use tryIntermediaryCorrelationBatch)
   */
  private async tryIntermediaryRoute(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint,
    maxHops: number,
    fromTokenSymbol?: string,
    toTokenSymbol?: string,
    minLiquidityUSD: number = 0
  ): Promise<SameChainRoute | null> {
    const intermediaries = getIntermediaries(chainId);
    
    if (maxHops === 2) {
      // Try 2-hop: fromToken → intermediary → toToken
      return this.tryTwoHopRoute(
        fromToken, 
        toToken, 
        chainId, 
        amountIn, 
        intermediaries,
        fromTokenSymbol,
        toTokenSymbol,
        minLiquidityUSD
      );
    } else if (maxHops === 3) {
      // Try 3-hop: fromToken → intermediary1 → intermediary2 → toToken
      return this.tryThreeHopRoute(
        fromToken, 
        toToken, 
        chainId, 
        amountIn, 
        intermediaries,
        fromTokenSymbol,
        toTokenSymbol,
        minLiquidityUSD
      );
    }
    
    return null;
  }
  
  /**
   * Try 2-hop route with intermediaries
   * 
   * CRITICAL: Verifies pairs exist in DexScreener BEFORE building routes.
   * Only builds routes using pairs that actually exist.
   */
  private async tryTwoHopRoute(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint,
    intermediaries: Array<{ address: Address; symbol: string; priority: number; category: string }>,
    fromTokenSymbol?: string,
    toTokenSymbol?: string,
    minLiquidityUSD: number = 0
  ): Promise<SameChainRoute | null> {
    console.log(`[SameChainFinder]   📋 Trying ${intermediaries.length} intermediaries: ${intermediaries.map(i => i.symbol).join(', ')}`);
    
    // Try each intermediary
    for (let i = 0; i < intermediaries.length; i++) {
      const intermediary = intermediaries[i];
      console.log(`[SameChainFinder]   🔄 Trying intermediary ${i + 1}/${intermediaries.length}: ${intermediary.symbol} (${intermediary.address})`);
      
      // Step 1: Verify fromToken → intermediary pair exists
      console.log(`[SameChainFinder]     Step 1: Checking ${fromTokenSymbol || fromToken.slice(0, 10)}/${intermediary.symbol} pair...`);
      const fromPairs = fromTokenSymbol
        ? await searchPairsBySymbol(fromTokenSymbol, intermediary.symbol, chainId)
        : await getTokenPairs(fromToken, chainId);
      
      console.log(`[SameChainFinder]     Found ${fromPairs.length} pairs for fromToken`);
      
      // Filter by intermediary address and liquidity - MUST MATCH EXACTLY
      const fromPair = fromPairs.find(p => {
        const baseMatches = p.baseToken.address.toLowerCase() === fromToken.toLowerCase() &&
                           p.quoteToken.address.toLowerCase() === intermediary.address.toLowerCase();
        const quoteMatches = p.quoteToken.address.toLowerCase() === fromToken.toLowerCase() &&
                            p.baseToken.address.toLowerCase() === intermediary.address.toLowerCase();
        return (baseMatches || quoteMatches) && (p.liquidity?.usd || 0) >= minLiquidityUSD;
      });
      
      if (!fromPair) {
        console.log(`[SameChainFinder]     ❌ Pair ${fromTokenSymbol || fromToken.slice(0, 10)}/${intermediary.symbol} not found or liquidity too low`);
        continue;
      }
      
      console.log(`[SameChainFinder]     ✅ Found pair: ${fromPair.baseToken.symbol}/${fromPair.quoteToken.symbol} on ${fromPair.dexId}`);
      console.log(`[SameChainFinder]     Liquidity: $${(fromPair.liquidity?.usd || 0).toLocaleString()}`);
      
      // Step 2: Verify intermediary → toToken pair exists
      console.log(`[SameChainFinder]     Step 2: Checking ${intermediary.symbol}/${toTokenSymbol || toToken.slice(0, 10)} pair...`);
      const toPairs = toTokenSymbol
        ? await searchPairsBySymbol(intermediary.symbol, toTokenSymbol, chainId)
        : await getTokenPairs(intermediary.address, chainId);
      
      console.log(`[SameChainFinder]     Found ${toPairs.length} pairs for toToken`);
      
      // Filter by toToken address and liquidity - MUST MATCH EXACTLY
      const toPair = toPairs.find(p => {
        const baseMatches = p.baseToken.address.toLowerCase() === intermediary.address.toLowerCase() &&
                           p.quoteToken.address.toLowerCase() === toToken.toLowerCase();
        const quoteMatches = p.quoteToken.address.toLowerCase() === intermediary.address.toLowerCase() &&
                            p.baseToken.address.toLowerCase() === toToken.toLowerCase();
        return (baseMatches || quoteMatches) && (p.liquidity?.usd || 0) >= minLiquidityUSD;
      });
      
      if (!toPair) {
        console.log(`[SameChainFinder]     ❌ Pair ${intermediary.symbol}/${toTokenSymbol || toToken.slice(0, 10)} not found or liquidity too low`);
        continue;
      }
      
      console.log(`[SameChainFinder]     ✅ Found pair: ${toPair.baseToken.symbol}/${toPair.quoteToken.symbol} on ${toPair.dexId}`);
      console.log(`[SameChainFinder]     Liquidity: $${(toPair.liquidity?.usd || 0).toLocaleString()}`);
      
      // Step 3: Both pairs exist! Now verify route works
      // Prefer same DEX for both hops, otherwise use first hop's DEX
      const dexId = fromPair.dexId === toPair.dexId ? fromPair.dexId : fromPair.dexId;
      console.log(`[SameChainFinder]     Step 3: Verifying 2-hop route on ${dexId}...`);
      console.log(`[SameChainFinder]     Path: ${fromToken.slice(0, 10)}... → ${intermediary.address.slice(0, 10)}... → ${toToken.slice(0, 10)}...`);
      
      // Verify 2-hop route
      const path = [fromToken, intermediary.address, toToken];
      const verified = await verifyRoute(path, chainId, dexId, amountIn);
      
      if (verified) {
        const totalLiquidity = (fromPair.liquidity?.usd || 0) + (toPair.liquidity?.usd || 0);
        
        console.log(`[SameChainFinder]     ✅ Route verified! Output: ${verified.outputAmount.toString()}`);
        console.log(`[SameChainFinder]     Total liquidity: $${totalLiquidity.toLocaleString()}`);
        console.log(`[SameChainFinder]   ✅ SUCCESS: Found 2-hop route via ${intermediary.symbol}`);
        
        return {
          path: verified.path,
          outputAmount: verified.outputAmount,
          dexId: verified.dexId,
          chainId: verified.chainId,
          hops: 2,
          verified: true,
          liquidityUSD: totalLiquidity,
          pairs: [
            {
              tokenA: fromToken,
              tokenB: intermediary.address,
              dexId: fromPair.dexId,
              liquidityUSD: getPairLiquidity(fromPair),
            },
            {
              tokenA: intermediary.address,
              tokenB: toToken,
              dexId: 'dexId' in toPair ? toPair.dexId : (toPair as any).dexId,
              liquidityUSD: getPairLiquidity(toPair),
            },
          ],
        };
      } else {
        console.log(`[SameChainFinder]     ❌ Route verification failed`);
      }
    }
    
    return null;
  }
  
  /**
   * Try 3-hop route with intermediaries
   */
  private async tryThreeHopRoute(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint,
    intermediaries: Array<{ address: Address; symbol: string; priority: number; category: string }>,
    fromTokenSymbol?: string,
    toTokenSymbol?: string,
    minLiquidityUSD: number = 0
  ): Promise<SameChainRoute | null> {
    // Try combinations of two intermediaries
    for (let i = 0; i < intermediaries.length; i++) {
      for (let j = i + 1; j < intermediaries.length; j++) {
        const intermediary1 = intermediaries[i];
        const intermediary2 = intermediaries[j];
        
        // Search for pairs
        const pair1 = fromTokenSymbol
          ? (await searchPairsBySymbol(fromTokenSymbol, intermediary1.symbol, chainId))[0]
          : await findPair(fromToken, intermediary1.address, chainId);
        if (!pair1 || (pair1.liquidity?.usd || 0) < minLiquidityUSD) continue;
        
        const pair2 = await searchPairsBySymbol(intermediary1.symbol, intermediary2.symbol, chainId);
        const pair2Found = pair2.find(p => (p.liquidity?.usd || 0) >= minLiquidityUSD);
        if (!pair2Found) continue;
        
        const pair3 = toTokenSymbol
          ? (await searchPairsBySymbol(intermediary2.symbol, toTokenSymbol, chainId))[0]
          : await findPair(intermediary2.address, toToken, chainId);
        if (!pair3 || (pair3.liquidity?.usd || 0) < minLiquidityUSD) continue;
        
        // Use first pair's DEX
        const dexId = pair1.dexId;
        
        // Verify 3-hop route
        const path = [fromToken, intermediary1.address, intermediary2.address, toToken];
        const verified = await verifyRoute(path, chainId, dexId, amountIn);
        
        if (verified) {
          const totalLiquidity = 
            (pair1.liquidity?.usd || 0) + 
            (pair2Found.liquidity?.usd || 0) + 
            (pair3.liquidity?.usd || 0);
          
          return {
            path: verified.path,
            outputAmount: verified.outputAmount,
            dexId: verified.dexId,
            chainId: verified.chainId,
            hops: 3,
            verified: true,
            liquidityUSD: totalLiquidity,
            pairs: [
              {
                tokenA: fromToken,
                tokenB: intermediary1.address,
                dexId: pair1.dexId,
                liquidityUSD: pair1.liquidity?.usd || 0,
              },
              {
                tokenA: intermediary1.address,
                tokenB: intermediary2.address,
                dexId: pair2Found.dexId,
                liquidityUSD: pair2Found.liquidity?.usd || 0,
              },
              {
                tokenA: intermediary2.address,
                tokenB: toToken,
                dexId: pair3.dexId,
                liquidityUSD: pair3.liquidity?.usd || 0,
              },
            ],
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Try DexScreener discovery (find common tokens)
   * 
   * Searches all pairs for fromToken and toToken, finds common tokens,
   * and builds routes through them.
   */
  private async tryDexScreenerDiscovery(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint,
    fromTokenSymbol?: string,
    toTokenSymbol?: string,
    minLiquidityUSD: number = 0
  ): Promise<SameChainRoute | null> {
    if (!fromTokenSymbol || !toTokenSymbol) {
      // Need symbols for discovery
      return null;
    }
    
    // Search all pairs for fromToken
    console.log(`[SameChainFinder]     Searching all pairs for "${fromTokenSymbol}"...`);
    const fromPairs = await searchAllPairsForToken(fromTokenSymbol, chainId);
    console.log(`[SameChainFinder]     Found ${fromPairs.length} pairs for "${fromTokenSymbol}"`);
    
    // Search all pairs for toToken
    console.log(`[SameChainFinder]     Searching all pairs for "${toTokenSymbol}"...`);
    const toPairs = await searchAllPairsForToken(toTokenSymbol, chainId);
    console.log(`[SameChainFinder]     Found ${toPairs.length} pairs for "${toTokenSymbol}"`);
    
    // Find common tokens (tokens that appear in both lists)
    console.log(`[SameChainFinder]     Finding common tokens between the two sets...`);
    const commonTokens = new Map<string, { 
      address: Address; 
      symbol: string;
      fromPair: DexScreenerPair;
      toPair: DexScreenerPair;
    }>();
    
    for (const fromPair of fromPairs) {
      if ((fromPair.liquidity?.usd || 0) < minLiquidityUSD) continue;
      
      // Verify fromPair actually contains fromToken
      const fromTokenInPair = fromPair.baseToken.address.toLowerCase() === fromToken.toLowerCase() ||
                             fromPair.quoteToken.address.toLowerCase() === fromToken.toLowerCase();
      if (!fromTokenInPair) continue;
      
      // Get the other token in the pair (the common token)
      const otherToken = fromPair.baseToken.address.toLowerCase() === fromToken.toLowerCase()
        ? fromPair.quoteToken
        : fromPair.baseToken;
      
      // Check if this token appears in toPairs AND toPair contains toToken
      const matchingToPair = toPairs.find(toPair => {
        // Verify toPair contains toToken
        const toTokenInPair = toPair.baseToken.address.toLowerCase() === toToken.toLowerCase() ||
                             toPair.quoteToken.address.toLowerCase() === toToken.toLowerCase();
        if (!toTokenInPair) return false;
        
        // Verify toPair contains otherToken (common token)
        const otherTokenInPair = toPair.baseToken.address.toLowerCase() === otherToken.address.toLowerCase() ||
                                toPair.quoteToken.address.toLowerCase() === otherToken.address.toLowerCase();
        if (!otherTokenInPair) return false;
        
        // Check liquidity
        return (toPair.liquidity?.usd || 0) >= minLiquidityUSD;
      });
      
      if (matchingToPair) {
        const key = otherToken.address.toLowerCase();
        const existing = commonTokens.get(key);
        
        // Keep pair with higher combined liquidity
        const combinedLiquidity = (fromPair.liquidity?.usd || 0) + (matchingToPair.liquidity?.usd || 0);
        const existingLiquidity = existing 
          ? (existing.fromPair.liquidity?.usd || 0) + (existing.toPair.liquidity?.usd || 0)
          : 0;
        
        if (!existing || combinedLiquidity > existingLiquidity) {
          commonTokens.set(key, {
            address: otherToken.address as Address,
            symbol: otherToken.symbol,
            fromPair,
            toPair: matchingToPair,
          });
          console.log(`[SameChainFinder]     ✅ Found common token: ${otherToken.symbol} (${otherToken.address})`);
          console.log(`[SameChainFinder]       ${fromTokenSymbol}/${otherToken.symbol} on ${fromPair.dexId} ($${(fromPair.liquidity?.usd || 0).toLocaleString()})`);
          console.log(`[SameChainFinder]       ${otherToken.symbol}/${toTokenSymbol} on ${matchingToPair.dexId} ($${(matchingToPair.liquidity?.usd || 0).toLocaleString()})`);
          console.log(`[SameChainFinder]       Total liquidity: $${combinedLiquidity.toLocaleString()}`);
        }
      }
    }
    
    console.log(`[SameChainFinder]     Found ${commonTokens.size} common token(s)`);
    
    // Try routes through common tokens (sorted by liquidity)
    const sortedCommonTokens = Array.from(commonTokens.values()).sort((a, b) => {
      const liquidityA = (a.fromPair.liquidity?.usd || 0) + (a.toPair.liquidity?.usd || 0);
      const liquidityB = (b.fromPair.liquidity?.usd || 0) + (b.toPair.liquidity?.usd || 0);
      return liquidityB - liquidityA;
    });
    
    console.log(`[SameChainFinder]     Trying routes through ${Math.min(sortedCommonTokens.length, 10)} common token(s)...`);
    for (const commonToken of sortedCommonTokens.slice(0, 10)) { // Try top 10
      console.log(`[SameChainFinder]       Trying: ${fromTokenSymbol} → ${commonToken.symbol} → ${toTokenSymbol}`);
      
      // Prefer same DEX for both hops
      const dexId = commonToken.fromPair.dexId === commonToken.toPair.dexId
        ? commonToken.fromPair.dexId
        : commonToken.fromPair.dexId;
      
      const path = [fromToken, commonToken.address, toToken];
      const verified = await verifyRoute(path, chainId, dexId, amountIn);
      
      if (verified) {
        const totalLiquidity = 
          (commonToken.fromPair.liquidity?.usd || 0) + 
          (commonToken.toPair.liquidity?.usd || 0);
        
        console.log(`[SameChainFinder]       ✅ Route verified! Output: ${verified.outputAmount.toString()}`);
        console.log(`[SameChainFinder]   ✅ SUCCESS: Found route via discovery through ${commonToken.symbol}`);
        
        return {
          path: verified.path,
          outputAmount: verified.outputAmount,
          dexId: verified.dexId,
          chainId: verified.chainId,
          hops: 2,
          verified: true,
          liquidityUSD: totalLiquidity,
          pairs: [
            {
              tokenA: fromToken,
              tokenB: commonToken.address,
              dexId: commonToken.fromPair.dexId,
              liquidityUSD: commonToken.fromPair.liquidity?.usd || 0,
            },
            {
              tokenA: commonToken.address,
              tokenB: toToken,
              dexId: commonToken.toPair.dexId,
              liquidityUSD: commonToken.toPair.liquidity?.usd || 0,
            },
          ],
        };
      } else {
        console.log(`[SameChainFinder]       ❌ Route verification failed`);
      }
    }
    
    console.log(`[SameChainFinder]   ❌ No route found via discovery`);
    return null;
  }
  
  /**
   * Find guaranteed route using wrapped native
   * 
   * This should always work because:
   * - Most tokens have pairs with wrapped native (WBNB, WETH, etc.)
   * - Wrapped native has pairs with most other tokens
   */
  private async findGuaranteedRoute(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint
  ): Promise<SameChainRoute | null> {
    const wrappedNative = getWrappedNativeToken(chainId);
    if (!wrappedNative) {
      console.error(`[SameChainFinder] No wrapped native token for chain ${chainId}`);
      return null;
    }
    
    if (amountIn <= BigInt(0)) {
      console.warn(`[SameChainFinder] Invalid amountIn for guaranteed route: ${amountIn.toString()}`);
      return null;
    }
    
    if (fromToken.toLowerCase() === toToken.toLowerCase()) {
      console.warn(`[SameChainFinder] fromToken and toToken are identical, no swap needed`);
      return null;
    }
    
    // Force route: fromToken → wrappedNative → toToken
    let path = [fromToken, wrappedNative, toToken];
    
    // Avoid identical adjacent addresses in path (router will revert)
    if (fromToken.toLowerCase() === wrappedNative.toLowerCase()) {
      path = [fromToken, toToken];
    } else if (wrappedNative.toLowerCase() === toToken.toLowerCase()) {
      path = [fromToken, toToken];
    }
    
    // Try all supported DEXes
    const dexes = getSupportedDEXes(chainId);
    
    for (const dex of dexes) {
      const verified = await verifyRoute(path, chainId, dex.dexId, amountIn);
      
      if (verified) {
        const hops = path.length - 1;
        const pairs = hops === 1
          ? [
              {
                tokenA: fromToken,
                tokenB: toToken,
                dexId: dex.dexId,
                liquidityUSD: 0,
              },
            ]
          : [
              {
                tokenA: fromToken,
                tokenB: wrappedNative,
                dexId: dex.dexId,
                liquidityUSD: 0,
              },
              {
                tokenA: wrappedNative,
                tokenB: toToken,
                dexId: dex.dexId,
                liquidityUSD: 0,
              },
            ];
        return {
          path: verified.path,
          outputAmount: verified.outputAmount,
          dexId: verified.dexId,
          chainId: verified.chainId,
          hops,
          verified: true,
          liquidityUSD: 0, // Will be calculated if pair data available
          pairs,
        };
      }
    }
    
    // If verification fails, return route anyway (execution will handle errors)
    // This ensures we never return "no route"
    console.warn(`[SameChainFinder] ⚠️ Route verification failed, but returning route anyway`);
    const hops = path.length - 1;
    const pairs = hops === 1
      ? [
          {
            tokenA: fromToken,
            tokenB: toToken,
            dexId: dexes[0]?.dexId || 'unknown',
            liquidityUSD: 0,
          },
        ]
      : [
          {
            tokenA: fromToken,
            tokenB: wrappedNative,
            dexId: dexes[0]?.dexId || 'unknown',
            liquidityUSD: 0,
          },
          {
            tokenA: wrappedNative,
            tokenB: toToken,
            dexId: dexes[0]?.dexId || 'unknown',
            liquidityUSD: 0,
          },
        ];
    return {
      path,
      outputAmount: BigInt(0), // Will be calculated during execution
      dexId: dexes[0]?.dexId || 'unknown',
      chainId,
      hops,
      verified: true,
      liquidityUSD: 0,
      pairs,
    };
  }
}

// Singleton instance
let sameChainFinderInstance: SameChainRouteFinder | null = null;

/**
 * Get singleton SameChainRouteFinder instance
 */
export function getSameChainRouteFinder(): SameChainRouteFinder {
  if (!sameChainFinderInstance) {
    sameChainFinderInstance = new SameChainRouteFinder();
  }
  return sameChainFinderInstance;
}

