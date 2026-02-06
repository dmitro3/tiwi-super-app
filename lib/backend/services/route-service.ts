/**
 * Route Service
 * 
 * Orchestrates route fetching from multiple routers.
 * Handles parameter transformation, router selection, and route scoring.
 */

import { getRouterRegistry } from '@/lib/backend/routers/registry';
import { getTokenService } from '@/lib/backend/services/token-service';
import { getTokenPrice } from '@/lib/backend/providers/price-provider';
import { getAutoSlippageService } from '@/lib/backend/services/auto-slippage-service';
import { getJupiterFeeInfoService } from '@/lib/backend/services/jupiter-fee-info-service';
import { ChainTransformer, toSmallestUnit, transformTokenAddress, transformSlippage } from '@/lib/backend/routers/transformers';
import { selectBestRoute, sortRoutesByScore } from '@/lib/backend/routers/scoring';
import {
  DEFAULT_SLIPPAGE,
  QUOTE_EXPIRATION_SECONDS,
  ROUTER_TIMEOUT_MS,
  MAX_RETRY_ATTEMPTS
} from '@/lib/backend/routers/constants';
import { SOLANA_CHAIN_ID } from '@/lib/backend/providers/moralis';
import type { RouteRequest, RouteResponse, RouterRoute, RouterParams, RouterError } from '@/lib/backend/routers/types';
import type { SwapRouter } from '@/lib/backend/routers/base';

// Initialize routers (ensures they're registered)
import '@/lib/backend/routers/init';

/**
 * Route Service
 * Manages route fetching and selection
 */
export class RouteService {
  private routerRegistry = getRouterRegistry();
  private tokenService = getTokenService();

