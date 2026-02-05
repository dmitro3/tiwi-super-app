/**
 * Same-Chain Route Finder
 *
 * Finds routes for swaps on the same chain using a Breadth-First Search (BFS)
 * through prioritized intermediaries, verified by on-chain router quotes.
 *
 * Algorithm:
 * 1. Direct [From -> To] (all DEXes)
 * 2. 2-Hop [From -> Intermediary -> To] (all DEXes)
 * 3. 3-Hop [From -> Int1 -> Int2 -> To] (primary DEX only, top 4 intermediaries)
 *
 * Uses concurrency-limited verification to avoid RPC rate limiting.
 */

import type { Address } from 'viem';
import { getIntermediaries } from './intermediaries';
import { verifyRoute, withConcurrency } from './route-verifier';
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
 * Internal type for path + dexId pairing
 */
interface PathCandidate {
  path: Address[];
  dexId: string;
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
    console.log(`\n[SameChainFinder] Finding route: ${fromTokenSymbol || fromToken.slice(0, 8)} → ${toTokenSymbol || toToken.slice(0, 8)} (Chain ${chainId})`);

    const intermediaries = getIntermediaries(chainId);
    const supportedDEXes = getSupportedDEXes(chainId);

    if (supportedDEXes.length === 0) {
      console.warn(`[SameChainFinder] No supported DEXes on chain ${chainId}`);
      return null;
    }

    const from = fromToken.toLowerCase() as Address;
    const to = toToken.toLowerCase() as Address;
    const dexIds = supportedDEXes.map(d => d.dexId);

    // Build candidate paths with DEX pairings
    const candidates: PathCandidate[] = [];

    // 1. Direct path - try ALL DEXes
    for (const dexId of dexIds) {
      candidates.push({ path: [from, to], dexId });
    }

    // 2. 2-Hop paths - try ALL DEXes
    for (const intermediary of intermediaries) {
      const intAddr = intermediary.address.toLowerCase() as Address;
      if (intAddr === from || intAddr === to) continue;
      for (const dexId of dexIds) {
        candidates.push({ path: [from, intAddr, to], dexId });
      }
    }

    // 3. 3-Hop paths - primary DEX only, top 4 intermediaries (reduces RPC load)
    const primaryDexId = dexIds[0];
    const topIntermediaries = intermediaries.slice(0, 4);
    for (let i = 0; i < topIntermediaries.length; i++) {
      for (let j = 0; j < topIntermediaries.length; j++) {
        if (i === j) continue;
        const int1 = topIntermediaries[i].address.toLowerCase() as Address;
        const int2 = topIntermediaries[j].address.toLowerCase() as Address;
        if (int1 === from || int1 === to || int2 === from || int2 === to) continue;
        candidates.push({ path: [from, int1, int2, to], dexId: primaryDexId });
      }
    }

    console.log(`[SameChainFinder]   ${candidates.length} candidates (${dexIds.length} DEXes, ${intermediaries.length} intermediaries)`);

    // Verify with concurrency limit of 8 to avoid RPC rate limiting
    const startTime = Date.now();
    const tasks = candidates.map(c => () => verifyRoute(c.path, chainId, c.dexId, amountIn));
    const results = await withConcurrency(tasks, 8);
    console.log(`[SameChainFinder]   Verification took ${Date.now() - startTime}ms`);

    let bestRoute: SameChainRoute | null = null;

    for (let idx = 0; idx < results.length; idx++) {
      const result = results[idx];
      if (result.status !== 'fulfilled' || !result.value) continue;

      const verified = result.value;
      if (verified.outputAmount <= BigInt(0)) continue;

      const candidate = candidates[idx];
      const route: SameChainRoute = {
        path: verified.path,
        outputAmount: verified.outputAmount,
        dexId: verified.dexId,
        chainId: verified.chainId,
        hops: candidate.path.length - 1,
        verified: true,
        pairs: candidate.path.slice(0, -1).map((token, i) => ({
          tokenA: token,
          tokenB: candidate.path[i + 1],
          dexId: candidate.dexId,
        }))
      };

      if (!bestRoute || route.outputAmount > bestRoute.outputAmount) {
        bestRoute = route;
      }
    }

    if (bestRoute) {
      console.log(`[SameChainFinder]   Found ${bestRoute.hops}-hop route via ${bestRoute.dexId} (${Date.now() - startTime}ms)`);
    } else {
      console.log(`[SameChainFinder]   No route found on chain ${chainId}`);
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
