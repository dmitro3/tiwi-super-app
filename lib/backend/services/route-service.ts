/**
 * Route Service
 * 
 * Orchestrates route fetching from multiple routers.
 * Handles parameter transformation, router selection, and route scoring.
 */

import { getRouterRegistry } from '@/lib/backend/routers/registry';
import { getTokenService } from '@/lib/backend/services/token-service';
import { getTokenPrice } from '@/lib/backend/providers/price-provider';
import { ChainTransformer, toSmallestUnit, transformTokenAddress, transformSlippage } from '@/lib/backend/routers/transformers';
import { selectBestRoute, sortRoutesByScore } from '@/lib/backend/routers/scoring';
import { 
  DEFAULT_SLIPPAGE, 
  QUOTE_EXPIRATION_SECONDS,
  ROUTER_TIMEOUT_MS,
  MAX_RETRY_ATTEMPTS 
} from '@/lib/backend/routers/constants';
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
   */
  async getRoute(request: RouteRequest): Promise<RouteResponse> {
    // 1. Validate request
    this.validateRequest(request);
    
    // 2. Get token decimals (needed for amount transformation)
    const fromDecimals = await this.getTokenDecimals(
      request.fromToken.chainId,
      request.fromToken.address
    );
    const toDecimals = await this.getTokenDecimals(
      request.toToken.chainId,
      request.toToken.address
    );
    
    // 3. Transform amount to smallest unit
    const fromAmountSmallest = toSmallestUnit(request.fromAmount, fromDecimals);
    
    // 4. Get eligible routers
    const eligibleRouters = await this.routerRegistry.getEligibleRouters(
      request.fromToken.chainId,
      request.toToken.chainId
    );
    
    if (eligibleRouters.length === 0) {
      throw new Error('No routers support this chain combination');
    }
    
    // 5. Try routers in parallel (faster, better quotes)
    const routes: RouterRoute[] = [];
    const errors: RouterError[] = [];
    
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
    
    // Wait for all routers to complete
    const results = await Promise.allSettled(routerPromises);
    
    // Collect successful routes and errors
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { route, error } = result.value;
        if (route) {
          routes.push(route);
        }
        if (error) {
          errors.push(error);
        }
      } else {
        // Promise rejection (shouldn't happen, but handle gracefully)
        console.error('[RouteService] Router promise rejected:', result.reason);
      }
    }
    
    // 6. Select best route
    const bestRoute = selectBestRoute(routes);
    
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
      
      // Build user-friendly error message
      let errorMessage: string;
      if (hasNoRouteError) {
        errorMessage = `No swap route available for this token pair. We tried ${routerNames}, but none of them support this swap.`;
      } else if (hasLiquidityError) {
        errorMessage = `Insufficient liquidity for this swap. We tried ${routerNames}, but there isn't enough liquidity available.`;
      } else {
        errorMessage = `Unable to find a swap route. We tried ${routerNames}, but all attempts failed.`;
      }
      
      throw new Error(errorMessage);
    }
    
    // 7. Enrich routes with USD values and Tiwi fees (for routes that don't have them)
    const enrichedBestRoute = await this.enrichRouteWithUSD(bestRoute, request);
    const enrichedAlternatives = await Promise.all(
      routes
        .filter(r => r.routeId !== bestRoute.routeId)
        .map(route => this.enrichRouteWithUSD(route, request))
    );
    
    // 8. Sort alternatives
    const alternatives = sortRoutesByScore(enrichedAlternatives);
    
    // 9. Calculate expiration timestamp
    const expiresAt = Date.now() + (QUOTE_EXPIRATION_SECONDS * 1000);
    
    // 10. Return response
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
      toChainId,
      toToken,
      recipient: request.recipient,
      slippage,
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
   * Get token decimals
   */
  private async getTokenDecimals(chainId: number, address: string): Promise<number> {
    try {
      // Try to get from token service
      const tokens = await this.tokenService.getTokensByChain(chainId, 100);
      const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
      
      if (token && token.decimals) {
        return token.decimals;
      }
      
      // Default decimals based on chain type
      // Most EVM tokens use 18, USDC/USDT use 6
      // For now, default to 18 (can be enhanced with chain-specific defaults)
      return 18;
    } catch (error) {
      console.warn(`[RouteService] Error fetching token decimals for ${chainId}:${address}, using default 18`);
      return 18;
    }
  }
  
  /**
   * Validate route request
   */
  private validateRequest(request: RouteRequest): void {
    if (!request.fromToken || !request.toToken || !request.fromAmount) {
      throw new Error('Missing required parameters: fromToken, toToken, fromAmount');
    }
    
    if (!request.fromToken.chainId || !request.fromToken.address) {
      throw new Error('Invalid fromToken: chainId and address are required');
    }
    
    if (!request.toToken.chainId || !request.toToken.address) {
      throw new Error('Invalid toToken: chainId and address are required');
    }
    
    if (request.fromAmount === '' || parseFloat(request.fromAmount) <= 0) {
      throw new Error('Invalid fromAmount: must be greater than 0');
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
   */
  private async enrichRouteWithUSD(
    route: RouterRoute,
    request: RouteRequest
  ): Promise<RouterRoute> {
    const TIWI_PROTOCOL_FEE_RATE = 0.0025; // 0.25%
    
    // If route already has USD values (e.g., from LiFi), just add Tiwi fee
    if (route.fromToken.amountUSD && route.toToken.amountUSD) {
      const fromAmountUSDNum = parseFloat(route.fromToken.amountUSD);
      const tiwiProtocolFeeUSD = fromAmountUSDNum > 0 
        ? (fromAmountUSDNum * TIWI_PROTOCOL_FEE_RATE).toFixed(2)
        : '0.00';
      
      // Calculate total fees (gas + protocol + Tiwi)
      const gasUSDNum = parseFloat(route.fees.gasUSD || '0');
      const protocolUSDNum = parseFloat(route.fees.protocol || '0');
      const tiwiFeeNum = parseFloat(tiwiProtocolFeeUSD);
      const totalFeesUSD = (gasUSDNum + protocolUSDNum + tiwiFeeNum).toFixed(2);
      
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
      const [fromTokenPrice, toTokenPrice] = await Promise.all([
        getTokenPrice(request.fromToken.address, request.fromToken.chainId, request.fromToken.symbol),
        getTokenPrice(request.toToken.address, request.toToken.chainId, request.toToken.symbol),
      ]);
      
      // Calculate USD values
      const fromAmountNum = parseFloat(route.fromToken.amount);
      const toAmountNum = parseFloat(route.toToken.amount);
      
      const fromPriceUSD = fromTokenPrice ? parseFloat(fromTokenPrice.priceUSD) : 0;
      const toPriceUSD = toTokenPrice ? parseFloat(toTokenPrice.priceUSD) : 0;
      
      const fromAmountUSD = fromAmountNum > 0 && fromPriceUSD > 0
        ? (fromAmountNum * fromPriceUSD).toFixed(2)
        : undefined;
      const toAmountUSD = toAmountNum > 0 && toPriceUSD > 0
        ? (toAmountNum * toPriceUSD).toFixed(2)
        : undefined;
      
      // Calculate Tiwi protocol fee
      const fromAmountUSDNum = fromAmountUSD ? parseFloat(fromAmountUSD) : 0;
      const tiwiProtocolFeeUSD = fromAmountUSDNum > 0 
        ? (fromAmountUSDNum * TIWI_PROTOCOL_FEE_RATE).toFixed(2)
        : '0.00';
      
      // Calculate total fees (gas + protocol + Tiwi)
      const gasUSDNum = parseFloat(route.fees.gasUSD || '0');
      const protocolUSDNum = parseFloat(route.fees.protocol || '0');
      const tiwiFeeNum = parseFloat(tiwiProtocolFeeUSD);
      const totalFeesUSD = (gasUSDNum + protocolUSDNum + tiwiFeeNum).toFixed(2);
      
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
      return route;
    }
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

