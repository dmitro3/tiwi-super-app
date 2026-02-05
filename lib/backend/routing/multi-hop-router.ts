/**
 * Multi-Hop Router
 *
 * Finds routes through intermediate tokens when direct routes are unavailable.
 * Example: TWC → USDT → ETH (when TWC → ETH has no direct route)
 */

import type { Address } from 'viem';
import type { RouterRoute, RouterParams } from '../routers/types';
import { getRouterRegistry } from '../routers/registry';
import { toSmallestUnit } from '../routers/transformers/amount-transformer';
import { getTokenDecimalsFetcher } from '../utils/token-decimals-fetcher';
import { getBridgeableTokens, getIntermediaries, getWrappedNativeToken, getDestinationBridgeToken } from './intermediaries';
import { getSameChainRouteFinder } from './same-chain-finder';
import { convertSameChainRouteToRouterRoute } from './route-converter';

/**
 * Convert a human-readable amount from RouterRoute.toToken.amount
 * back to smallest unit (wei) for passing as fromAmount to the next router.
 *
 * RouterRoute returns amounts in human-readable format (e.g., "0.000000417108020265")
 * but RouterParams.fromAmount expects smallest unit (e.g., "417108020265")
 */
function toWei(humanReadableAmount: string, decimals: number = 18): string {
  const result = toSmallestUnit(humanReadableAmount, decimals);
  console.log(`[MultiHopRouter] 💱 Amount conversion: "${humanReadableAmount}" (human) → "${result}" (wei, ${decimals} decimals)`);
  return result;
}


/**
 * Multi-hop route result
 */
export interface MultiHopRoute {
  hop1: RouterRoute; // First hop (fromToken → intermediate)
  hop2: RouterRoute; // Second hop (intermediate → toToken)
  bridgeRoute?: RouterRoute; // Optional bridge step for cross-chain
  intermediateToken: Address;
  totalOutputAmount: string;
  combinedRoute: RouterRoute; // Combined route for execution
}

/**
 * Multi-Hop Router
 *
 * Finds routes through intermediate tokens
 */
export class MultiHopRouter {
  private registry = getRouterRegistry();
  private decimalsFetcher = getTokenDecimalsFetcher();

