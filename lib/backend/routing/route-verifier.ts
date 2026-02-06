/**
 * Route Verifier
 *
 * Verifies routes work using router.getAmountsOut.
 * This ensures routes are valid before returning them to users.
 *
 * Features:
 * - Concurrency-limited RPC calls (prevents rate limiting)
 * - Short-lived result cache (avoids duplicate calls for same path)
 * - Cached public clients per chain
 */

import type { Address } from 'viem';
import { createPublicClient, http } from 'viem';
import { bsc, mainnet, polygon, optimism, arbitrum, base } from 'viem/chains';
import { findDEXByDexId, ROUTER_ABI } from './dex-registry';
import { getRpcUrl as getCustomRpcUrl } from '@/lib/backend/utils/rpc-config';

/**
 * Get chain config for public client
 */
function getChain(chainId: number) {
  const chainMap: Record<number, any> = {
    1: mainnet,
    56: bsc,
    137: polygon,
    10: optimism,
    42161: arbitrum,
    8453: base,
  };
  return chainMap[chainId];
}

/**
 * Get RPC URL for chain
 * Uses custom RPC config (Alchemy) for reliability
 */
function getRpcUrl(chainId: number): string {
  // Use custom RPC config (Alchemy URLs)
  const customRpc = getCustomRpcUrl(chainId);
  if (customRpc) {
    return customRpc;
  }

  // Fallback to public RPCs (shouldn't happen if config is complete)
  const rpcMap: Record<number, string> = {
    1: 'https://eth.llamarpc.com',
    56: 'https://bsc-dataseed.binance.org',
    137: 'https://polygon-rpc.com',
    10: 'https://mainnet.optimism.io',
    42161: 'https://arb1.arbitrum.io/rpc',
    8453: 'https://mainnet.base.org',
  };
  return rpcMap[chainId] || 'https://eth.llamarpc.com';
}

/**
 * Cached public clients per chain - avoids recreating on every verification call.
 */
const clientCache = new Map<number, any>();

function getPublicClient(chainId: number) {
  const cached = clientCache.get(chainId);
  if (cached) return cached;

  const chain = getChain(chainId);
  if (!chain) return null;

  const client = createPublicClient({
    chain,
    transport: http(getRpcUrl(chainId), {
      retryCount: 2,
      timeout: 8_000,   // 8s timeout for faster failures (avoids Vercel 10s limit)
    }),
  });
  clientCache.set(chainId, client);
  return client;
}

// ============================================================================
// Concurrency Limiter
// ============================================================================

/**
 * Run async tasks with limited concurrency.
 * Returns PromiseSettledResult[] matching the input array order.
 */
async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      try {
        const value = await tasks[i]();
        results[i] = { status: 'fulfilled', value };
      } catch (reason: any) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  const workerCount = Math.min(limit, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

// ============================================================================
// Route Verification Cache (30-second TTL)
// ============================================================================

interface CacheEntry {
  result: VerifiedRoute | null;
  timestamp: number;
}

const verifyCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30_000; // 30 seconds

function getCacheKey(path: Address[], chainId: number, dexId: string, amountIn: bigint): string {
  return `${chainId}:${dexId}:${path.join('-')}:${amountIn.toString()}`;
}

function getCachedResult(key: string): VerifiedRoute | null | undefined {
  const entry = verifyCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    verifyCache.delete(key);
    return undefined;
  }
  return entry.result;
}

function setCachedResult(key: string, result: VerifiedRoute | null): void {
  verifyCache.set(key, { result, timestamp: Date.now() });
  // Prune old entries every 100 inserts
  if (verifyCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of verifyCache) {
      if (now - v.timestamp > CACHE_TTL) verifyCache.delete(k);
    }
  }
}

// ============================================================================
// Route Verification
// ============================================================================

/**
 * Verified Route
 */
export interface VerifiedRoute {
  path: Address[];
  outputAmount: bigint;
  dexId: string;
  chainId: number;
  valid: true;
}

/**
 * Verify route using router.getAmountsOut
 *
 * - Try full amount first
 * - If fails with liquidity error, try smaller amounts sequentially
 * - Scale output based on test amount that worked
 * - Results cached for 30 seconds
 */
