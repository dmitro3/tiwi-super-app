/**
 * Multi-Hop Router
 *
 * Finds routes through intermediate tokens when direct routes are unavailable.
 * Example: TWC → USDT → ETH (when TWC → ETH has no direct route)
 */

import type { Address } from 'viem';
import type { RouterRoute, RouterParams } from '../routers/types';
import { getRouterRegistry } from '../routers/registry';

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

  /**
   * Find multi-hop route through intermediate tokens
   *
   * @param fromToken Source token
   * @param toToken Destination token
   * @param chainId Chain ID
   * @param amountIn Input amount (in smallest unit)
   * @param fromAddress User's wallet address
   * @returns Multi-hop route or null if no route found
   */
  async findMultiHopRoute(
    fromToken: Address,
    toToken: Address,
    chainId: number,
    amountIn: string,
    fromAddress?: Address
  ): Promise<MultiHopRoute | null> {
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

    // STEP 1: Discover liquidity pairs for fromToken and toToken
    console.log('[MultiHopRouter] 📍 STEP 1: Discovering liquidity pairs...');

    const { getTokenPairs } = await import('./dexscreener-client');

    // Get all pairs for fromToken
    console.log('[MultiHopRouter] Fetching pairs for fromToken:', fromToken);
    const fromTokenPairs = await getTokenPairs(fromToken, chainId);
    console.log('[MultiHopRouter] Found', fromTokenPairs.length, 'pairs for fromToken');

    // Get all pairs for toToken
    console.log('[MultiHopRouter] Fetching pairs for toToken:', toToken);
    const toTokenPairs = await getTokenPairs(toToken, chainId);
    console.log('[MultiHopRouter] Found', toTokenPairs.length, 'pairs for toToken');

    if (fromTokenPairs.length === 0 || toTokenPairs.length === 0) {
      console.warn('[MultiHopRouter] ❌ Insufficient liquidity pairs to find multi-hop route');
      return null;
    }

    // STEP 2: Find intermediate tokens (tokens that pair with BOTH fromToken and toToken)
    console.log('[MultiHopRouter] 📍 STEP 2: Finding intermediate tokens...');

    // Extract all tokens that fromToken pairs with
    const fromTokenPartners = new Set<string>();
    fromTokenPairs.forEach(pair => {
      const partner = pair.baseToken.address.toLowerCase() === fromToken.toLowerCase()
        ? pair.quoteToken.address
        : pair.baseToken.address;
      fromTokenPartners.add(partner.toLowerCase());
    });
    console.log('[MultiHopRouter] FromToken pairs with', fromTokenPartners.size, 'tokens');

    // Extract all tokens that toToken pairs with
    const toTokenPartners = new Set<string>();
    toTokenPairs.forEach(pair => {
      const partner = pair.baseToken.address.toLowerCase() === toToken.toLowerCase()
        ? pair.quoteToken.address
        : pair.baseToken.address;
      toTokenPartners.add(partner.toLowerCase());
    });
    console.log('[MultiHopRouter] ToToken pairs with', toTokenPartners.size, 'tokens');

    // Find common tokens (intermediate tokens)
    const intermediateTokens: string[] = [];
    fromTokenPartners.forEach(token => {
      if (toTokenPartners.has(token)) {
        intermediateTokens.push(token);
      }
    });

    console.log('[MultiHopRouter] Found', intermediateTokens.length, 'intermediate tokens:', intermediateTokens);

    if (intermediateTokens.length === 0) {
      console.warn('[MultiHopRouter] ❌ No common intermediate tokens found');
      return null;
    }

    // STEP 3: Try each intermediate token to build a complete route
    console.log('[MultiHopRouter] 📍 STEP 3: Building routes through intermediates...');

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

        // Get output amount from hop1
        const hop1Output = hop1Route.toToken.amount;
        console.log('[MultiHopRouter] Hop1 output amount:', hop1Output);

        // Try to get route for second hop (intermediate → toToken)
        let hop2Route: RouterRoute | null = null;
        for (const router of routers) {
          try {
            console.log('[MultiHopRouter] Trying router', router.name, 'for hop2');
            const params: RouterParams = {
              fromChainId: chainId,
              fromToken: intermediate as string,
              fromAmount: hop1Output,
              fromDecimals: 18,
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
}

/**
 * Get multi-hop router instance
 */
export function getMultiHopRouter(): MultiHopRouter {
  return new MultiHopRouter();
}