  /**
   * Find multi-hop route through intermediate tokens
   * Supports both same-chain and cross-chain multi-hop routing
   *
   * @param fromToken Source token
   * @param toToken Destination token
   * @param fromChainId Source chain ID
   * @param toChainId Destination chain ID
   * @param amountIn Input amount (in smallest unit)
   * @param fromAddress User's wallet address
   * @returns Multi-hop route or null if no route found
   */
  async findMultiHopRoute(
    fromToken: Address,
    toToken: Address,
    fromChainId: number,
    toChainId: number,
    amountIn: string,
    fromAddress?: Address
  ): Promise<MultiHopRoute | null> {
    // Detect if this is a cross-chain swap
    if (fromChainId !== toChainId) {
      console.log('[MultiHopRouter] 🌉 Cross-chain multi-hop detected, delegating to cross-chain handler');
      return this.findCrossChainMultiHopRoute(
        fromToken,
        toToken,
        fromChainId,
        toChainId,
        amountIn,
        fromAddress
      );
    }

    // Same-chain multi-hop routing (original implementation)
    const chainId = fromChainId;
    console.log('\n========================================');
    console.log('[MultiHopRouter] 🔄 MULTI-HOP ROUTING STARTED');
    console.log('[MultiHopRouter] Finding multi-hop route:', {
      fromToken,
      toToken,
      chainId,
      amountIn,
      fromAddress,
    });
    console.log('========================================\n');

    // STEP 1: Use prioritized intermediaries (no DexScreener)
    console.log('[MultiHopRouter] 📍 STEP 1: Using prioritized intermediaries...');
    const intermediateTokens = getIntermediaries(chainId)
      .map((token) => token.address.toLowerCase())
      .filter((token) => token !== fromToken.toLowerCase() && token !== toToken.toLowerCase())
      .slice(0, 10);

    console.log('[MultiHopRouter] Found', intermediateTokens.length, 'intermediate tokens (prioritized):', intermediateTokens);

    if (intermediateTokens.length === 0) {
      console.warn('[MultiHopRouter] ❌ No intermediate tokens available');
      return null;
    }

    // STEP 2: Get eligible routers ONCE (not inside loop)
    const routers = await this.registry.getEligibleRouters(chainId, chainId);
    console.log('[MultiHopRouter] Found', routers.length, 'eligible routers');

    if (routers.length === 0) {
      console.warn('[MultiHopRouter] ❌ No eligible routers');
      return null;
    }

    // STEP 3: Fire ALL hop1 attempts in parallel (all intermediates × first router)
    console.log('[MultiHopRouter] 📍 STEP 3: Finding hop1 routes in parallel for all intermediates...');
    const startTime = Date.now();

    // Helper: try all routers for a single hop, return first success
    const tryRoutersForHop = async (params: RouterParams): Promise<RouterRoute | null> => {
      // Try all routers in parallel, pick first success
      const results = await Promise.allSettled(
        routers.map(router => router.getRoute(params))
      );
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) return result.value;
      }
      return null;
    };

    // Fire all hop1 attempts in parallel
    const hop1Results = await Promise.allSettled(
      intermediateTokens.map(intermediate =>
        tryRoutersForHop({
          fromChainId: chainId,
          fromToken: fromToken as string,
          fromAmount: amountIn,
          fromDecimals: 18,
          toChainId: chainId,
          toToken: intermediate as string,
          toDecimals: 18,
          fromAddress: fromAddress,
          slippage: 0.5,
        })
      )
    );
    console.log(`[MultiHopRouter] ⚡ Parallel hop1 scan took ${Date.now() - startTime}ms`);

    // STEP 4: For each successful hop1, fire hop2 in parallel
    const hop2Candidates: Array<{ intermediate: string; hop1Route: RouterRoute; hop1Output: string; hop1Decimals: number }> = [];
    for (let i = 0; i < hop1Results.length; i++) {
      const result = hop1Results[i];
      if (result.status !== 'fulfilled' || !result.value) continue;
      const hop1Route = result.value;
      const hop1OutputHuman = hop1Route.toToken.amount;
      const hop1Decimals = hop1Route.toToken.decimals || 18;
      const hop1Output = toWei(hop1OutputHuman, hop1Decimals);
      hop2Candidates.push({ intermediate: intermediateTokens[i], hop1Route, hop1Output, hop1Decimals });
    }

    if (hop2Candidates.length === 0) {
      console.log('[MultiHopRouter] ❌ No hop1 routes found for any intermediate');
      return null;
    }

    console.log(`[MultiHopRouter] 📍 STEP 4: Found ${hop2Candidates.length} hop1 routes, finding hop2 in parallel...`);
    const hop2Start = Date.now();

    const hop2Results = await Promise.allSettled(
      hop2Candidates.map(({ hop1Output, hop1Decimals, intermediate }) =>
        tryRoutersForHop({
          fromChainId: chainId,
          fromToken: intermediate as string,
          fromAmount: hop1Output,
          fromDecimals: hop1Decimals,
          toChainId: chainId,
          toToken: toToken as string,
          toDecimals: 18,
          fromAddress: fromAddress,
          slippage: 0.5,
        })
      )
    );
    console.log(`[MultiHopRouter] ⚡ Parallel hop2 scan took ${Date.now() - hop2Start}ms`);

    // STEP 5: Pick best complete route (highest output)
    let bestResult: MultiHopRoute | null = null;
    let bestOutput = 0;

    for (let i = 0; i < hop2Results.length; i++) {
      const result = hop2Results[i];
      if (result.status !== 'fulfilled' || !result.value) continue;
      const hop2Route = result.value;
      const { hop1Route, intermediate } = hop2Candidates[i];
      const totalOutput = hop2Route.toToken.amount;
      const outputNum = parseFloat(totalOutput);

      if (outputNum > bestOutput) {
        bestOutput = outputNum;
        const combinedRoute = this.createCombinedRoute(
          hop1Route, hop2Route, fromToken, toToken, chainId, amountIn, totalOutput
        );
        bestResult = {
          hop1: hop1Route,
          hop2: hop2Route,
          intermediateToken: intermediate as Address,
          totalOutputAmount: totalOutput,
          combinedRoute,
        };
      }
    }

    if (bestResult) {
      console.log(`[MultiHopRouter] ✅ Best multi-hop route found (total: ${Date.now() - startTime}ms)`, {
        intermediate: bestResult.intermediateToken.slice(0, 10) + '...',
        output: bestResult.totalOutputAmount,
      });
    } else {
      console.log('[MultiHopRouter] ❌ No complete multi-hop route found');
    }

    return bestResult;
  }

  /**
   * Find cross-chain multi-hop route
   * Example: TWC (BSC) → WBNB (BSC) → WBNB (Arbitrum) → ETH (Arbitrum)
   *
   * @param fromToken Source token on source chain
   * @param toToken Destination token on destination chain
   * @param fromChainId Source chain ID
   * @param toChainId Destination chain ID
   * @param amountIn Input amount (in smallest unit)
   * @param fromAddress User's wallet address
   * @returns Cross-chain multi-hop route or null if no route found
   */
  async findCrossChainMultiHopRoute(
    fromToken: Address,
    toToken: Address,
    fromChainId: number,
    toChainId: number,
    amountIn: string,
    fromAddress?: Address
  ): Promise<MultiHopRoute | null> {
    console.log('\n========================================');
    console.log('[MultiHopRouter] 🌉 CROSS-CHAIN MULTI-HOP ROUTING STARTED');
    console.log('[MultiHopRouter] Finding cross-chain multi-hop route:', {
      fromToken,
      toToken,
      fromChainId,
      toChainId,
      amountIn,
      fromAddress,
    });
    console.log('========================================\n');

    // STEP 1: Use predefined bridgeable tokens (no DexScreener)
    console.log('[MultiHopRouter] 📍 STEP 1: Using predefined bridgeable tokens...');
    const sourceIntermediaries = getIntermediaries(fromChainId);
    const bridgeableTokenAddresses = getBridgeableTokens(fromChainId);
    const potentialBridgeTokens = bridgeableTokenAddresses
      .map((address) => {
        const match = sourceIntermediaries.find(
          (token) => token.address.toLowerCase() === address.toLowerCase()
        );
        return match ? { address: address as Address, symbol: match.symbol } : null;
      })
      .filter((token): token is { address: Address; symbol: string } => token !== null);

    console.log('[MultiHopRouter] Found', potentialBridgeTokens.length, 'potential bridge tokens on source chain:',
      potentialBridgeTokens.map(t => t.symbol));

    if (potentialBridgeTokens.length === 0) {
      console.warn('[MultiHopRouter] ❌ No bridgeable tokens found on source chain');
      return null;
    }

    // STEP 2: Pre-resolve all bridge token destinations and fetch routers ONCE
    const amountInBigInt = BigInt(amountIn);
    const sameChainFinder = getSameChainRouteFinder();
    const bridgeRouters = await this.registry.getEligibleRouters(fromChainId, toChainId);

    // Filter bridge tokens that have valid destination mappings
    const validBridgeTokens = potentialBridgeTokens
      .map(bt => ({
        ...bt,
        destToken: this.resolveBridgeTokenOnDest(bt.address, fromChainId, toChainId),
      }))
      .filter((bt): bt is typeof bt & { destToken: Address } => bt.destToken !== null);

    if (validBridgeTokens.length === 0) {
      console.warn('[MultiHopRouter] ❌ No bridge tokens with valid destination mappings');
      return null;
    }

    console.log('[MultiHopRouter] 📍 STEP 2: Trying', validBridgeTokens.length, 'bridge tokens in PARALLEL...');
    const startTime = Date.now();

    // STEP 3: Try ALL bridge tokens in parallel
    const bridgeAttempts = await Promise.allSettled(
      validBridgeTokens.map(async (bridgeToken) => {
        // Hop 1: fromToken → bridgeToken on source chain
        const sourceRoute = await sameChainFinder.findRoute(
          fromToken, bridgeToken.address, fromChainId, amountInBigInt
        );
        if (!sourceRoute) return null;

        const hop1Route = await convertSameChainRouteToRouterRoute(
          sourceRoute,
          { address: fromToken },
          { address: bridgeToken.address },
          amountInBigInt,
          fromChainId
        );

        const hop1Output = sourceRoute.outputAmount.toString();

        // Fetch decimals in parallel
        const [bridgeTokenDecimals, destBridgeTokenDecimals] = await Promise.all([
          this.decimalsFetcher.getTokenDecimals(bridgeToken.address, fromChainId),
          this.decimalsFetcher.getTokenDecimals(bridgeToken.destToken, toChainId),
        ]);

        // Bridge: try all bridge routers in parallel, pick first success
        const bridgeResults = await Promise.allSettled(
          bridgeRouters.map(router =>
            router.getRoute({
              fromChainId,
              fromToken: bridgeToken.address as string,
              fromAmount: hop1Output,
              fromDecimals: bridgeTokenDecimals,
              toChainId,
              toToken: bridgeToken.destToken as string,
              toDecimals: destBridgeTokenDecimals,
              fromAddress: fromAddress,
              slippage: 0.5,
            })
          )
        );
        let bridgeRoute: RouterRoute | null = null;
        for (const r of bridgeResults) {
          if (r.status === 'fulfilled' && r.value) { bridgeRoute = r.value; break; }
        }
        if (!bridgeRoute) return null;

        // Convert bridge output to wei
        const bridgeOutputHuman = bridgeRoute.toToken.amount;
        const bridgeDecimals = bridgeRoute.toToken.decimals || 18;
        const bridgeOutput = toWei(bridgeOutputHuman, bridgeDecimals);

        // Hop 2: destBridgeToken → toToken on destination chain
        const destRoute = await sameChainFinder.findRoute(
          bridgeToken.destToken, toToken, toChainId, BigInt(bridgeOutput)
        );
        if (!destRoute) return null;

        const hop2Route = await convertSameChainRouteToRouterRoute(
          destRoute,
          { address: bridgeToken.destToken },
          { address: toToken },
          BigInt(bridgeOutput),
          toChainId
        );

        return { hop1Route, bridgeRoute, hop2Route, bridgeToken };
      })
    );
    console.log(`[MultiHopRouter] ⚡ Parallel bridge token scan took ${Date.now() - startTime}ms`);

    // STEP 4: Pick the best result (highest output)
    let bestResult: MultiHopRoute | null = null;
    let bestOutput = 0;

    for (const attempt of bridgeAttempts) {
      if (attempt.status !== 'fulfilled' || !attempt.value) continue;
      const { hop1Route, bridgeRoute, hop2Route, bridgeToken } = attempt.value;
      const totalOutput = hop2Route.toToken.amount;
      const outputNum = parseFloat(totalOutput);

      if (outputNum > bestOutput) {
        bestOutput = outputNum;
        const combinedRoute = this.createCrossChainCombinedRoute(
          hop1Route, bridgeRoute, hop2Route, fromToken, toToken,
          fromChainId, toChainId, amountIn, totalOutput, [], []
        );
        bestResult = {
          hop1: hop1Route,
          bridgeRoute,
          hop2: hop2Route,
          intermediateToken: bridgeToken.address as Address,
          totalOutputAmount: totalOutput,
          combinedRoute,
        };
      }
    }

    if (bestResult) {
      console.log(`[MultiHopRouter] ✅ Best cross-chain route found (total: ${Date.now() - startTime}ms)`, {
        bridge: bestResult.intermediateToken.slice(0, 10) + '...',
        output: bestResult.totalOutputAmount,
      });
    } else {
      console.log('[MultiHopRouter] ❌ No cross-chain multi-hop route found');
    }

    return bestResult;
  }

  /**
   * Create a combined route from two hops
   */
  private createCombinedRoute(
    hop1: RouterRoute,
    hop2: RouterRoute,
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: string,
    totalOutput: string
  ): RouterRoute {
    // Create properly formatted swap steps for multi-step executor
    const steps = [];

    // Step 1: First swap (fromToken → intermediate)
    steps.push({
      type: 'swap' as const,
      chainId,
      fromToken: {
        address: hop1.fromToken.address,
        amount: hop1.fromToken.amount,
        symbol: hop1.fromToken.symbol,
      },
      toToken: {
        address: hop1.toToken.address,
        amount: hop1.toToken.amount,
        symbol: hop1.toToken.symbol,
      },
      protocol: hop1.router,
      description: `Swap via ${hop1.router}`,
    });

    // Step 2: Second swap (intermediate → toToken)
    steps.push({
      type: 'swap' as const,
      chainId,
      fromToken: {
        address: hop2.fromToken.address,
        amount: hop2.fromToken.amount,
        symbol: hop2.fromToken.symbol,
      },
      toToken: {
        address: hop2.toToken.address,
        amount: hop2.toToken.amount,
        symbol: hop2.toToken.symbol,
      },
      protocol: hop2.router,
      description: `Swap via ${hop2.router}`,
    });

    return {
      router: 'multi-hop',
      routeId: `multi-hop-${Date.now()}`,
      fromToken: {
        address: fromToken,
        chainId,
        symbol: hop1.fromToken.symbol,
        decimals: hop1.fromToken.decimals,
        amount: amountIn,
      },
      toToken: {
        address: toToken,
        chainId,
        symbol: hop2.toToken.symbol,
        decimals: hop2.toToken.decimals,
        amount: totalOutput,
      },
      exchangeRate: (parseFloat(totalOutput) / parseFloat(amountIn)).toString(),
      priceImpact: (parseFloat(hop1.priceImpact) + parseFloat(hop2.priceImpact)).toString(),
      slippage: '0.5',
      steps,
      fees: {
        protocol: (parseFloat(hop1.fees.protocol) + parseFloat(hop2.fees.protocol)).toString(),
        gas: (parseFloat(hop1.fees.gas) + parseFloat(hop2.fees.gas)).toString(),
        gasUSD: (parseFloat(hop1.fees.gasUSD) + parseFloat(hop2.fees.gasUSD)).toString(),
        total: (parseFloat(hop1.fees.total) + parseFloat(hop2.fees.total)).toString(),
      },
      estimatedTime: (hop1.estimatedTime || 0) + (hop2.estimatedTime || 0),
      expiresAt: Math.min(hop1.expiresAt || Infinity, hop2.expiresAt || Infinity),
      raw: {
        hop1: hop1.raw,
        hop2: hop2.raw,
        intermediateToken: hop1.toToken.address,
        isMultiHop: true,
      },
    };
  }

  /**
   * Resolve a bridge token to the destination chain address using centralized mapping.
   */
  private resolveBridgeTokenOnDest(sourceToken: Address, sourceChainId: number, destChainId: number): Address | null {
    return getDestinationBridgeToken(sourceToken, sourceChainId, destChainId);
  }

  /**
   * Create a combined route from multiple steps (swap + bridge + swap, with optional intermediates)
   */
  private createCrossChainCombinedRoute(
    hop1: RouterRoute,
    bridgeRoute: RouterRoute,
    hop2: RouterRoute,
    fromToken: Address,
    toToken: Address,
    fromChainId: number,
    toChainId: number,
    amountIn: string,
    totalOutput: string,
    sourceChainIntermediates: RouterRoute[] = [],
    destChainIntermediates: RouterRoute[] = []
  ): RouterRoute {
    // Create properly formatted steps for multi-step executor
    const steps = [];
    let totalFees = { protocol: 0, gas: 0, gasUSD: 0, total: 0 };
    let totalPriceImpact = 0;
    let totalEstimatedTime = 0;

    // Add source chain steps (either direct or multi-hop)
    if (sourceChainIntermediates.length > 0) {
      // Multi-hop on source chain: fromToken → intermediate → bridgeToken
      for (const route of sourceChainIntermediates) {
        steps.push({
          type: 'swap' as const,
          chainId: fromChainId,
          fromToken: {
            address: route.fromToken.address,
            amount: route.fromToken.amount,
            symbol: route.fromToken.symbol,
          },
          toToken: {
            address: route.toToken.address,
            amount: route.toToken.amount,
            symbol: route.toToken.symbol,
          },
          protocol: route.router,
          description: `Swap via ${route.router} on chain ${fromChainId}`,
        });
        totalFees.protocol += parseFloat(route.fees.protocol);
        totalFees.gas += parseFloat(route.fees.gas);
        totalFees.gasUSD += parseFloat(route.fees.gasUSD);
        totalFees.total += parseFloat(route.fees.total);
        totalPriceImpact += parseFloat(route.priceImpact);
        totalEstimatedTime += route.estimatedTime || 0;
      }
    } else {
      // Direct swap on source chain: fromToken → bridgeToken
      steps.push({
        type: 'swap' as const,
        chainId: fromChainId,
        fromToken: {
          address: hop1.fromToken.address,
          amount: hop1.fromToken.amount,
          symbol: hop1.fromToken.symbol,
        },
        toToken: {
          address: hop1.toToken.address,
          amount: hop1.toToken.amount,
          symbol: hop1.toToken.symbol,
        },
        protocol: hop1.router,
        description: `Swap via ${hop1.router} on chain ${fromChainId}`,
      });
      totalFees.protocol += parseFloat(hop1.fees.protocol);
      totalFees.gas += parseFloat(hop1.fees.gas);
      totalFees.gasUSD += parseFloat(hop1.fees.gasUSD);
      totalFees.total += parseFloat(hop1.fees.total);
      totalPriceImpact += parseFloat(hop1.priceImpact);
      totalEstimatedTime += hop1.estimatedTime || 0;
    }

    // Add bridge step
    steps.push({
      type: 'bridge' as const,
      chainId: fromChainId, // Bridge starts on source chain
      fromToken: {
        address: bridgeRoute.fromToken.address,
        amount: bridgeRoute.fromToken.amount,
        symbol: bridgeRoute.fromToken.symbol,
      },
      toToken: {
        address: bridgeRoute.toToken.address,
        amount: bridgeRoute.toToken.amount,
        symbol: bridgeRoute.toToken.symbol,
      },
      protocol: bridgeRoute.router,
      description: `Bridge via ${bridgeRoute.router} from chain ${fromChainId} to ${toChainId}`,
    });
    totalFees.protocol += parseFloat(bridgeRoute.fees.protocol);
    totalFees.gas += parseFloat(bridgeRoute.fees.gas);
    totalFees.gasUSD += parseFloat(bridgeRoute.fees.gasUSD);
    totalFees.total += parseFloat(bridgeRoute.fees.total);
    totalPriceImpact += parseFloat(bridgeRoute.priceImpact);
    totalEstimatedTime += bridgeRoute.estimatedTime || 0;

    // Add destination chain steps (either direct or multi-hop)
    if (destChainIntermediates.length > 0) {
      // Multi-hop on destination chain: bridgeToken → intermediate → toToken
      for (const route of destChainIntermediates) {
        steps.push({
          type: 'swap' as const,
          chainId: toChainId,
          fromToken: {
            address: route.fromToken.address,
            amount: route.fromToken.amount,
            symbol: route.fromToken.symbol,
          },
          toToken: {
            address: route.toToken.address,
            amount: route.toToken.amount,
            symbol: route.toToken.symbol,
          },
          protocol: route.router,
          description: `Swap via ${route.router} on chain ${toChainId}`,
        });
        totalFees.protocol += parseFloat(route.fees.protocol);
        totalFees.gas += parseFloat(route.fees.gas);
        totalFees.gasUSD += parseFloat(route.fees.gasUSD);
        totalFees.total += parseFloat(route.fees.total);
        totalPriceImpact += parseFloat(route.priceImpact);
        totalEstimatedTime += route.estimatedTime || 0;
      }
    } else {
      // Direct swap on destination chain: bridgeToken → toToken
      steps.push({
        type: 'swap' as const,
        chainId: toChainId,
        fromToken: {
          address: hop2.fromToken.address,
          amount: hop2.fromToken.amount,
          symbol: hop2.fromToken.symbol,
        },
        toToken: {
          address: hop2.toToken.address,
          amount: hop2.toToken.amount,
          symbol: hop2.toToken.symbol,
        },
        protocol: hop2.router,
        description: `Swap via ${hop2.router} on chain ${toChainId}`,
      });
      totalFees.protocol += parseFloat(hop2.fees.protocol);
      totalFees.gas += parseFloat(hop2.fees.gas);
      totalFees.gasUSD += parseFloat(hop2.fees.gasUSD);
      totalFees.total += parseFloat(hop2.fees.total);
      totalPriceImpact += parseFloat(hop2.priceImpact);
      totalEstimatedTime += hop2.estimatedTime || 0;
    }

    return {
      router: 'multi-hop-bridge',
      routeId: `multi-hop-bridge-${Date.now()}`,
      fromToken: {
        address: fromToken,
        chainId: fromChainId,
        symbol: hop1.fromToken.symbol,
        decimals: hop1.fromToken.decimals,
        amount: amountIn,
      },
      toToken: {
        address: toToken,
        chainId: toChainId,
        symbol: hop2.toToken.symbol,
        decimals: hop2.toToken.decimals,
        amount: totalOutput,
      },
      exchangeRate: (parseFloat(totalOutput) / parseFloat(amountIn)).toString(),
      priceImpact: totalPriceImpact.toString(),
      slippage: '0.5',
      steps,
      fees: {
        protocol: totalFees.protocol.toString(),
        gas: totalFees.gas.toString(),
        gasUSD: totalFees.gasUSD.toString(),
        total: totalFees.total.toString(),
      },
      estimatedTime: totalEstimatedTime,
      expiresAt: Math.min(
        hop1.expiresAt || Infinity,
        bridgeRoute.expiresAt || Infinity,
        hop2.expiresAt || Infinity
      ),
      raw: {
        hop1: hop1.raw,
        bridge: bridgeRoute.raw,
        hop2: hop2.raw,
        intermediateToken: hop1.toToken.address,
        sourceChainIntermediates: sourceChainIntermediates.length,
        destChainIntermediates: destChainIntermediates.length,
        isMultiHop: true,
        isCrossChain: true,
      },
    };
  }
}

/**
 * Get multi-hop router instance
 */
export function getMultiHopRouter(): MultiHopRouter {
  return new MultiHopRouter();
}