export async function verifyRoute(
  path: Address[],
  chainId: number,
  dexId: string,
  amountIn: bigint
): Promise<VerifiedRoute | null> {
  // Check cache first
  const cacheKey = getCacheKey(path, chainId, dexId, amountIn);
  const cached = getCachedResult(cacheKey);
  if (cached !== undefined) return cached;

  try {
    // Get DEX config
    const dexConfig = findDEXByDexId(chainId, dexId);
    if (!dexConfig) return null;

    // Get cached public client
    const publicClient = getPublicClient(chainId);
    if (!publicClient) return null;

    // Helper to try getAmountsOut with a specific amount
    const tryGetAmountsOut = async (testAmount: bigint): Promise<bigint[] | null> => {
      try {
        const result = await publicClient.readContract({
          address: dexConfig.routerAddress,
          abi: ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [testAmount, path],
        }) as bigint[];

        if (result && result.length > 0 && result[result.length - 1] > BigInt(0)) {
          return result;
        }
        return null;
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || '';
        // Liquidity errors - try smaller amount
        if (errorMsg.includes('K') || errorMsg.includes('constant product') ||
          errorMsg.includes('insufficient') || errorMsg.includes('INSUFFICIENT')) {
          return null;
        }
        throw error;
      }
    };

    let amounts: bigint[] | null = null;

    // Try full amount first
    try {
      amounts = await tryGetAmountsOut(amountIn);
    } catch {
      // Full amount failed, will try smaller
    }

    // If full amount failed, try smaller amounts SEQUENTIALLY (avoids RPC overload)
    if (!amounts || (amounts.length > 0 && amounts[amounts.length - 1] === BigInt(0))) {
      const testAmounts = [
        amountIn / BigInt(10),     // 10%
        amountIn / BigInt(100),    // 1%
        BigInt(10 ** 18),          // 1 token (for 18 decimals)
      ].filter(amt => amt > BigInt(0));

      for (const testAmount of testAmounts) {
        try {
          const testResult = await tryGetAmountsOut(testAmount);
          if (testResult) {
            const testAmountOut = testResult[testResult.length - 1];
            const ratio = amountIn / testAmount;

            let scaleFactor = BigInt(100);
            if (ratio > BigInt(100)) scaleFactor = BigInt(75);
            else if (ratio > BigInt(10)) scaleFactor = BigInt(90);

            const estimatedAmountOut = (testAmountOut * ratio * scaleFactor) / BigInt(100);

            amounts = [amountIn];
            for (let j = 0; j < path.length - 1; j++) {
              if (j === path.length - 2) {
                amounts.push(estimatedAmountOut);
              } else {
                const intermediateOut = testResult[j + 1];
                amounts.push((intermediateOut * ratio * scaleFactor) / BigInt(100));
              }
            }
            break; // Found working amount, stop trying
          }
        } catch {
          // Try next amount
        }
      }
    }

    // Check if we have valid amounts
    if (!amounts || amounts.length === 0 || amounts.length !== path.length) {
      setCachedResult(cacheKey, null);
      return null;
    }

    if (amounts[0] !== amountIn) {
      setCachedResult(cacheKey, null);
      return null;
    }

    const outputAmount = amounts[amounts.length - 1];
    if (outputAmount === BigInt(0)) {
      setCachedResult(cacheKey, null);
      return null;
    }

    const result: VerifiedRoute = {
      path,
      outputAmount,
      dexId,
      chainId,
      valid: true,
    };

    setCachedResult(cacheKey, result);
    return result;
  } catch (error: any) {
    // Route doesn't work
    setCachedResult(cacheKey, null);
    return null;
  }
}

/**
 * Verify multiple routes with concurrency control and return the best one
 *
 * @param routes Array of routes to verify
 * @param chainId Chain ID
 * @param amountIn Input amount
 * @param concurrency Max concurrent verifications (default: 8)
 * @returns Best verified route or null
 */
export async function verifyRoutes(
  routes: Array<{ path: Address[]; dexId: string }>,
  chainId: number,
  amountIn: bigint,
  concurrency: number = 8
): Promise<VerifiedRoute | null> {
  // Verify routes with concurrency limiter
  const tasks = routes.map(route => () => verifyRoute(route.path, chainId, route.dexId, amountIn));
  const results = await withConcurrency(tasks, concurrency);

  // Filter out null results
  const validRoutes = results
    .filter((r): r is PromiseFulfilledResult<VerifiedRoute | null> =>
      r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value!);

  if (validRoutes.length === 0) return null;

  // Return route with highest output
  return validRoutes.reduce((best, current) =>
    current.outputAmount > best.outputAmount ? current : best
  );
}

/**
 * Exported concurrency helper for use by other modules (e.g., same-chain-finder)
 */
export { withConcurrency };
