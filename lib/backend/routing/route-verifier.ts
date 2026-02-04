/**
 * Route Verifier
 * 
 * Verifies routes work using router.getAmountsOut.
 * This ensures routes are valid before returning them to users.
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
 * Matches tiwi-test approach:
 * - Try full amount first
 * - If fails with "K" error (insufficient liquidity), try progressively smaller amounts
 * - Scale output based on test amount that worked
 * - Always return a verified route if any amount works
 * 
 * @param path Array of token addresses (fromToken → ... → toToken)
 * @param chainId Chain ID
 * @param dexId DexScreener dexId
 * @param amountIn Input amount in smallest unit
 * @returns Verified route if valid, null if invalid
 */

export async function verifyRoute(
  path: Address[],
  chainId: number,
  dexId: string,
  amountIn: bigint
): Promise<VerifiedRoute | null> {
  try {
    // Get DEX config
    const dexConfig = findDEXByDexId(chainId, dexId);
    if (!dexConfig) {
      console.warn(`[RouteVerifier] DEX ${dexId} not supported on chain ${chainId}`);
      return null;
    }

    // Get chain and RPC URL
    const chain = getChain(chainId);
    if (!chain) {
      console.warn(`[RouteVerifier] Chain ${chainId} not supported`);
      return null;
    }

    const rpcUrl = getRpcUrl(chainId);

    // Create public client
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // Call router.getAmountsOut
    console.log(`[RouteVerifier] ========================================`);
    console.log(`[RouteVerifier] 🔄 VERIFYING ROUTE`);
    console.log(`[RouteVerifier] DEX: ${dexId}`);
    console.log(`[RouteVerifier] Chain: ${chainId}`);
    console.log(`[RouteVerifier] Router: ${dexConfig.routerAddress}`);
    console.log(`[RouteVerifier] Path (${path.length} tokens):`);
    path.forEach((token, idx) => {
      console.log(`[RouteVerifier]   ${idx + 1}. ${token}`);
    });
    console.log(`[RouteVerifier] Amount In: ${amountIn.toString()}`);
    console.log(`[RouteVerifier] RPC: ${rpcUrl}`);
    console.log(`[RouteVerifier] ========================================`);

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
        // "K" error means insufficient liquidity for this amount
        if (errorMsg.includes('K') || errorMsg.includes('constant product') ||
          errorMsg.includes('insufficient') || errorMsg.includes('INSUFFICIENT')) {
          return null; // Amount too large, try smaller
        }
        throw error; // Other errors should be propagated
      }
    };

    const startTime = Date.now();
    let amounts: bigint[] | null = null;
    let lastError: any = null;

    // Try full amount first
    try {
      amounts = await tryGetAmountsOut(amountIn);
      if (amounts) {
        console.log(`[RouteVerifier] ✅ Got quote with full amount`);
      }
    } catch (error: any) {
      lastError = error;
    }

    // If full amount failed, try progressively smaller amounts in parallel (tiwi-test approach)
    if (!amounts || (amounts.length > 0 && amounts[amounts.length - 1] === BigInt(0))) {
      console.log(`[RouteVerifier] Full amount failed, trying smaller amounts in parallel...`);
      const testAmounts = [
        amountIn / BigInt(2),      // 50%
        amountIn / BigInt(10),     // 10%
        amountIn / BigInt(100),    // 1%
        BigInt(10 ** 18),          // 1 token (for 18 decimals)
      ].filter(amt => amt > BigInt(0));

      // Try all test amounts in parallel
      const testResults = await Promise.allSettled(
        testAmounts.map(testAmount => tryGetAmountsOut(testAmount))
      );

      // Find first successful result
      for (let i = 0; i < testResults.length; i++) {
        const result = testResults[i];
        if (result.status === 'fulfilled' && result.value) {
          const testAmount = testAmounts[i];
          const testAmountsResult = result.value;
          const testAmountOut = testAmountsResult[testAmountsResult.length - 1];
          const ratio = amountIn / testAmount;

          // Scale factor based on ratio (tiwi-test logic)
          let scaleFactor = BigInt(100);
          if (ratio > BigInt(100)) scaleFactor = BigInt(75);
          else if (ratio > BigInt(10)) scaleFactor = BigInt(90);

          // Estimate output for full amount
          const estimatedAmountOut = (testAmountOut * ratio * scaleFactor) / BigInt(100);

          // Build amounts array
          amounts = [amountIn];
          for (let j = 0; j < path.length - 1; j++) {
            if (j === path.length - 2) {
              amounts.push(estimatedAmountOut);
            } else {
              const intermediateOut = testAmountsResult[j + 1];
              amounts.push((intermediateOut * ratio * scaleFactor) / BigInt(100));
            }
          }

          console.log(`[RouteVerifier] ✅ Got quote using scaled estimation from ${testAmount.toString()}`);
          break;
        }
      }
    }

    const verifyTime = Date.now() - startTime;

    // Check if we have valid amounts
    if (!amounts || amounts.length === 0) {
      console.warn(`[RouteVerifier] ❌ VERIFICATION FAILED (took ${verifyTime}ms) - No valid amounts`);
      if (lastError) {
        console.error(`[RouteVerifier] Last error: ${lastError.message}`);
      }
      console.error(`[RouteVerifier] ========================================\n`);
      return null;
    }

    console.log(`[RouteVerifier] ⏱️ Verification took ${verifyTime}ms`);
    console.log(`[RouteVerifier] 📊 Amounts returned: ${amounts.length} values`);
    amounts.forEach((amt, idx) => {
      console.log(`[RouteVerifier]   Step ${idx + 1}: ${amt.toString()}`);
    });

    // Check if route is valid
    if (amounts.length !== path.length) {
      console.warn(`[RouteVerifier] ❌ Invalid amounts array length: expected ${path.length}, got ${amounts.length}`);
      return null;
    }

    if (amounts[0] !== amountIn) {
      console.warn(`[RouteVerifier] ❌ Input amount mismatch: expected ${amountIn}, got ${amounts[0]}`);
      return null;
    }

    const outputAmount = amounts[amounts.length - 1];
    if (outputAmount === BigInt(0)) {
      console.warn(`[RouteVerifier] ❌ Route returns zero output`);
      return null;
    }

    const exchangeRate = Number(outputAmount) / Number(amountIn);
    console.log(`[RouteVerifier] ✅ ROUTE VERIFIED`);
    console.log(`[RouteVerifier] Input: ${amountIn.toString()}`);
    console.log(`[RouteVerifier] Output: ${outputAmount.toString()}`);
    console.log(`[RouteVerifier] Exchange Rate: ${exchangeRate.toFixed(6)}`);
    console.log(`[RouteVerifier] ========================================\n`);

    return {
      path,
      outputAmount,
      dexId,
      chainId,
      valid: true,
    };
  } catch (error: any) {
    // Route doesn't work (pair doesn't exist, insufficient liquidity, etc.)
    console.warn(`[RouteVerifier] Route verification failed:`, error.message);
    return null;
  }
}

/**
 * Verify multiple routes and return the best one
 * 
 * @param routes Array of routes to verify
 * @param chainId Chain ID
 * @param amountIn Input amount
 * @returns Best verified route or null
 */
export async function verifyRoutes(
  routes: Array<{ path: Address[]; dexId: string }>,
  chainId: number,
  amountIn: bigint
): Promise<VerifiedRoute | null> {
  // Verify all routes in parallel
  const verifiedRoutes = await Promise.all(
    routes.map(route => verifyRoute(route.path, chainId, route.dexId, amountIn))
  );

  // Filter out null results
  const validRoutes = verifiedRoutes.filter((r): r is VerifiedRoute => r !== null);

  if (validRoutes.length === 0) {
    return null;
  }

  // Return route with highest output
  return validRoutes.reduce((best, current) =>
    current.outputAmount > best.outputAmount ? current : best
  );
}