  /**
   * Get best route for a swap
   * 
   * If slippageMode is 'auto', uses AutoSlippageService to:
   * - Calculate initial slippage from liquidity
   * - Try multiple slippage values (max 3 attempts)
   * - Select best route from successful attempts
   * 
   * If slippageMode is 'fixed', uses user's specified slippage.
   */
  async getRoute(request: RouteRequest): Promise<RouteResponse> {
    const startTime = Date.now();
    console.log(`[RouteService] 🚀 Starting route fetch for ${request.fromToken.symbol} -> ${request.toToken.symbol}`);

    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Handle reverse routing (toAmount -> fromAmount)
      // If toAmount is provided, swap tokens and use normal routing, then swap result back
      if (request.toAmount) {
        const result = await this.handleReverseRouting(request);
        console.log(`[RouteService] ✅ Route fetch completed in ${Date.now() - startTime}ms`);
        return result;
      }

      // 3. Handle auto slippage mode
      if (request.slippageMode === 'auto') {
        const result = await this.getRouteWithAutoSlippage(request);
        console.log(`[RouteService] ✅ Route fetch completed in ${Date.now() - startTime}ms`);
        return result;
      }

      // 4. Continue with fixed slippage logic (existing implementation)
      const result = await this.getRouteWithFixedSlippage(request);
      console.log(`[RouteService] ✅ Route fetch completed in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      console.error(`[RouteService] ❌ Route fetch failed after ${Date.now() - startTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Handle reverse routing (toAmount -> fromAmount)
   * Strategy: Swap tokens, use normal routing, then swap result back
   * If reverse routing fails, toToken becomes fromToken and toAmount becomes fromAmount (user requirement)
   */
  private async handleReverseRouting(request: RouteRequest): Promise<RouteResponse> {
    // Create reversed request: toToken becomes fromToken, fromToken becomes toToken
    const reversedRequest: RouteRequest = {
      fromToken: request.toToken,
      toToken: request.fromToken,
      fromAmount: request.toAmount!, // toAmount becomes fromAmount
      slippage: request.slippage,
      slippageMode: request.slippageMode,
      recipient: request.recipient,
      fromAddress: request.fromAddress,
      order: request.order,
      liquidityUSD: request.liquidityUSD,
    };

    // Get route using reversed tokens (normal routing)
    let routeResponse: RouteResponse;
    try {
      if (reversedRequest.slippageMode === 'auto') {
        routeResponse = await this.getRouteWithAutoSlippage(reversedRequest);
      } else {
        routeResponse = await this.getRouteWithFixedSlippage(reversedRequest);
      }
    } catch (error: any) {
      // If reverse routing fails, toToken becomes fromToken and toAmount becomes fromAmount (user requirement)
      console.warn('[RouteService] Reverse routing failed, falling back to direct routing:', error);

      // Create fallback request: use toToken as fromToken, toAmount as fromAmount
      const fallbackRequest: RouteRequest = {
        fromToken: request.toToken,
        toToken: request.fromToken,
        fromAmount: request.toAmount!,
        slippage: request.slippage,
        slippageMode: request.slippageMode,
        recipient: request.recipient,
        fromAddress: request.fromAddress,
        order: request.order,
        liquidityUSD: request.liquidityUSD,
      };

      // Try normal routing with swapped tokens
      if (fallbackRequest.slippageMode === 'auto') {
        routeResponse = await this.getRouteWithAutoSlippage(fallbackRequest);
      } else {
        routeResponse = await this.getRouteWithFixedSlippage(fallbackRequest);
      }

      // Return the route as-is (tokens are already swapped in fallback)
      // Frontend will need to handle this case
      return routeResponse;
    }

    // Swap the route result back to original token order
    // routeResponse.route.fromToken = original toToken (BNB) with amount = user's toAmount (0.005)
    // routeResponse.route.toToken = original fromToken (TWC) with amount = calculated fromAmount (X)
    // We want:
    // - fromToken = original fromToken (TWC) with amount = calculated fromAmount (X) = route.toToken
    // - toToken = original toToken (BNB) with amount = user's toAmount (0.005) = route.fromToken
    const swappedRoute: RouterRoute = {
      ...routeResponse.route,
      // Swap tokens: fromToken becomes toToken and vice versa
      fromToken: {
        ...routeResponse.route.toToken, // Original fromToken (TWC) with calculated amount
      },
      toToken: {
        ...routeResponse.route.fromToken, // Original toToken (BNB) with user's desired amount
      },
      // Reverse exchange rate (1/rate)
      exchangeRate: routeResponse.route.exchangeRate && parseFloat(routeResponse.route.exchangeRate) > 0
        ? (1 / parseFloat(routeResponse.route.exchangeRate)).toFixed(8)
        : '0',
      // Add reverse routing flag and flip path/tokens in raw
      raw: {
        ...routeResponse.route.raw,
        isReverseRouting: true,
        // Flip path and tokens for actual swap execution (forward direction)
        path: routeResponse.route.raw?.path ? [...routeResponse.route.raw.path].reverse() : undefined,
        tokenIn: routeResponse.route.raw?.tokenOut,
        tokenOut: routeResponse.route.raw?.tokenIn,
      },
    };

    return {
      route: swappedRoute,
      alternatives: routeResponse.alternatives?.map(alt => ({
        ...alt,
        fromToken: {
          ...alt.toToken,
        },
        toToken: {
          ...alt.fromToken,
        },
        exchangeRate: alt.exchangeRate && parseFloat(alt.exchangeRate) > 0
          ? (1 / parseFloat(alt.exchangeRate)).toFixed(8)
          : '0',
        raw: {
          ...alt.raw,
          isReverseRouting: true,
          path: alt.raw?.path ? [...alt.raw.path].reverse() : undefined,
          tokenIn: alt.raw?.tokenOut,
          tokenOut: alt.raw?.tokenIn,
        },
      })),
      timestamp: routeResponse.timestamp,
      expiresAt: routeResponse.expiresAt,
    };
  }

  /**
   * Get route with auto slippage
   * Delegates to AutoSlippageService which handles:
   * - Liquidity fetching
   * - Initial slippage calculation
   * - Multi-attempt route fetching
   * - Best route selection
   */
  private async getRouteWithAutoSlippage(request: RouteRequest): Promise<RouteResponse> {
    try {
      const autoSlippageService = getAutoSlippageService();
      const result = await autoSlippageService.getRouteWithAutoSlippage(request);

      // Update route with applied slippage
      const routeWithAppliedSlippage: RouterRoute = {
        ...result.route,
        slippage: result.appliedSlippage.toFixed(2), // Update to applied slippage
      };

      // Calculate expiration timestamp
      const expiresAt = Date.now() + (QUOTE_EXPIRATION_SECONDS * 1000);

      return {
        route: routeWithAppliedSlippage,
        alternatives: undefined, // Auto slippage doesn't return alternatives
        timestamp: Date.now(),
        expiresAt,
      };
    } catch (error: any) {
      // If auto slippage fails, provide helpful error message
      const errorMessage = error.message || 'Auto slippage failed';
      throw new Error(
        `${errorMessage}. Consider using fixed slippage mode with higher tolerance.`
      );
    }
  }

  /**
   * Get route with fixed slippage (existing implementation)
   */
  private async getRouteWithFixedSlippage(request: RouteRequest): Promise<RouteResponse> {
    console.log("🚀 ~ RouteService ~ getRouteWithFixedSlippage ~ request:", request)
    // 1. Get token decimals (use provided decimals, fetch from blockchain if undefined)
    // Frontend provides decimals from token data (enriched by TokenService)
    // If undefined, fetch from blockchain contract
    const fromDecimals = request.fromToken.decimals !== undefined
      ? request.fromToken.decimals
      : await this.getTokenDecimals(request.fromToken.chainId, request.fromToken.address);
    const toDecimals = request.toToken.decimals !== undefined
      ? request.toToken.decimals
      : await this.getTokenDecimals(request.toToken.chainId, request.toToken.address);

    // 2. Transform amount to smallest unit
    // Note: This method is only called when fromAmount is provided (reverse routing handled separately)
    const fromAmountSmallest = toSmallestUnit(request.fromAmount!, fromDecimals);
    // 3. Get eligible routers
    const eligibleRouters = await this.routerRegistry.getEligibleRouters(
      request.fromToken.chainId,
      request.toToken.chainId
    );

    if (eligibleRouters.length === 0) {
      throw new Error('No routers support this chain combination');
    }

    // 4. OPTIMIZED: Try primary routers AND enhanced routing in parallel (single attempt)
    // This reduces total attempts from 2 (sequential) to 1 (parallel)
    const routes: RouterRoute[] = [];
    const errors: RouterError[] = [];

    // Prepare enhanced routing promise (runs in parallel with primary routers)
    const enhancedRoutingPromise = (async () => {
      try {
        const { getRouteServiceEnhancer } = await import('@/lib/backend/routing/integration');
        const enhancer = getRouteServiceEnhancer();

        console.log(`[RouteService] 🔄 Running enhanced routing in parallel with primary routers...`);
        const enhancedResponse = await enhancer.enhanceRoute(
          request,
          {
            route: null as any,
            alternatives: undefined,
            timestamp: Date.now(),
            expiresAt: Date.now() + 60000,
          },
          {
            enableUniversalRouting: true,
            preferUniversalRouting: false, // Use existing if better
          }
        );

        return enhancedResponse;
      } catch (error: any) {
        console.warn(`[RouteService] Enhanced routing failed:`, error.message);
        return null;
      }
    })();

    // Call all eligible routers in parallel
    const routerPromises = eligibleRouters.map(async (router) => {
      try {
        // Transform parameters for this router
        const routerParams = await this.transformParams(
          request,
          router,
          fromAmountSmallest,
          fromDecimals,
          toDecimals
        );
        // Get route from router (with timeout)
        const route = await this.getRouteWithTimeout(router, routerParams);

        return { router: router.name, route, error: null };
      } catch (error: any) {
        // Collect error for debugging
        const routerError: RouterError = {
          message: this.normalizeErrorMessage(error, router.name),
          code: this.getErrorCode(error),
          router: router.name,
          routerError: error,
          routerErrorCode: error?.code,
          routerErrorMessage: error?.message,
        };

        console.warn(`[RouteService] Router ${router.name} failed:`, error.message);
        return { router: router.name, route: null, error: routerError };
      }
    });

    // OPTIMIZATION: Wait for BOTH primary routers AND enhanced routing in parallel
    const [primaryResults] = await Promise.allSettled([
      Promise.all(routerPromises),
      // enhancedRoutingPromise,
    ]);

    // Collect successful routes from primary routers
    if (primaryResults.status === 'fulfilled') {
      for (const result of primaryResults.value) {
        const { route, error } = result;
        if (route) {
          routes.push(route);
        }
        if (error) {
          errors.push(error);
        }
      }
    } else {
      console.error('[RouteService] Primary routers promise rejected:', primaryResults.reason);
    }

    // Collect enhanced routing result
    // if (enhancedResponse.status === 'fulfilled' && enhancedResponse.value) {
    //   const enhanced = enhancedResponse.value;
    //   if (enhanced.route) {
    //     routes.push(enhanced.route);
    //     console.log(`[RouteService] ✅ Enhanced routing found a route in parallel!`);
    //     console.log(`[RouteService]   Router: ${enhanced.route.router}`);
    //     console.log(`[RouteService]   Sources: ${enhanced.sources?.join(', ') || 'none'}`);

    //     // Add enhanced alternatives if available
    //     if (enhanced.alternatives && enhanced.alternatives.length > 0) {
    //       routes.push(...enhanced.alternatives);
    //     }
    //   } else {
    //     console.log(`[RouteService] Enhanced routing did not find a route (ran in parallel)`);
    //   }
    // }

    // 5. Select best route from all sources (primary + enhanced)
    let bestRoute = selectBestRoute(routes);

    if (!bestRoute) {
      // All routers failed - provide detailed error message
      const routerNames = eligibleRouters.map(r => r.displayName || r.name).join(', ');

      // Check if it's a specific error type
      const hasNoRouteError = errors.some(e =>
        e.message.toLowerCase().includes('no route') ||
        e.message.toLowerCase().includes('no route available')
      );

      const hasLiquidityError = errors.some(e =>
        e.message.toLowerCase().includes('insufficient liquidity') ||
        e.message.toLowerCase().includes('low liquidity')
      );

      // Build user-friendly error message (updated to reflect parallel execution)
      let errorMessage: string;
      if (hasNoRouteError) {
        errorMessage = `No swap route available for this token pair. We tried ${routerNames} and the enhanced routing system in parallel, but none of them support this swap.`;
      } else if (hasLiquidityError) {
        errorMessage = `Insufficient liquidity for this swap. We tried ${routerNames} and the enhanced routing system in parallel, but there isn't enough liquidity available.`;
      } else {
        errorMessage = `Unable to find a swap route. We tried ${routerNames} and the enhanced routing system in parallel, but all attempts failed.`;
      }

      throw new Error(errorMessage);
    }

    // 6. Enrich routes with USD values and Tiwi fees (for routes that don't have them)
    const enrichedBestRoute = await this.enrichRouteWithUSD(bestRoute, request);
    const enrichedAlternatives = await Promise.all(
      routes
        .filter(r => r.routeId !== bestRoute.routeId)
        .map(route => this.enrichRouteWithUSD(route, request))
    );

    // 7. Sort alternatives
    const alternatives = sortRoutesByScore(enrichedAlternatives);

    // 8. Calculate expiration timestamp
    const expiresAt = Date.now() + (QUOTE_EXPIRATION_SECONDS * 1000);

    // 9. Return response
    return {
      route: enrichedBestRoute,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      timestamp: Date.now(),
      expiresAt,
    };
  }

  /**
   * Transform canonical request parameters to router-specific format
   */
  private async transformParams(
    request: RouteRequest,
    router: SwapRouter,
    fromAmountSmallest: string,
    fromDecimals: number,
    toDecimals: number
  ): Promise<RouterParams> {
    // Transform chain IDs
    const fromChainId = ChainTransformer.transform(
      request.fromToken.chainId,
      router.name
    );
    const toChainId = ChainTransformer.transform(
      request.toToken.chainId,
      router.name
    );

    if (fromChainId === null || toChainId === null) {
      throw new Error(`Router ${router.name} does not support these chains`);
    }

    // Transform token addresses
    const fromToken = transformTokenAddress(
      request.fromToken.address,
      request.fromToken.chainId,
      router.name
    );
    const toToken = transformTokenAddress(
      request.toToken.address,
      request.toToken.chainId,
      router.name
    );

    // Transform slippage
    const slippage = transformSlippage(
      request.slippage || DEFAULT_SLIPPAGE,
      router.name
    );

    // Transform order preference
    const order = request.order || 'RECOMMENDED';

    return {
      fromChainId,
      fromToken,
      fromAmount: fromAmountSmallest,
      fromDecimals,
      toChainId,
      toToken,
      toDecimals,
      recipient: request.recipient,
      fromAddress: request.fromAddress, // Pass fromAddress for LiFi getQuote
      slippage,
      slippageMode: request.slippageMode, // Pass slippage mode to router
      order,
    };
  }

  /**
   * Get route from router with timeout
   */
  private async getRouteWithTimeout(
    router: SwapRouter,
    params: RouterParams
  ): Promise<RouterRoute | null> {
    return Promise.race([
      router.getRoute(params),
      new Promise<null>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Router ${router.name} timeout after ${ROUTER_TIMEOUT_MS}ms`));
        }, ROUTER_TIMEOUT_MS);
      }),
    ]);
  }

  /**
   * Get token decimals (on-demand fetching)
   * 
   * Flow:
   * 1. Check if decimals provided in request (use if available)
   * 2. Try token service cache (may have been fetched before)
   * 3. Fetch from blockchain contract (on-demand)
   * 4. Default to 18 only as last resort
   * 
   * This is called only when decimals are actually needed (e.g., for routing),
   * avoiding unnecessary contract calls during token fetching.
   */
  private async getTokenDecimals(chainId: number, address: string): Promise<number> {
    try {
      // Method 1: Try token service cache (may have been fetched in previous request)
      const tokens = await this.tokenService.getTokensByChain(chainId, 100);
      const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());

      if (token && token.decimals !== undefined) {
        // Use cached decimals if available
        return token.decimals;
      }

      // Method 2: Fetch directly from blockchain (on-demand)
      // This is the primary method when decimals are undefined
      const { getTokenDecimalsFetcher } = await import('@/lib/backend/utils/token-decimals-fetcher');
      const decimalsFetcher = getTokenDecimalsFetcher();
      const decimals = await decimalsFetcher.getTokenDecimals(address, chainId);

      return decimals;
    } catch (error) {
      console.warn(`[RouteService] Error fetching token decimals for ${chainId}:${address}, using default 18`);
      // Last resort: default to 18
      return 18;
    }
  }

  /**
   * Validate route request
   */
  private validateRequest(request: RouteRequest): void {
    if (!request.fromToken || !request.toToken) {
      throw new Error('Missing required parameters: fromToken, toToken');
    }

    if (!request.fromToken.chainId || !request.fromToken.address) {
      throw new Error('Invalid fromToken: chainId and address are required');
    }

    if (!request.toToken.chainId || !request.toToken.address) {
      throw new Error('Invalid toToken: chainId and address are required');
    }

    // Validate that exactly one of fromAmount or toAmount is provided
    if (!request.fromAmount && !request.toAmount) {
      throw new Error('Either fromAmount or toAmount must be provided');
    }

    if (request.fromAmount && request.toAmount) {
      throw new Error('Cannot provide both fromAmount and toAmount. Provide exactly one.');
    }

    // Validate amount
    const amount = request.fromAmount || request.toAmount!;
    if (amount === '' || parseFloat(amount) <= 0) {
      throw new Error(`Invalid ${request.fromAmount ? 'fromAmount' : 'toAmount'}: must be greater than 0`);
    }

    // Validate slippage if provided
    if (request.slippage !== undefined) {
      if (request.slippage < 0 || request.slippage > 100) {
        throw new Error('Invalid slippage: must be between 0 and 100');
      }
    }
  }

  /**
   * Normalize error message for frontend
   */
  private normalizeErrorMessage(error: any, routerName: string): string {
    const errorMessage = error?.message || 'Unknown error';
    const lowerMessage = errorMessage.toLowerCase();

    // Common error patterns with user-friendly messages
    if (lowerMessage.includes('no route') || lowerMessage.includes('no route available')) {
      return 'No route available for this token pair';
    }
    if (lowerMessage.includes('unsupported') || lowerMessage.includes('not supported')) {
      return 'This swap is not supported on this network';
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return 'Request timed out - please try again';
    }
    if (lowerMessage.includes('insufficient liquidity') || lowerMessage.includes('low liquidity')) {
      return 'Insufficient liquidity for this swap amount';
    }
    if (lowerMessage.includes('invalid') || lowerMessage.includes('missing')) {
      return 'Invalid swap parameters';
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return 'Network connection error';
    }

    // Return generic message with router name
    const routerDisplayName = routerName === 'lifi' ? 'LiFi' :
      routerName === 'pancakeswap' ? 'PancakeSwap' :
        routerName === 'uniswap' ? 'Uniswap' :
          routerName.charAt(0).toUpperCase() + routerName.slice(1);
    return `Failed to get route from ${routerDisplayName}`;
  }

  /**
   * Get error code from error
   */
  private getErrorCode(error: any): string {
    const errorMessage = error?.message?.toLowerCase() || '';

    if (errorMessage.includes('no route')) return 'NO_ROUTE';
    if (errorMessage.includes('unsupported')) return 'UNSUPPORTED_PAIR';
    if (errorMessage.includes('timeout')) return 'TIMEOUT';
    if (errorMessage.includes('insufficient liquidity')) return 'INSUFFICIENT_LIQUIDITY';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Enrich route with USD values and Tiwi protocol fee
   * For routes that don't provide USD values (Uniswap, PancakeSwap), calculate them
   * For Jupiter routes, fetch fee info from Jupiter's /fees endpoint
   */
  private async enrichRouteWithUSD(
    route: RouterRoute,
    request: RouteRequest
  ): Promise<RouterRoute> {
    console.log("🚀 ~ RouteService ~ enrichRouteWithUSD ~ route:", route)
    const TIWI_PROTOCOL_FEE_RATE = 0.0025; // 0.25%

    // Special handling for Jupiter routes - fetch fee info
    if (route.router === 'jupiter' && route.fromToken.chainId === SOLANA_CHAIN_ID) {
      return this.enrichJupiterRoute(route, request);
    }

    // Identify route provider for logging
    console.log(`[enrichRouteWithUSD] Route provider: ${route.router}`);

    // If route already has USD values (e.g., from LiFi), just add Tiwi fee
    if (route.fromToken.amountUSD && route.toToken.amountUSD) {
      console.log(
        "🚀 ~ RouteService ~ enrichRouteWithUSD ~ route.fromToken.amountUSD: [ROUTE ALREADY HAS USD VALUES]",
        route.fromToken.amountUSD
      );
      console.log(`[enrichRouteWithUSD] USD values already present for provider "${route.router}": fromToken.amountUSD=${route.fromToken.amountUSD}, toToken.amountUSD=${route.toToken.amountUSD}`);

      const fromAmountUSDNum = parseFloat(route.fromToken.amountUSD);
      console.log(`[enrichRouteWithUSD] fromAmountUSDNum: ${fromAmountUSDNum}`);

      const tiwiProtocolFeeUSD =
        fromAmountUSDNum > 0
          ? (fromAmountUSDNum * TIWI_PROTOCOL_FEE_RATE).toFixed(2)
          : "0.00";
      console.log(`[enrichRouteWithUSD] Tiwi protocol fee calculated as ${TIWI_PROTOCOL_FEE_RATE * 100}% of fromAmountUSDNum = ${tiwiProtocolFeeUSD} (source: calculated in code)`);

      // Fee sources
      const gasUSDRaw = route.fees.gasUSD;
      const protocolUSDRaw = route.fees.protocol;
      const gasUSDNum = parseFloat(gasUSDRaw || "0");
      const protocolUSDNum = parseFloat(protocolUSDRaw || "0");
      const tiwiFeeNum = parseFloat(tiwiProtocolFeeUSD);
      const totalFeesUSD = (gasUSDNum + protocolUSDNum + tiwiFeeNum).toFixed(2);

      console.log(
        `[enrichRouteWithUSD] Fee breakdown for provider "${route.router}":\n` +
        `  - gasUSD (from route): ${gasUSDRaw} -> ${gasUSDNum}\n` +
        `  - protocol (from route): ${protocolUSDRaw} -> ${protocolUSDNum}\n` +
        `  - tiwiProtocolFeeUSD (calculated): ${tiwiProtocolFeeUSD} -> ${tiwiFeeNum}\n` +
        `  - total fees: ${gasUSDNum} + ${protocolUSDNum} + ${tiwiFeeNum} = ${totalFeesUSD}`
      );

      return {
        ...route,
        fees: {
          ...route.fees,
          tiwiProtocolFeeUSD,
          total: totalFeesUSD,
        },
      };
    }

    // Route doesn't have USD values - calculate them from token prices
    try {
      // Fetch token prices in parallel
      console.log(
        "🚀 ~ RouteService ~ enrichRouteWithUSD ~ route.fromToken.amountUSD: [ROUTE DOESN'T HAVE USD VALUES]",
        route.fromToken.amountUSD
      );
      console.log(`[enrichRouteWithUSD] Will fetch USD prices for provider "${route.router}" (probably uniswap/pancakeswap, no prices on route)`);

      const [fromTokenPrice, toTokenPrice] = await Promise.all([
        getTokenPrice(
          request.fromToken.address,
          request.fromToken.chainId,
          request.fromToken.symbol
        ),
        getTokenPrice(
          request.toToken.address,
          request.toToken.chainId,
          request.toToken.symbol
        ),
      ]);

      console.log(`[enrichRouteWithUSD] Price quotes fetched: fromTokenPrice=`, fromTokenPrice, `, toTokenPrice=`, toTokenPrice);

      // Calculate USD values
      const fromAmountNum = parseFloat(route.fromToken.amount || "0");
      const toAmountNum = parseFloat(route.toToken.amount || "0");
      const fromPriceUSD = fromTokenPrice ? parseFloat(fromTokenPrice.priceUSD) : 0;
      const toPriceUSD = toTokenPrice ? parseFloat(toTokenPrice.priceUSD) : 0;

      console.log(`[enrichRouteWithUSD] From token amount: ${route.fromToken.amount} as number: ${fromAmountNum}; USD price: ${fromPriceUSD}`);
      console.log(`[enrichRouteWithUSD] To token amount: ${route.toToken.amount} as number: ${toAmountNum}; USD price: ${toPriceUSD}`);

      // Calculate USD values - ensure we have valid prices
      const fromAmountUSD =
        fromAmountNum > 0 && fromPriceUSD > 0
          ? (fromAmountNum * fromPriceUSD).toFixed(2)
          : "0.00";
      const toAmountUSD =
        toAmountNum > 0 && toPriceUSD > 0
          ? (toAmountNum * toPriceUSD).toFixed(2)
          : "0.00";

      // Log warning if USD calculation resulted in 0.00
      if (toAmountUSD === "0.00" && toAmountNum > 0) {
        console.warn(`[enrichRouteWithUSD] WARNING: toAmountUSD is 0.00 but toAmountNum=${toAmountNum}. toPriceUSD=${toPriceUSD}. This might indicate a price fetch issue.`);
      }

      console.log(
        `[enrichRouteWithUSD] Computed USD values: fromAmountUSD=${fromAmountUSD}, toAmountUSD=${toAmountUSD} (calculated = YES, not from route for route.router "${route.router}")`
      );

      // Calculate Tiwi protocol fee
      const fromAmountUSDNum = fromAmountUSD ? parseFloat(fromAmountUSD) : 0;
      const tiwiProtocolFeeUSD =
        fromAmountUSDNum > 0
          ? (fromAmountUSDNum * TIWI_PROTOCOL_FEE_RATE).toFixed(2)
          : "0.00";
      console.log(`[enrichRouteWithUSD] Tiwi protocol fee (calculated): fromAmountUSDNum=${fromAmountUSDNum} * TIWI_PROTOCOL_FEE_RATE=${TIWI_PROTOCOL_FEE_RATE} = ${tiwiProtocolFeeUSD}`);

      // Gas/protocol fees
      const gasUSDRaw = route.fees.gasUSD;
      const protocolUSDRaw = route.fees.protocol;
      const gasUSDNum = parseFloat(gasUSDRaw || "0");
      const protocolUSDNum = parseFloat(protocolUSDRaw || "0");
      const tiwiFeeNum = parseFloat(tiwiProtocolFeeUSD);
      const totalFeesUSD = (gasUSDNum + protocolUSDNum + tiwiFeeNum).toFixed(2);

      console.log(
        `[enrichRouteWithUSD] Fee breakdown for route.router "${route.router}":\n` +
        `  - gasUSD (from route): ${gasUSDRaw} -> ${gasUSDNum}\n` +
        `  - protocol (from route): ${protocolUSDRaw} -> ${protocolUSDNum}\n` +
        `  - tiwiProtocolFeeUSD (calculated): ${tiwiProtocolFeeUSD} -> ${tiwiFeeNum}\n` +
        `  - total fees: ${gasUSDNum} + ${protocolUSDNum} + ${tiwiFeeNum} = ${totalFeesUSD}`
      );

      return {
        ...route,
        fromToken: {
          ...route.fromToken,
          amountUSD: fromAmountUSD,
        },
        toToken: {
          ...route.toToken,
          amountUSD: toAmountUSD,
        },
        fees: {
          ...route.fees,
          tiwiProtocolFeeUSD,
          total: totalFeesUSD,
        },
      };
    } catch (error) {
      // If price fetching fails, return route as-is (without USD values)
      console.warn('[RouteService] Failed to enrich route with USD values:', error);
      console.warn(`[enrichRouteWithUSD] Could not compute USD values for provider "${route.router}" - price API failed. Returning original route.`);
      return route;
    }
  }

  /**
   * Enrich Jupiter route with fee information
   * Fetches fee breakdown from Jupiter's /fees endpoint
   */
  private async enrichJupiterRoute(
    route: RouterRoute,
    request: RouteRequest
  ): Promise<RouterRoute> {
    const TIWI_PROTOCOL_FEE_RATE = 0.0025; // 0.25%
    const feeInfoService = getJupiterFeeInfoService();

    // Get USD values (use from route if available, otherwise calculate)
    let fromAmountUSD = route.fromToken.amountUSD;
    let toAmountUSD = route.toToken.amountUSD;

    if (!fromAmountUSD || !toAmountUSD) {
      // Calculate USD values from token prices
      try {
        const [fromTokenPrice, toTokenPrice] = await Promise.all([
          getTokenPrice(
            request.fromToken.address,
            request.fromToken.chainId,
            request.fromToken.symbol
          ),
          getTokenPrice(
            request.toToken.address,
            request.toToken.chainId,
            request.toToken.symbol
          ),
        ]);

        const fromAmountNum = parseFloat(route.fromToken.amount || "0");
        const toAmountNum = parseFloat(route.toToken.amount || "0");
        const fromPriceUSD = fromTokenPrice ? parseFloat(fromTokenPrice.priceUSD) : 0;
        const toPriceUSD = toTokenPrice ? parseFloat(toTokenPrice.priceUSD) : 0;

        fromAmountUSD = fromAmountNum > 0 && fromPriceUSD > 0
          ? (fromAmountNum * fromPriceUSD).toFixed(2)
          : "0.00";
        toAmountUSD = toAmountNum > 0 && toPriceUSD > 0
          ? (toAmountNum * toPriceUSD).toFixed(2)
          : "0.00";
      } catch (error) {
        console.warn('[RouteService] Failed to fetch token prices for Jupiter route:', error);
        fromAmountUSD = fromAmountUSD || "0.00";
        toAmountUSD = toAmountUSD || "0.00";
      }
    }

    // Fetch fee info from Jupiter
    const fromAmountUSDNum = parseFloat(fromAmountUSD || "0");
    const feeBreakdown = await feeInfoService.calculateTotalFees(
      request.fromToken.address,
      request.toToken.address,
      fromAmountUSDNum
    );

    // Calculate gas USD (convert SOL to USD)
    let gasUSD = "0.00";
    if (route.fees.gas && route.fees.gas !== "0") {
      try {
        const solPrice = await getTokenPrice(
          'So11111111111111111111111111111111111111112', // SOL mint
          SOLANA_CHAIN_ID,
          'SOL'
        );
        if (solPrice) {
          const gasSOL = parseFloat(route.fees.gas);
          const solPriceUSD = parseFloat(solPrice.priceUSD);
          gasUSD = (gasSOL * solPriceUSD).toFixed(2);
        }
      } catch (error) {
        console.warn('[RouteService] Failed to fetch SOL price for gas calculation:', error);
      }
    }

    // Tiwi protocol fee is already included in the swap via referralFee
    // But we show it separately for transparency
    const tiwiProtocolFeeUSD = feeBreakdown
      ? feeBreakdown.tiwiFeeUSD.toFixed(2)
      : (fromAmountUSDNum * TIWI_PROTOCOL_FEE_RATE).toFixed(2);

    // Total fees = Jupiter fee + Tiwi fee + Gas
    const jupiterFeeUSD = feeBreakdown
      ? feeBreakdown.jupiterFeeUSD.toFixed(2)
      : "0.00";
    const gasUSDNum = parseFloat(gasUSD);
    const jupiterFeeNum = parseFloat(jupiterFeeUSD);
    const tiwiFeeNum = parseFloat(tiwiProtocolFeeUSD);
    const totalFeesUSD = (gasUSDNum + jupiterFeeNum + tiwiFeeNum).toFixed(2);

    // Extract fee info from raw response if available
    const rawOrder = route.raw as any;
    const jupiterFeeInfo = rawOrder?.feeBps
      ? {
        jupiterFeeBps: rawOrder.feeBps,
        tiwiFeeBps: 31, // 31 bps = 0.25% net after 20% cut
        feeMint: rawOrder.feeMint,
      }
      : null;

    return {
      ...route,
      fromToken: {
        ...route.fromToken,
        amountUSD: fromAmountUSD,
      },
      toToken: {
        ...route.toToken,
        amountUSD: toAmountUSD,
      },
      fees: {
        ...route.fees,
        gasUSD,
        tiwiProtocolFeeUSD,
        total: totalFeesUSD,
        // Add Jupiter-specific fee info for frontend display
        // TODO
        jupiterFeeInfo: jupiterFeeInfo!,
      },
    };
  }
}

// Singleton instance
let routeServiceInstance: RouteService | null = null;

/**
 * Get singleton RouteService instance
 */
export function getRouteService(): RouteService {
  if (!routeServiceInstance) {
    routeServiceInstance = new RouteService();
  }
  return routeServiceInstance;
}

