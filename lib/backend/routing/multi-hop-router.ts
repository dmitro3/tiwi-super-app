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
import { getBridgeableTokens, getIntermediaries, getWrappedNativeToken } from './intermediaries';
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
 * Common intermediate tokens for multi-hop routing
 * These are high-liquidity tokens that are likely to have pairs with most tokens
 */
const INTERMEDIATE_TOKENS: Record<number, Address[]> = {
  // Ethereum Mainnet (1)
  1: [
    '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
  ],
  // BSC (56)
  56: [
    '0x55d398326f99059fF775485246999027B3197955', // USDT
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
    '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', // DAI
  ],
  // Polygon (137)
  137: [
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
    '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
    '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // DAI
  ],
  // Arbitrum (42161)
  42161: [
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
    '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // DAI
  ],
  // Optimism (10)
  10: [
    '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // USDT
    '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // USDC
    '0x4200000000000000000000000000000000000006', // WETH
    '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // DAI
  ],
  // Base (8453)
  8453: [
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    '0x4200000000000000000000000000000000000006', // WETH
    '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI
  ],
};

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

    // STEP 2: Try each intermediate token to build a complete route
    console.log('[MultiHopRouter] 📍 STEP 2: Building routes through intermediates...');

    for (const intermediate of intermediateTokens) {
      try {
        console.log('[MultiHopRouter] Trying intermediate:', intermediate);

        // Get eligible routers for this chain
        const routers = await this.registry.getEligibleRouters(chainId, chainId);
        console.log('[MultiHopRouter] Found', routers.length, 'eligible routers');

        // Try to get route for first hop (fromToken → intermediate)
        let hop1Route: RouterRoute | null = null;
        for (const router of routers) {
          try {
            console.log('[MultiHopRouter] Trying router', router.name, 'for hop1');
            const params: RouterParams = {
              fromChainId: chainId,
              fromToken: fromToken as string,
              fromAmount: amountIn,
              fromDecimals: 18,
              toChainId: chainId,
              toToken: intermediate as string,
              toDecimals: 18,
              fromAddress: fromAddress,
              slippage: 0.5,
            };
            const route = await router.getRoute(params);

            if (route) {
              hop1Route = route;
              console.log('[MultiHopRouter] ✅ Found hop1 route via', router.name);
              break;
            }
          } catch (error: any) {
            console.warn('[MultiHopRouter] Router', router.name, 'failed for hop1:', error?.message || error);
          }
        }

        if (!hop1Route) {
          console.log('[MultiHopRouter] ❌ No route found for hop1 with intermediate', intermediate);
          continue;
        }

        // Get output amount from hop1 and convert to smallest unit
        // RouterRoute.toToken.amount is human-readable, but RouterParams.fromAmount needs smallest unit (wei)
        const hop1OutputHuman = hop1Route.toToken.amount;
        const hop1Decimals = hop1Route.toToken.decimals || 18;
        const hop1Output = toWei(hop1OutputHuman, hop1Decimals);
        console.log('[MultiHopRouter] Hop1 output amount:', hop1OutputHuman, '→ wei:', hop1Output);

        // Try to get route for second hop (intermediate → toToken)
        let hop2Route: RouterRoute | null = null;
        for (const router of routers) {
          try {
            console.log('[MultiHopRouter] Trying router', router.name, 'for hop2');
            const params: RouterParams = {
              fromChainId: chainId,
              fromToken: intermediate as string,
              fromAmount: hop1Output,
              fromDecimals: hop1Decimals,
              toChainId: chainId,
              toToken: toToken as string,
              toDecimals: 18,
              fromAddress: fromAddress,
              slippage: 0.5,
            };
            const route = await router.getRoute(params);

            if (route) {
              hop2Route = route;
              console.log('[MultiHopRouter] ✅ Found hop2 route via', router.name);
              break;
            }
          } catch (error: any) {
            console.warn('[MultiHopRouter] Router', router.name, 'failed for hop2:', error?.message || error);
          }
        }

        if (!hop2Route) {
          console.log('[MultiHopRouter] ❌ No route found for hop2 with intermediate', intermediate);
          continue;
        }

        // Success! We found a complete multi-hop route
        const totalOutput = hop2Route.toToken.amount;

        console.log('[MultiHopRouter] ✅✅✅ SUCCESS! Found multi-hop route:', {
          hop1: `${fromToken.slice(0, 10)}... → ${intermediate.slice(0, 10)}...`,
          hop2: `${intermediate.slice(0, 10)}... → ${toToken.slice(0, 10)}...`,
          totalOutput,
        });

        // Create combined route
        const combinedRoute = this.createCombinedRoute(
          hop1Route,
          hop2Route,
          fromToken,
          toToken,
          chainId,
          amountIn,
          totalOutput
        );

        return {
          hop1: hop1Route,
          hop2: hop2Route,
          intermediateToken: intermediate as Address,
          totalOutputAmount: totalOutput,
          combinedRoute,
        };
      } catch (error) {
        console.error('[MultiHopRouter] Error trying intermediate', intermediate, ':', error);
        continue;
      }
    }

    console.log('[MultiHopRouter] ❌ No multi-hop route found after trying all intermediates');
    return null;
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

    // STEP 2: Try each potential bridge token
    console.log('[MultiHopRouter] 📍 STEP 2: Trying each bridge token for cross-chain route...');

    for (const bridgeToken of potentialBridgeTokens) {
      try {
        console.log('[MultiHopRouter] Trying bridge token:', bridgeToken.symbol, bridgeToken.address);

        const destBridgeToken = this.resolveBridgeTokenOnDest(bridgeToken.symbol, toChainId);
        if (!destBridgeToken) {
          console.log('[MultiHopRouter] ❌ No destination mapping for bridge token', bridgeToken.symbol);
          continue;
        }

        const amountInBigInt = BigInt(amountIn);
        const sameChainFinder = getSameChainRouteFinder();
        const sourceRoute = await sameChainFinder.findRoute(
          fromToken,
          bridgeToken.address as Address,
          fromChainId,
          amountInBigInt
        );

        if (!sourceRoute) {
          console.log('[MultiHopRouter] ❌ No route found for hop1 with bridge token', bridgeToken.symbol);
          continue;
        }

        const hop1Route = await convertSameChainRouteToRouterRoute(
          sourceRoute,
          { address: fromToken },
          { address: bridgeToken.address as Address },
          amountInBigInt,
          fromChainId
        );

        const hop1Output = sourceRoute.outputAmount.toString();
        const bridgeTokenDecimals = await this.decimalsFetcher.getTokenDecimals(bridgeToken.address, fromChainId);
        const destBridgeTokenDecimals = await this.decimalsFetcher.getTokenDecimals(destBridgeToken, toChainId);
        console.log('[MultiHopRouter] Hop1 output amount (smallest):', hop1Output);

        // Step 4b: Get bridge route (bridgeToken source → bridgeToken destination)
        console.log('[MultiHopRouter] 📍 Step 4b: Finding bridge route...');
        const bridgeRouters = await this.registry.getEligibleRouters(fromChainId, toChainId);

        let bridgeRoute: RouterRoute | null = null;
        for (const router of bridgeRouters) {
          try {
            console.log('[MultiHopRouter] Trying router', router.name, 'for bridge');
            const params: RouterParams = {
              fromChainId,
              fromToken: bridgeToken.address as string,
              fromAmount: hop1Output,
              fromDecimals: bridgeTokenDecimals,
              toChainId,
              toToken: destBridgeToken as string,
              toDecimals: destBridgeTokenDecimals,
              fromAddress: fromAddress,
              slippage: 0.5,
            };
            const route = await router.getRoute(params);

            if (route) {
              bridgeRoute = route;
              console.log('[MultiHopRouter] ✅ Found bridge route via', router.name);
              break;
            }
          } catch (error: any) {
            console.warn('[MultiHopRouter] Router', router.name, 'failed for bridge:', error?.message || error);
          }
        }

        if (!bridgeRoute) {
          console.log('[MultiHopRouter] ❌ No bridge route found for', bridgeToken.symbol);
          continue;
        }

        // Convert human-readable bridge output to smallest unit for destination chain
        const bridgeOutputHuman = bridgeRoute.toToken.amount;
        const bridgeDecimals = bridgeRoute.toToken.decimals || 18;
        const bridgeOutput = toWei(bridgeOutputHuman, bridgeDecimals);
        console.log('[MultiHopRouter] Bridge output amount:', bridgeOutputHuman, '→ wei:', bridgeOutput);

        /*
        // Step 4c: Get route for second hop on destination chain (bridgeToken → toToken)
        // Try direct route first, if that fails, try multi-hop on destination chain
        console.log('[MultiHopRouter] 📍 Step 4c: Finding hop2 route on destination chain...');
        console.log('[MultiHopRouter] Trying direct route: bridgeToken → toToken');
        const destRouters = await this.registry.getEligibleRouters(toChainId, toChainId);

        let hop2Route: RouterRoute | null = null;
        let destChainIntermediates: RouterRoute[] = []; // Track intermediate hops on destination chain

        // Try direct route first
        for (const router of destRouters) {
          try {
            console.log('[MultiHopRouter] Trying router', router.name, 'for direct hop2 on destination chain');
            const params: RouterParams = {
              fromChainId: toChainId,
              fromToken: bridgeToken.address as string,
              fromAmount: bridgeOutput,
              fromDecimals: bridgeDecimals,
              toChainId,
              toToken: toToken as string,
              toDecimals: 18,
              fromAddress: fromAddress,
              slippage: 0.5,
            };
            const route = await router.getRoute(params);

            if (route) {
              hop2Route = route;
              console.log('[MultiHopRouter] ✅ Found direct hop2 route via', router.name);
              break;
            }
          } catch (error: any) {
            console.warn('[MultiHopRouter] Router', router.name, 'failed for direct hop2:', error?.message || error);
          }
        }

        // If no direct route, try multi-hop on destination chain (bridgeToken → intermediate → toToken)
        if (!hop2Route) {
          console.log('[MultiHopRouter] No direct route found, trying multi-hop on destination chain...');

          // Find tokens that pair with the bridge token on destination chain
          const bridgeTokenPairsDest = await getTokenPairs(bridgeToken.address as Address, toChainId);
          const bridgeTokenPartnersDest = new Set<string>();
          bridgeTokenPairsDest.forEach(pair => {
            const partner = pair.baseToken.address.toLowerCase() === bridgeToken.address.toLowerCase()
              ? pair.quoteToken.address
              : pair.baseToken.address;
            bridgeTokenPartnersDest.add(partner.toLowerCase());
          });

          // toTokenPartners already extracted earlier (destChainTokens)
          const toTokenPartnersDest = destChainTokens;

          // Find common intermediates
          const destChainIntermediateTokens: string[] = [];
          bridgeTokenPartnersDest.forEach(token => {
            if (toTokenPartnersDest.has(token) && token !== bridgeToken.address.toLowerCase()) {
              destChainIntermediateTokens.push(token);
            }
          });

          console.log('[MultiHopRouter] Found', destChainIntermediateTokens.length, 'intermediates on destination chain');

          // Try each intermediate
          for (const intermediate of destChainIntermediateTokens) {
            console.log('[MultiHopRouter] Trying destination chain intermediate:', intermediate);

            // Get route: bridgeToken → intermediate
            let intermediateRoute1: RouterRoute | null = null;
            for (const router of destRouters) {
              try {
                const params: RouterParams = {
                  fromChainId: toChainId,
                  fromToken: bridgeToken.address as string,
                  fromAmount: bridgeOutput,
                  fromDecimals: bridgeDecimals,
                  toChainId,
                  toToken: intermediate as string,
                  toDecimals: 18,
                  fromAddress: fromAddress,
                  slippage: 0.5,
                };
                const route = await router.getRoute(params);
                if (route) {
                  intermediateRoute1 = route;
                  console.log('[MultiHopRouter] ✅ Found route: bridgeToken → intermediate via', router.name);
                  break;
                }
              } catch (error: any) {
                console.warn('[MultiHopRouter] Router failed:', error?.message || error);
              }
            }

            if (!intermediateRoute1) continue;

            // Convert human-readable output to smallest unit for next hop
            const destIntermediateHuman = intermediateRoute1.toToken.amount;
            const destIntermediateDecimals = intermediateRoute1.toToken.decimals || 18;
            const intermediateOutput = toWei(destIntermediateHuman, destIntermediateDecimals);

            // Get route: intermediate → toToken
            let intermediateRoute2: RouterRoute | null = null;
            for (const router of destRouters) {
              try {
                const params: RouterParams = {
                  fromChainId: toChainId,
                  fromToken: intermediate as string,
                  fromAmount: intermediateOutput,
                  fromDecimals: destIntermediateDecimals,
                  toChainId,
                  toToken: toToken as string,
                  toDecimals: 18,
                  fromAddress: fromAddress,
                  slippage: 0.5,
                };
                const route = await router.getRoute(params);
                if (route) {
                  intermediateRoute2 = route;
                  console.log('[MultiHopRouter] ✅ Found route: intermediate → toToken via', router.name);
                  break;
                }
              } catch (error: any) {
                console.warn('[MultiHopRouter] Router failed:', error?.message || error);
              }
            }

            if (intermediateRoute2) {
              // Success! We have a multi-hop route on destination chain
              console.log('[MultiHopRouter] ✅ Found multi-hop route on destination chain');
              destChainIntermediates = [intermediateRoute1, intermediateRoute2];
              hop2Route = intermediateRoute2; // Use the final route's output
              break;
            }
          }
        }

        */
        const destRoute = await sameChainFinder.findRoute(
          destBridgeToken,
          toToken,
          toChainId,
          BigInt(bridgeOutput)
        );

        if (!destRoute) {
          console.log('[MultiHopRouter] ❌ No route found on destination chain');
          continue;
        }

        const hop2Route = await convertSameChainRouteToRouterRoute(
          destRoute,
          { address: destBridgeToken },
          { address: toToken },
          BigInt(bridgeOutput),
          toChainId
        );

        // Success! We found a complete cross-chain multi-hop route
        const totalOutput = hop2Route.toToken.amount;

        console.log('[MultiHopRouter] ✅✅✅ SUCCESS! Found cross-chain multi-hop route:', {
          path: `${fromToken.slice(0, 10)}... → ${bridgeToken.symbol} (Chain ${fromChainId}) → [BRIDGE] → ${bridgeToken.symbol} → ${toToken.slice(0, 10)}... (Chain ${toChainId})`,
          bridge: `${bridgeToken.symbol}`,
          totalOutput,
        });

        const combinedRoute = this.createCrossChainCombinedRoute(
          hop1Route,
          bridgeRoute,
          hop2Route,
          fromToken,
          toToken,
          fromChainId,
          toChainId,
          amountIn,
          totalOutput,
          [],
          []
        );

        return {
          hop1: hop1Route,
          bridgeRoute,
          hop2: hop2Route,
          intermediateToken: bridgeToken.address as Address,
          totalOutputAmount: totalOutput,
          combinedRoute,
        };
      } catch (error) {
        console.error('[MultiHopRouter] Error trying bridge token', bridgeToken.symbol, ':', error);
        continue;
      }
    }

    console.log('[MultiHopRouter] ❌ No cross-chain multi-hop route found after trying all bridge tokens');
    return null;
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
   * Resolve a bridge token symbol to the destination chain address.
   */
  private resolveBridgeTokenOnDest(symbol: string, destChainId: number): Address | null {
    const normalized = symbol.toLowerCase();
    const candidates = getIntermediaries(destChainId);
    const exact = candidates.find((token) => token.symbol.toLowerCase() === normalized);
    if (exact) {
      return exact.address;
    }

    const wrappedNative = getWrappedNativeToken(destChainId);
    if (wrappedNative && ['eth', 'weth', 'bnb', 'wbnb'].includes(normalized)) {
      return wrappedNative;
    }

    return null;
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
