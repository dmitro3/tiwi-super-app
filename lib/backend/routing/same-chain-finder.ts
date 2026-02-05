/**
 * Same-Chain Route Finder
 * 
 * Finds routes for swaps on the same chain using a Breadth-First Search (BFS) 
 * through prioritized intermediaries, verified by on-chain router quotes.
 * 
 * Algorithm:
 * 1. Direct [From -> To]
 * 2. 2-Hop [From -> Intermediary -> To]
 * 3. 3-Hop [From -> Int1 -> Int2 -> To]
 */

import type { Address } from 'viem';
import { getIntermediaries } from './intermediaries';
import { verifyRoute } from './route-verifier';
import { getSupportedDEXes } from './dex-registry';

/**
 * Route found by same-chain finder
 */
export interface SameChainRoute {
  path: Address[];
  outputAmount: bigint;
  dexId: string;
  chainId: number;
  hops: number;
  verified: true;
  pairs: Array<{
    tokenA: Address;
    tokenB: Address;
    dexId: string;
  }>;
}

/**
 * Same-Chain Route Finder
 */
export class SameChainRouteFinder {
  /**
   * Find route for same-chain swap
   */
  async findRoute(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: bigint,
    fromTokenSymbol?: string,
    toTokenSymbol?: string
  ): Promise<SameChainRoute | null> {
    console.log(`\n[SameChainFinder] 🎯 FINDING ROUTE: ${fromTokenSymbol || fromToken.slice(0, 8)} → ${toTokenSymbol || toToken.slice(0, 8)} (Chain ${chainId})`);

    const intermediaries = getIntermediaries(chainId);
    const supportedDEXes = getSupportedDEXes(chainId);

    if (supportedDEXes.length === 0) {
      console.warn(`[SameChainFinder] ❌ No supported DEXes on chain ${chainId}`);
      return null;
    }

    // We use the primary DEX for verification to keep it deterministic
    const dexId = supportedDEXes[0].dexId;
    const from = fromToken.toLowerCase() as Address;
    const to = toToken.toLowerCase() as Address;

    // Build candidate paths
    const paths: Address[][] = [];

    // 1. Direct path
    paths.push([from, to]);

    // 2. 2-Hop paths (From -> Intermediary -> To)
    for (const intermediary of intermediaries) {
      const intAddr = intermediary.address.toLowerCase() as Address;
      if (intAddr === from || intAddr === to) continue;
      paths.push([from, intAddr, to]);
    }

    // 3. 3-Hop paths (From -> Int1 -> Int2 -> To)
    // We limit this to the top 5 intermediaries to avoid massive RPC load
    const topIntermediaries = intermediaries.slice(0, 6);
    for (let i = 0; i < topIntermediaries.length; i++) {
      for (let j = 0; j < topIntermediaries.length; j++) {
        if (i === j) continue;
        const int1 = topIntermediaries[i].address.toLowerCase() as Address;
        const int2 = topIntermediaries[j].address.toLowerCase() as Address;

        if (int1 === from || int1 === to || int2 === from || int2 === to) continue;
        paths.push([from, int1, int2, to]);
      }
    }

    console.log(`[SameChainFinder]   Generated ${paths.length} candidate paths for verification`);

    let bestRoute: SameChainRoute | null = null;

    // Verify ALL paths in parallel for maximum speed
    const startTime = Date.now();
    const results = await Promise.allSettled(
      paths.map(path => verifyRoute(path, chainId, dexId, amountIn))
    );
    console.log(`[SameChainFinder]   ⚡ Parallel verification of ${paths.length} paths took ${Date.now() - startTime}ms`);

    for (let idx = 0; idx < results.length; idx++) {
      const result = results[idx];
      if (result.status !== 'fulfilled' || !result.value) continue;

      const verified = result.value;
      if (verified.outputAmount <= BigInt(0)) continue;

      const path = paths[idx];
      const route: SameChainRoute = {
        path: verified.path,
        outputAmount: verified.outputAmount,
        dexId: verified.dexId,
        chainId: verified.chainId,
        hops: path.length - 1,
        verified: true,
        pairs: path.slice(0, -1).map((token, i) => ({
          tokenA: token,
          tokenB: path[i + 1],
          dexId,
        }))
      };

      // Pick route with highest output
      if (!bestRoute || route.outputAmount > bestRoute.outputAmount) {
        bestRoute = route;
      }
    }

    if (bestRoute) {
      console.log(`[SameChainFinder]   ✅ SUCCESS: Found ${bestRoute.hops}-hop route via ${bestRoute.dexId}`);
      console.log(`[SameChainFinder]   Path: ${bestRoute.path.join(' → ')}`);
      console.log(`[SameChainFinder]   Output: ${bestRoute.outputAmount.toString()}`);
    } else {
      console.log(`[SameChainFinder]   ❌ No route found on chain ${chainId}`);
    }

    return bestRoute;
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
